"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  Plus,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Menu,
  Calendar,
  Receipt,
  ArrowRight,
  Edit2,
  Trash2,
  ChevronDown,
} from "lucide-react";

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "CNY", label: "CNY (¥)" },
  { value: "INR", label: "INR (₹)" },
];

export default function IncomePage() {
  const router = useRouter();
  const {
    user,
    homeCurrency,
    transactions,
    incomeSources,
    setUser,
    setIncomeSources,
    setLoading,
    addTransaction,
  } = useStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("all");
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isTotalsDropdownOpen, setIsTotalsDropdownOpen] = useState(false);

  // Transaction details modal
  const [isTransactionDetailsOpen, setIsTransactionDetailsOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Delete transaction modal
  const [isDeleteTransactionModalOpen, setIsDeleteTransactionModalOpen] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [isDeletingTransaction, setIsDeletingTransaction] = useState(false);

  // Inline editing
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);
  const [editTransactionAmount, setEditTransactionAmount] = useState("");
  const [editTransactionCurrency, setEditTransactionCurrency] = useState("");
  const [editTransactionDate, setEditTransactionDate] = useState("");
  const [editTransactionNotes, setEditTransactionNotes] = useState("");

  // Form state
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [source, setSource] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUserAndData();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [currentMonth, selectedSource, selectedCurrency, transactions]);

  // Reset currency filter when month changes
  useEffect(() => {
    setSelectedCurrency("all");
    setIsTotalsDropdownOpen(false);
  }, [currentMonth]);

  const filterTransactions = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    let filtered = transactions.filter((t) => t.type === "income").filter((t) => {
      const transactionDate = new Date(t.date);
      return transactionDate >= monthStart && transactionDate <= monthEnd;
    });

    if (selectedSource !== "all") {
      filtered = filtered.filter((t) => t.source === selectedSource);
    }

    if (selectedCurrency !== "all") {
      filtered = filtered.filter((t) => t.currency === selectedCurrency);
    }

    setFilteredTransactions(filtered);
  };

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
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (transError) {
        console.error("Error loading transactions:", transError);
      } else if (transactionsData) {
        useStore.setState({ transactions: transactionsData });
      }

      // Always load fresh income sources
      const { data: sourcesData, error: sourcesError } = await supabase
        .from("income_sources")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (sourcesError) {
        console.error("Error loading income sources:", sourcesError);
      } else if (sourcesData) {
        setIncomeSources(sourcesData);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!amount || parseFloat(amount) <= 0) {
        setError("Please enter a valid amount");
        return;
      }

      // Create source if it doesn't exist
      let sourceId = source;
      if (!incomeSources.find((s) => s.id === source)) {
        const { data: newSource, error: sourceError } = await supabase
          .from("income_sources")
          .insert({
            name: source,
            user_id: user?.id,
          })
          .select()
          .single();

        if (!sourceError && newSource) {
          sourceId = newSource.id;
          setIncomeSources([...incomeSources, newSource]);
        }
      }

      // Create transaction
      const { data: newTransaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          type: "income",
          amount: parseFloat(amount),
          currency,
          date,
          source: sourceId,
          notes: notes || null,
          user_id: user?.id,
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Add to store
      if (newTransaction) {
        addTransaction(newTransaction);
      }

      // Reset form
      setAmount("");
      setSource("");
      setDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to add income");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotals = () => {
    const totals: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      totals[t.currency] = (totals[t.currency] || 0) + t.amount;
    });
    return totals;
  };

  const totals = calculateTotals();
  const convertedTotal = Object.entries(totals).reduce((sum, [currency, amount]) => {
    return sum + calculateConvertedAmount(amount, currency, homeCurrency);
  }, 0);

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + (direction === "next" ? 1 : -1))
    );
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

  return (
    <div className="min-h-screen flex">
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
            className={`p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${
              isSidebarExpanded ? "mb-6" : "mb-2"
            }`}
            title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarExpanded ? (
              <div className="flex items-center gap-3">
                <ChevronLeft size={20} className="text-gray-700 dark:text-gray-300" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Income</span>
              </div>
            ) : (
              <Menu size={20} className="text-gray-700 dark:text-gray-300" />
            )}
          </button>

          {/* View Section */}
          <div className={isSidebarExpanded ? "mb-6" : "mb-2"}>
            {isSidebarExpanded ? (
              <div className="space-y-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3">VIEW</span>
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                >
                  <Receipt size={18} className="flex-shrink-0" />
                  <span className="text-sm font-medium flex-1 text-left">Transactions</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  className="w-full p-3 rounded-xl transition-colors bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
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

          {/* Total Section */}
          <div className={isSidebarExpanded ? "mb-6" : "mb-2"}>
            {isSidebarExpanded ? (
              <div className="space-y-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3">TOTAL</span>
                <div className="relative">
                  <button
                    onClick={() => setIsTotalsDropdownOpen(!isTotalsDropdownOpen)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                      isTotalsDropdownOpen
                        ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <DollarSign size={18} className="flex-shrink-0" />
                    <span className="text-sm font-medium flex-1 text-left">
                      {formatCurrency(convertedTotal, homeCurrency)}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`flex-shrink-0 transition-transform ${isTotalsDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Dropdown */}
                  {isTotalsDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsTotalsDropdownOpen(false)} />
                      <div className="absolute top-full mt-2 left-0 w-full min-w-[200px] bg-[#f8fafc] dark:bg-[#0f0f0f] rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-xl z-20 overflow-hidden animate-fadeIn">
                        <div className="p-1">
                          {Object.entries(totals).map(([currency, amount]) => (
                            <button
                              key={currency}
                              onClick={() => {
                                setSelectedCurrency(currency);
                                setIsTotalsDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs ${
                                selectedCurrency === currency ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
                              }`}
                            >
                              <span className="font-medium text-gray-900 dark:text-white">{currency}</span>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(amount, currency)}
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 bg-[#f1f5f9] dark:bg-[#0a0a0a]">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Total ({homeCurrency})
                            </span>
                            <span className="text-sm font-bold text-indigo-500 dark:text-indigo-400">
                              {formatCurrency(convertedTotal, homeCurrency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsSidebarExpanded(true)}
                className="w-full p-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Total"
              >
                <DollarSign size={20} />
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Income</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Track your earnings and sources</p>
              </div>
              <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                <Plus size={18} />
                Add Income
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Filter by Source"
              options={[
                { value: "all", label: "All Sources" },
                ...incomeSources.map((s) => ({ value: s.id, label: s.name })),
              ]}
              value={selectedSource}
              onChange={(value) => setSelectedSource(value)}
            />
            <Select
              label="Filter by Currency"
              options={[{ value: "all", label: "All Currencies" }, ...CURRENCIES]}
              value={selectedCurrency}
              onChange={(value) => setSelectedCurrency(value)}
            />
          </div>

          {/* Transactions List */}
          <Card>
            <CardHeader
              title="Transactions"
              action={
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                  title="Add Income"
                >
                  <Plus size={18} />
                  <span className="text-sm font-medium">Add</span>
                </button>
              }
            />
            <CardContent>
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No income recorded for this month</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                  >
                    <Plus size={18} />
                    <span>Add Income</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.map((transaction) => {
                    const sourceName =
                      incomeSources.find((s) => s.id === transaction.source)?.name ||
                      transaction.source ||
                      "Income";
                    const isEditing = editingTransactionId === transaction.id;

                    return (
                      <div
                        key={transaction.id}
                        className={`p-4 rounded-2xl glass transition-all duration-200 ${
                          isEditing ? "" : "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50"
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
                              <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30">
                                <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {sourceName}
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
                                +{formatCurrency(transaction.amount, transaction.currency)}
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
                <div className="p-4 rounded-xl glass border-2 border-green-200 dark:border-green-800">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Amount</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    +{formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                  </p>
                </div>

                {/* Source */}
                <div className="p-4 rounded-xl glass border-2 border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Source</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {incomeSources.find((s) => s.id === selectedTransaction.source)?.name ||
                      selectedTransaction.source ||
                      "Income"}
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
                      {new Date(selectedTransaction.created_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
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
                    <p className="text-base text-gray-900 dark:text-white">{selectedTransaction.notes}</p>
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

          {/* Add Income Modal */}
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Income">
            <form onSubmit={handleSubmit} className="space-y-4">
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
                type="text"
                label="Source"
                placeholder="e.g., Salary, Freelance, Business"
                value={source}
                onChange={(e) => setSource(e.target.value)}
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
                Add Income
              </Button>
            </form>
          </Modal>
        </div>
      </div>
    </div>
  );
}
