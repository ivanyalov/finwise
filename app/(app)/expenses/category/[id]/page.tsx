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
  Plus
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
  const [category, setCategory] = useState<{ id: string; name: string } | null>(null);
  
  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isEditTransactionModalOpen, setIsEditTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Edit category form
  const [editCategoryName, setEditCategoryName] = useState("");
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  
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
    return categoryTransactions.reduce((sum, t) => {
      return sum + calculateConvertedAmount(t.amount, t.currency, homeCurrency);
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
        .update({ name: editCategoryName.trim() })
        .eq("id", categoryId);

      if (error) throw error;

      // Update local state
      setCategory({ ...category!, name: editCategoryName.trim() });
      setExpenseCategories(
        expenseCategories.map((c) =>
          c.id === categoryId ? { ...c, name: editCategoryName.trim() } : c
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

  const handleDeleteCategory = async () => {
    try {
      // First, delete all transactions associated with this category
      const { error: transactionsError } = await supabase
        .from("transactions")
        .delete()
        .eq("category", categoryId);

      if (transactionsError) throw transactionsError;

      // Then delete the category itself
      const { error: categoryError } = await supabase
        .from("expense_categories")
        .delete()
        .eq("id", categoryId);

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

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm("Delete this transaction?")) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId);

      if (error) throw error;

      // Update local state
      useStore.setState({
        transactions: transactions.filter((t) => t.id !== transactionId),
      });
    } catch (err: any) {
      console.error("Error deleting transaction:", err);
      alert("Failed to delete transaction");
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setAmount(transaction.amount.toString());
    setCurrency(transaction.currency);
    setDate(transaction.date.split("T")[0]);
    setNotes(transaction.notes || "");
    setIsEditTransactionModalOpen(true);
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!amount || parseFloat(amount) <= 0) {
        setError("Please enter a valid amount");
        return;
      }

      const { data, error: transactionError } = await supabase
        .from("transactions")
        .update({
          amount: parseFloat(amount),
          currency,
          date,
          notes: notes || null,
        })
        .eq("id", editingTransaction!.id)
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Update local state
      useStore.setState({
        transactions: transactions.map((t) => (t.id === editingTransaction!.id ? data : t)),
      });

      // Reset form
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setEditingTransaction(null);
      setIsEditTransactionModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to update transaction");
    } finally {
      setIsSubmitting(false);
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
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/expenses")}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
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
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsEditModalOpen(true)}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Edit2 size={16} />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button
                onClick={() => setIsDeleteModalOpen(true)}
                variant="danger"
                className="flex items-center gap-2"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Month Total with Navigation */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Compact Month Navigation */}
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => navigateMonth("prev")}
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                  title="Previous month"
                >
                  <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors min-w-[120px] text-center"
                  title="Go to current month"
                >
                  {getMonthYear(currentMonth)}
                </button>
                <button
                  onClick={() => navigateMonth("next")}
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                  title="Next month"
                >
                  <ChevronRight size={18} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              
              {/* Month Total */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  Total
                </span>
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(monthTotal, homeCurrency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Add Expense Button */}
        <div className="mb-6">
          <Button
            onClick={() => setIsAddExpenseModalOpen(true)}
            className="w-full flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Add Expense to {category.name}
          </Button>
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader title="Transactions" />
          <CardContent>
            {categoryTransactions.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No transactions in this category for this month
              </p>
            ) : (
              <div className="space-y-3">
                {categoryTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-2xl glass-hover group"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
                        <TrendingDown className="text-red-600 dark:text-red-400" size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {transaction.notes || "Expense"}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(transaction.date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-red-600 dark:text-red-400">
                        -{formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditTransaction(transaction)}
                          className="p-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <Edit2 size={16} className="text-indigo-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                          <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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

            <Button type="submit" className="w-full" isLoading={isEditingCategory}>
              Save Changes
            </Button>
          </form>
        </Modal>

        {/* Delete Category Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Category"
        >
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Delete <strong>{category.name}</strong>? This will permanently delete{" "}
              {totalTransactionsCount} transaction{totalTransactionsCount !== 1 ? "s" : ""} associated with
              this category.
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              ⚠️ This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setIsDeleteModalOpen(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleDeleteCategory} variant="danger" className="flex-1">
                Delete Category & Transactions
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
              required
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

        {/* Edit Transaction Modal */}
        <Modal
          isOpen={isEditTransactionModalOpen}
          onClose={() => {
            setIsEditTransactionModalOpen(false);
            setEditingTransaction(null);
            setAmount("");
            setDate(new Date().toISOString().split("T")[0]);
            setNotes("");
            setError("");
          }}
          title="Edit Transaction"
        >
          <form onSubmit={handleUpdateTransaction} className="space-y-4">
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
              required
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
              Save Changes
            </Button>
          </form>
        </Modal>
      </div>
    </div>
  );
}

