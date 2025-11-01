"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useStore } from "@/lib/store/useStore";
import { Transaction, ExpenseCategory } from "@/lib/types";
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
import { Plus, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "CNY", label: "CNY (¥)" },
  { value: "INR", label: "INR (₹)" },
];

// Soft pastel colors for categories
const CATEGORY_COLORS = [
  "bg-rose-200 dark:bg-rose-900/40",
  "bg-blue-200 dark:bg-blue-900/40",
  "bg-green-200 dark:bg-green-900/40",
  "bg-yellow-200 dark:bg-yellow-900/40",
  "bg-purple-200 dark:bg-purple-900/40",
  "bg-pink-200 dark:bg-pink-900/40",
  "bg-indigo-200 dark:bg-indigo-900/40",
  "bg-orange-200 dark:bg-orange-900/40",
];

type ViewMode = "transactions" | "categories";

interface CategoryData {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export default function ExpensesPage() {
  const router = useRouter();
  const {
    user,
    homeCurrency,
    transactions,
    expenseCategories,
    setUser,
    setExpenseCategories,
    setLoading,
    addTransaction,
  } = useStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("all");
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("transactions");

  // Budget state
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState(0);
  const [budgetCurrency, setBudgetCurrency] = useState("USD");

  // Form state
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUserAndData();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [currentMonth, selectedCategory, selectedCurrency, transactions]);

  const filterTransactions = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999); // End of day

    let filtered = transactions.filter((t) => t.type === "expense").filter((t) => {
      const transactionDate = new Date(t.date);
      return transactionDate >= monthStart && transactionDate <= monthEnd;
    });

    if (selectedCategory !== "all") {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    if (selectedCurrency !== "all") {
      filtered = filtered.filter((t) => t.currency === selectedCurrency);
    }

    console.log("Filtering expenses:", {
      totalTransactions: transactions.length,
      expenseTransactions: transactions.filter((t) => t.type === "expense").length,
      filteredCount: filtered.length,
      monthStart: monthStart.toISOString(),
      monthEnd: monthEnd.toISOString(),
      currentMonth: currentMonth.toISOString(),
    });

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

      // Load all transactions if store is empty
      if (transactions.length === 0) {
        const { data: transactionsData } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false });

        if (transactionsData) {
          useStore.setState({ transactions: transactionsData });
        }
      }

      // Only load expense categories if not already loaded
      if (expenseCategories.length === 0) {
        const { data: categoriesData } = await supabase
          .from("expense_categories")
          .select("*")
          .eq("user_id", user.id)
          .order("name");

        if (categoriesData) {
          setExpenseCategories(categoriesData);
        }
      }

      // Load settings including budget
      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (settingsData) {
        useStore.setState({ homeCurrency: settingsData.home_currency || "USD" });
        setBudgetEnabled(settingsData.budget_enabled || false);
        setBudgetAmount(settingsData.monthly_budget_amount || 0);
        setBudgetCurrency(settingsData.budget_currency || settingsData.home_currency || "USD");
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

      // Create category if it doesn't exist
      let categoryId = category;
      if (!expenseCategories.find((c) => c.id === category)) {
        const { data: newCategory, error: categoryError } = await supabase
          .from("expense_categories")
          .insert({
            name: category,
            user_id: user?.id,
          })
          .select()
          .single();

        if (!categoryError && newCategory) {
          categoryId = newCategory.id;
          setExpenseCategories([...expenseCategories, newCategory]);
        }
      }

      // Create transaction
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

      // Add to store
      if (newTransaction) {
        console.log("Adding new transaction to store:", newTransaction);
        addTransaction(newTransaction);
        console.log("Transactions after add:", transactions.length);
      }

      // Reset form
      setAmount("");
      setCategory("");
      setDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to add expense");
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

  // Calculate category data for category view
  const getCategoryData = (): CategoryData[] => {
    const categoryTotals: Record<string, number> = {};
    
    filteredTransactions.forEach((t) => {
      const categoryId = t.category || "uncategorized";
      const convertedAmount = calculateConvertedAmount(t.amount, t.currency, homeCurrency);
      categoryTotals[categoryId] = (categoryTotals[categoryId] || 0) + convertedAmount;
    });

    const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

    return expenseCategories
      .map((cat, index) => ({
        id: cat.id,
        name: cat.name,
        amount: categoryTotals[cat.id] || 0,
        percentage: total > 0 ? (categoryTotals[cat.id] || 0) / total * 100 : 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const categoryData = getCategoryData();

  // Calculate budget progress
  const budgetSpent = budgetCurrency === homeCurrency 
    ? convertedTotal 
    : Object.entries(totals).reduce((sum, [currency, amount]) => {
        return sum + calculateConvertedAmount(amount, currency, budgetCurrency);
      }, 0);

  const budgetPercentage = budgetAmount > 0 ? (budgetSpent / budgetAmount) * 100 : 0;
  const budgetRemaining = budgetAmount - budgetSpent;

  const getBudgetColor = () => {
    if (budgetPercentage >= 100) return "text-red-600 dark:text-red-400";
    if (budgetPercentage >= 80) return "text-amber-600 dark:text-amber-400";
    return "text-green-600 dark:text-green-400";
  };

  const getBudgetBarColor = () => {
    if (budgetPercentage >= 100) return "bg-red-500";
    if (budgetPercentage >= 80) return "bg-amber-500";
    return "bg-green-500";
  };

  const handleCategoryClick = (categoryId: string) => {
    setViewMode("transactions");
    setSelectedCategory(categoryId);
  };

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Expenses</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track your spending and categories
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <Plus size={18} />
            Add Expense
          </Button>
        </div>

        {/* Budget Card */}
        {budgetEnabled && budgetAmount > 0 && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Budget:
                    </span>
                    <span className={`text-xl font-bold ${getBudgetColor()}`}>
                      {formatCurrency(budgetSpent, budgetCurrency)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">/</span>
                    <span className="text-xl font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(budgetAmount, budgetCurrency)}
                    </span>
                    <span className={`text-sm font-medium ${getBudgetColor()}`}>
                      ({budgetPercentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-semibold ${getBudgetColor()}`}>
                      {budgetRemaining >= 0 ? formatCurrency(budgetRemaining, budgetCurrency) : formatCurrency(Math.abs(budgetRemaining), budgetCurrency)} {budgetRemaining >= 0 ? "left" : "over"}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getBudgetBarColor()} transition-all duration-700 ease-out rounded-full`}
                    style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Month Navigation */}
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateMonth("prev")}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft size={24} className="text-gray-700 dark:text-gray-400" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {getMonthYear(currentMonth)}
            </h2>
            <button
              onClick={() => navigateMonth("next")}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronRight size={24} className="text-gray-700 dark:text-gray-400" />
            </button>
          </div>
        </Card>

        {/* View Mode Toggle */}
        <div className="mb-6">
          <div className="inline-flex rounded-2xl p-1 bg-gray-100 dark:bg-gray-800">
            <button
              onClick={() => setViewMode("transactions")}
              className={`px-6 py-2 rounded-xl font-medium transition-all duration-200 ${
                viewMode === "transactions"
                  ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setViewMode("categories")}
              className={`px-6 py-2 rounded-xl font-medium transition-all duration-200 ${
                viewMode === "categories"
                  ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Categories
            </button>
          </div>
        </div>

        {/* Filters - Show only in transactions view */}
        {viewMode === "transactions" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Select
              label="Filter by Category"
              options={[
                { value: "all", label: "All Categories" },
                ...expenseCategories.map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            />
            <Select
              label="Filter by Currency"
              options={[
                { value: "all", label: "All Currencies" },
                ...CURRENCIES,
              ]}
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
            />
          </div>
        )}

        {/* Totals */}
        <Card className="mb-6">
          <CardHeader title="Totals" />
          <CardContent>
            <div className="space-y-4">
              {Object.entries(totals).map(([currency, amount]) => (
                <div
                  key={currency}
                  className="flex items-center justify-between p-4 rounded-2xl glass-hover"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
                      <TrendingDown className="text-red-600 dark:text-red-400" size={20} />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{currency}</span>
                  </div>
                  <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(amount, currency)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800">
                <span className="font-semibold text-gray-900 dark:text-white">
                  Total ({homeCurrency})
                </span>
                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(convertedTotal, homeCurrency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories View */}
        {viewMode === "categories" && (
          <Card>
            <CardHeader title="Spending by Category" />
            <CardContent>
              {categoryData.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No categories with expenses this month
                </p>
              ) : (
                <div className="space-y-3">
                  {categoryData.map((cat, index) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      className="w-full text-left p-4 rounded-2xl glass-hover transition-all duration-200 hover:scale-[1.02] group"
                      style={{
                        animation: `fadeInUp 0.${index + 3}s ease-out`
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {cat.name}
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(cat.amount, homeCurrency)}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            ({cat.percentage.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                      <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${cat.color} transition-all duration-700 ease-out rounded-full`}
                          style={{ 
                            width: `${cat.percentage}%`,
                            animationDelay: `${index * 0.1}s`
                          }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Transactions List View */}
        {viewMode === "transactions" && (
          <Card>
            <CardHeader title="Transactions" />
            <CardContent>
              {filteredTransactions.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No expenses recorded for this month
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.map((transaction) => {
                    const categoryName = expenseCategories.find((c) => c.id === transaction.category)?.name || transaction.category || "Expense";
                    
                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 rounded-2xl glass-hover"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
                            <TrendingDown className="text-red-600 dark:text-red-400" size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {categoryName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(transaction.date)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-600 dark:text-red-400">
                            -{formatCurrency(transaction.amount, transaction.currency)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add Expense Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Expense">
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
              onChange={(e) => setCurrency(e.target.value)}
              required
            />

            <Input
              type="text"
              label="Category"
              placeholder="e.g., Food, Transport, Bills"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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
      </div>
    </div>
  );
}

