"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useStore } from "@/lib/store/useStore";
import { Transaction } from "@/lib/types";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import {
  formatCurrency,
  formatDate,
  getMonthYear,
  calculateConvertedAmount,
} from "@/lib/utils";
import { 
  ArrowLeft, 
  TrendingDown, 
  ChevronLeft, 
  ChevronRight,
  Edit2,
  Trash2,
  Plus,
  Menu,
  X as CloseIcon,
  Calendar,
  Layers,
  Receipt,
  ArrowRight
} from "lucide-react";

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "CNY", label: "CNY (¥)" },
  { value: "INR", label: "INR (₹)" },
];

export default function CategoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id as string;

  const {
    user,
    homeCurrency,
    transactions,
    expenseCategories,
    setUser,
    setExpenseCategories,
    addTransaction,
    setLoading,
  } = useStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [categoryTransactions, setCategoryTransactions] = useState<Transaction[]>([]);
  const [category, setCategory] = useState<{ id: string; name: string; currency?: string } | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  
  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isTransactionDetailsOpen, setIsTransactionDetailsOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDeleteTransactionModalOpen, setIsDeleteTransactionModalOpen] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  
  // Inline editing
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);
  const [editTransactionAmount, setEditTransactionAmount] = useState("");
  const [editTransactionCurrency, setEditTransactionCurrency] = useState("");
  const [editTransactionDate, setEditTransactionDate] = useState("");
  const [editTransactionNotes, setEditTransactionNotes] = useState("");
  const [isDeletingTransaction, setIsDeletingTransaction] = useState(false);
  
  // Edit category form
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryCurrency, setEditCategoryCurrency] = useState("");
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  
  // Add expense form
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUserAndData();
  }, []);

  useEffect(() => {
    if (category) {
      filterTransactions();
    }
  }, [currentMonth, transactions, category]);

  const loadUserAndData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      // Always load fresh transactions
      const { data: transactionsData, error: transError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (transError) {
        console.error("Error loading transactions:", transError);
      } else if (transactionsData) {
        useStore.setState({ transactions: transactionsData });
      }

      // Always load fresh categories
      const { data: categoriesData, error: catError } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("user_id", user.id);

      if (catError) {
        console.error("Error loading categories:", catError);
      } else if (categoriesData) {
        setExpenseCategories(categoriesData);
        
        // Find the category in the loaded data
        const foundCategory = categoriesData.find((c) => c.id === categoryId);
        if (foundCategory) {
          setCategory(foundCategory);
          setEditCategoryName(foundCategory.name);
          setEditCategoryCurrency(foundCategory.currency || homeCurrency);
          setCurrency(foundCategory.currency || homeCurrency);
        } else {
          router.push("/expenses");
        }
      }

      // Load settings
      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (settingsData) {
        useStore.setState({ homeCurrency: settingsData.home_currency || "USD" });
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const filtered = transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return (
        t.type === "expense" &&
        t.category === categoryId &&
        transactionDate >= monthStart &&
        transactionDate <= monthEnd
      );
    });

    setCategoryTransactions(filtered);
  };

  const calculateMonthTotal = () => {
    const catCurrency = category?.currency || homeCurrency;
    return categoryTransactions.reduce((sum, t) => {
      return sum + calculateConvertedAmount(t.amount, t.currency, catCurrency);
    }, 0);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + (direction === "next" ? 1 : -1))
    );
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingCategory(true);

    try {
      if (!editCategoryName.trim()) {
        return;
      }

      const { error } = await supabase
        .from("expense_categories")
        .update({ 
          name: editCategoryName.trim(),
          currency: editCategoryCurrency 
        })
        .eq("id", categoryId)
        .eq("user_id", user?.id);

      if (error) throw error;

      // Update local state
      setCategory({ 
        ...category!, 
        name: editCategoryName.trim(),
        currency: editCategoryCurrency 
      });
      setExpenseCategories(
        expenseCategories.map((c) =>
          c.id === categoryId ? { ...c, name: editCategoryName.trim(), currency: editCategoryCurrency } : c
        )
      );

      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error("Error updating category:", err);
      alert("Failed to update category");
    } finally {
      setIsEditingCategory(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteConfirmationText("");
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteConfirmationText("");
    setIsDeleteModalOpen(false);
  };

  const handleDeleteCategory = async () => {
    const confirmText = deleteConfirmationText.trim().toLowerCase();
    const categoryName = category?.name.toLowerCase() || "";

    if (confirmText !== categoryName && confirmText !== "delete") {
      alert(`Please type "${category?.name}" or "delete" to confirm`);
      return;
    }

    setIsDeletingCategory(true);

    try {
      // First, delete all transactions associated with this category
      const { error: transactionsError } = await supabase
        .from("transactions")
        .delete()
        .eq("category", categoryId)
        .eq("user_id", user?.id);

      if (transactionsError) throw transactionsError;

      // Then delete the category itself
      const { error: categoryError } = await supabase
        .from("expense_categories")
        .delete()
        .eq("id", categoryId)
        .eq("user_id", user?.id);

      if (categoryError) throw categoryError;

      // Update local state - remove deleted transactions
      useStore.setState({
        transactions: transactions.filter((t) => t.category !== categoryId),
      });

      // Update categories list
      setExpenseCategories(expenseCategories.filter((c) => c.id !== categoryId));
      
      router.push("/expenses");
    } catch (err: any) {
      console.error("Error deleting category:", err);
      alert("Failed to delete category");
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!amount || parseFloat(amount) <= 0) {
        setError("Please enter a valid amount");
        return;
      }

      const { data: newTransaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          type: "expense",
          amount: parseFloat(amount),
          currency,
          date,
          category: categoryId,
          notes: notes || null,
          user_id: user?.id,
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      if (newTransaction) {
        addTransaction(newTransaction);
      }

      // Reset form
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setIsAddExpenseModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditingTransaction = (transaction: Transaction) => {
    setEditingTransactionId(transaction.id);
    setEditTransactionAmount(transaction.amount.toString());
    setEditTransactionCurrency(transaction.currency);
    setEditTransactionDate(transaction.date.split("T")[0]);
    setEditTransactionNotes(transaction.notes || "");
  };

  const cancelEditingTransaction = () => {
    setEditingTransactionId(null);
    setEditTransactionAmount("");
    setEditTransactionCurrency("");
    setEditTransactionDate("");
    setEditTransactionNotes("");
  };

  const handleEditTransaction = async (transactionId: string) => {
    setIsEditingTransaction(true);

    try {
      if (!editTransactionAmount || parseFloat(editTransactionAmount) <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      const { data, error } = await supabase
        .from("transactions")
        .update({
          amount: parseFloat(editTransactionAmount),
          currency: editTransactionCurrency,
          date: editTransactionDate,
          notes: editTransactionNotes || null,
        })
        .eq("id", transactionId)
        .eq("user_id", user?.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        useStore.setState({
          transactions: transactions.map((t) => (t.id === transactionId ? data : t)),
        });
      }

      cancelEditingTransaction();
    } catch (err: any) {
      console.error("Error updating transaction:", err);
      alert("Failed to update transaction");
    } finally {
      setIsEditingTransaction(false);
    }
  };

  const openDeleteTransactionModal = (transaction: Transaction) => {
    setDeletingTransaction(transaction);
    setIsDeleteTransactionModalOpen(true);
  };

  const closeDeleteTransactionModal = () => {
    setDeletingTransaction(null);
    setIsDeleteTransactionModalOpen(false);
  };

  const handleDeleteTransaction = async () => {
    if (!deletingTransaction) return;

    setIsDeletingTransaction(true);

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", deletingTransaction.id)
        .eq("user_id", user?.id);

      if (error) throw error;

      useStore.setState({
        transactions: transactions.filter((t) => t.id !== deletingTransaction.id),
      });
      closeDeleteTransactionModal();
    } catch (err: any) {
      console.error("Error deleting transaction:", err);
      alert("Failed to delete transaction");
    } finally {
      setIsDeletingTransaction(false);
    }
  };

  if (!category) {
    return (
      <div className="min-h-screen p-4 pb-24 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  const monthTotal = calculateMonthTotal();
  const totalTransactionsCount = transactions.filter(
    (t) => t.type === "expense" && t.category === categoryId
  ).length;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full glass border-r-2 border-gray-200 dark:border-gray-700 sidebar-transition z-30 ${
          isSidebarExpanded ? "w-64" : "w-16"
        }`}
      >
        <div className="h-full flex flex-col p-3">
          {/* Toggle Button */}
          <button
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className={`p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${isSidebarExpanded ? "mb-6" : "mb-2"}`}
            title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarExpanded ? (
              <div className="flex items-center gap-3">
                <ChevronLeft size={20} className="text-gray-700 dark:text-gray-300" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Expenses</span>
              </div>
            ) : (
              <Menu size={20} className="text-gray-700 dark:text-gray-300" />
            )}
          </button>

          {/* View Toggle */}
          <div className={isSidebarExpanded ? "mb-6" : "mb-2"}>
            {isSidebarExpanded ? (
              <div className="space-y-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3">VIEW</span>
                <button
                  onClick={() => router.push("/expenses")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Layers size={18} className="flex-shrink-0" />
                  <span className="text-sm font-medium flex-1 text-left">Categories</span>
                </button>
                <button
                  onClick={() => router.push("/expenses")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Receipt size={18} className="flex-shrink-0" />
                  <span className="text-sm font-medium flex-1 text-left">Transactions</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => router.push("/expenses")}
                  className="w-full p-3 rounded-xl transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Categories"
                >
                  <Layers size={20} />
                </button>
                <button
                  onClick={() => router.push("/expenses")}
                  className="w-full p-3 rounded-xl transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Transactions"
                >
                  <Receipt size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Month Navigation */}
          <div className={isSidebarExpanded ? "mb-6" : "mb-2"}>
            {isSidebarExpanded ? (
              <div className="space-y-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3">MONTH</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateMonth("prev")}
                    className="flex items-center justify-center p-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Previous month"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="flex-1 flex items-center justify-center px-3 py-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Go to current month"
                  >
                    <span className="text-sm font-medium whitespace-nowrap">{getMonthYear(currentMonth)}</span>
                  </button>
                  <button
                    onClick={() => navigateMonth("next")}
                    className="flex items-center justify-center p-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Next month"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsSidebarExpanded(true)}
                className="w-full p-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Month"
              >
                <Calendar size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-16 p-4 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push("/expenses")}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Expenses</span>
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{category.name}</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {totalTransactionsCount} total transaction{totalTransactionsCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  title="Edit category"
                >
                  <Edit2 size={20} strokeWidth={2} />
                </button>
                <button
                  onClick={openDeleteModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  title="Delete category"
                >
                  <Trash2 size={20} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          {/* Month Total */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    Total
                  </span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(monthTotal, category.currency || homeCurrency)}
                  </span>
                </div>
                {categoryTransactions.length > 0 && (() => {
                  const today = new Date();
                  const isCurrentMonth = 
                    today.getFullYear() === currentMonth.getFullYear() && 
                    today.getMonth() === currentMonth.getMonth();
                  const daysElapsed = isCurrentMonth ? today.getDate() : new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
                  const dailyAverage = monthTotal / daysElapsed;
                  
                  return (
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Daily average ({categoryTransactions.length} {categoryTransactions.length === 1 ? 'transaction' : 'transactions'})
                      </span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(dailyAverage, category.currency || homeCurrency)}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Transactions List */}
          <Card>
            <CardHeader 
              title="Transactions"
              action={
                <button
                  onClick={() => setIsAddExpenseModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                  title="Add Transaction"
                >
                  <Plus size={18} />
                  <span className="text-sm font-medium">Add</span>
                </button>
              }
            />
            <CardContent>
              {categoryTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No transactions for this month
                  </p>
                  <button
                    onClick={() => setIsAddExpenseModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                  >
                    <Plus size={18} />
                    <span>Add Transaction</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryTransactions.map((transaction) => {
                    const isEditing = editingTransactionId === transaction.id;
                    
                    return (
                      <div
                        key={transaction.id}
                        className={`p-4 rounded-2xl glass transition-all duration-200 ${
                          isEditing ? '' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50'
                        }`}
                        onClick={() => {
                          if (!isEditing) {
                            setSelectedTransaction(transaction);
                            setIsTransactionDetailsOpen(true);
                          }
                        }}
                      >
                        {isEditing ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleEditTransaction(transaction.id);
                            }}
                            className="space-y-3"
                          >
                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                type="number"
                                label="Amount"
                                value={editTransactionAmount}
                                onChange={(e) => setEditTransactionAmount(e.target.value)}
                                step="0.01"
                                min="0"
                                required
                              />
                              <Select
                                label="Currency"
                                options={CURRENCIES}
                                value={editTransactionCurrency}
                                onChange={(value) => setEditTransactionCurrency(value)}
                              />
                            </div>
                            <Input
                              type="date"
                              label="Date"
                              value={editTransactionDate}
                              onChange={(e) => setEditTransactionDate(e.target.value)}
                              required
                            />
                            <Input
                              type="text"
                              label="Notes (optional)"
                              value={editTransactionNotes}
                              onChange={(e) => setEditTransactionNotes(e.target.value)}
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                type="submit"
                                size="sm"
                                isLoading={isEditingTransaction}
                                className="flex-1"
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={cancelEditingTransaction}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
                                <TrendingDown className="text-red-600 dark:text-red-400" size={20} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {transaction.notes || "Expense"}
                                  </p>
                                  <ArrowRight 
                                    size={16} 
                                    className="text-gray-400 dark:text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" 
                                  />
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {formatDate(transaction.date)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <p className="font-semibold text-gray-900 dark:text-white">
                                -{formatCurrency(transaction.amount, transaction.currency)}
                              </p>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditingTransaction(transaction);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                  title="Edit transaction"
                                >
                                  <Edit2 size={16} strokeWidth={2} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteTransactionModal(transaction);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                  title="Delete transaction"
                                >
                                  <Trash2 size={16} strokeWidth={2} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transaction Details Modal */}
          <Modal
            isOpen={isTransactionDetailsOpen}
            onClose={() => {
              setIsTransactionDetailsOpen(false);
              setSelectedTransaction(null);
            }}
            title="Transaction Details"
            headerActions={
              selectedTransaction && (
                <>
                  <button
                    onClick={() => {
                      setIsTransactionDetailsOpen(false);
                      startEditingTransaction(selectedTransaction);
                    }}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    title="Edit transaction"
                  >
                    <Edit2 size={18} className="text-gray-700 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={() => {
                      setIsTransactionDetailsOpen(false);
                      openDeleteTransactionModal(selectedTransaction);
                    }}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    title="Delete transaction"
                  >
                    <Trash2 size={18} className="text-gray-700 dark:text-gray-400" />
                  </button>
                </>
              )
            }
          >
            {selectedTransaction && (
              <div className="space-y-4">
                {/* Amount */}
                <div className="p-4 rounded-xl glass border-2 border-indigo-200 dark:border-indigo-800">
                  <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">Amount</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    -{formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                  </p>
                </div>

                {/* Category */}
                <div className="p-4 rounded-xl glass border-2 border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {category.name}
                  </p>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl glass border-2 border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      {formatDate(selectedTransaction.date)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl glass border-2 border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Time</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      {new Date(selectedTransaction.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                </div>

                {/* Currency */}
                <div className="p-4 rounded-xl glass border-2 border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Currency</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedTransaction.currency}
                  </p>
                </div>

                {/* Notes */}
                {selectedTransaction.notes && (
                  <div className="p-4 rounded-xl glass border-2 border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</p>
                    <p className="text-base text-gray-900 dark:text-white">
                      {selectedTransaction.notes}
                    </p>
                  </div>
                )}

                {/* Transaction ID */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Transaction ID</p>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">
                    {selectedTransaction.id}
                  </p>
                </div>

                {/* Close Button */}
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setIsTransactionDetailsOpen(false);
                      setSelectedTransaction(null);
                    }}
                    className="w-full"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </Modal>

          {/* Delete Transaction Confirmation Modal */}
          <Modal
            isOpen={isDeleteTransactionModalOpen}
            onClose={closeDeleteTransactionModal}
            title="Delete Transaction"
          >
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  ⚠️ Warning: This action cannot be undone
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Are you sure you want to delete this transaction?
                </p>
                {deletingTransaction && (
                  <div className="mt-3 p-3 rounded-lg bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(deletingTransaction.amount, deletingTransaction.currency)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {formatDate(deletingTransaction.date)}
                    </p>
                    {deletingTransaction.notes && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {deletingTransaction.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeDeleteTransactionModal}
                  className="flex-1"
                  disabled={isDeletingTransaction}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteTransaction}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  isLoading={isDeletingTransaction}
                >
                  Delete Transaction
                </Button>
              </div>
            </div>
          </Modal>

          {/* Edit Category Modal */}
          <Modal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            title="Edit Category"
          >
            <form onSubmit={handleEditCategory} className="space-y-4">
              <Input
                type="text"
                label="Category Name"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                required
              />

              <Select
                label="Currency"
                options={CURRENCIES}
                value={editCategoryCurrency}
                onChange={(value) => setEditCategoryCurrency(value)}
              />

              <Button type="submit" className="w-full" isLoading={isEditingCategory}>
                Save Changes
              </Button>
            </form>
          </Modal>

          {/* Delete Category Modal */}
          <Modal
            isOpen={isDeleteModalOpen}
            onClose={closeDeleteModal}
            title="Delete Category"
          >
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  ⚠️ Warning: This will permanently delete:
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside space-y-1">
                  <li>The category <strong>{category.name}</strong></li>
                  <li><strong>{totalTransactionsCount}</strong> transaction{totalTransactionsCount !== 1 ? 's' : ''} in this category</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type <strong>{category.name}</strong> or <strong>delete</strong> to confirm:
                </label>
                <Input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="Type here to confirm"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeDeleteModal}
                  className="flex-1"
                  disabled={isDeletingCategory}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteCategory}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  isLoading={isDeletingCategory}
                >
                  Delete Category
                </Button>
              </div>
            </div>
          </Modal>

          {/* Add Expense Modal */}
          <Modal
            isOpen={isAddExpenseModalOpen}
            onClose={() => {
              setIsAddExpenseModalOpen(false);
              setAmount("");
              setDate(new Date().toISOString().split("T")[0]);
              setNotes("");
              setError("");
            }}
            title={`Add Expense to ${category.name}`}
          >
            <form onSubmit={handleAddExpense} className="space-y-4">
              <Input
                type="number"
                label="Amount"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                step="0.01"
                min="0"
              />

              <Select
                label="Currency"
                options={CURRENCIES}
                value={currency}
                onChange={(value) => setCurrency(value)}
              />

              <Input
                type="date"
                label="Date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />

              <Input
                type="text"
                label="Notes (optional)"
                placeholder="Additional details"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Add Expense
              </Button>
            </form>
          </Modal>
        </div>
      </div>
    </div>
  );
}
