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
import { Plus, TrendingDown, ChevronLeft, ChevronRight, ChevronRight as ArrowRight, ChevronDown, X, FolderPlus, Menu, Layers, Receipt, Calendar, DollarSign } from "lucide-react";

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
  const [viewMode, setViewMode] = useState<ViewMode>("categories");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);
  const [isBudgetAnalyticsOpen, setIsBudgetAnalyticsOpen] = useState(false);
  const [isTotalsDropdownOpen, setIsTotalsDropdownOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

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
  }, [currentMonth, selectedCategory, selectedCurrency, transactions, expenseCategories]);

  // Reset currency filter when month changes
  useEffect(() => {
    setSelectedCurrency("all");
    setIsTotalsDropdownOpen(false);
  }, [currentMonth]);

  const filterTransactions = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999); // End of day

    // Get valid category IDs
    const validCategoryIds = new Set(expenseCategories.map(c => c.id));

    let filtered = transactions.filter((t) => t.type === "expense").filter((t) => {
      const transactionDate = new Date(t.date);
      const isInDateRange = transactionDate >= monthStart && transactionDate <= monthEnd;
      // Only include transactions whose category still exists
      const hasValidCategory = !t.category || validCategoryIds.has(t.category);
      return isInDateRange && hasValidCategory;
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

      // Always load fresh data from database
      const { data: transactionsData, error: transError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (transError) {
        console.error("Error loading transactions:", transError);
      } else if (transactionsData) {
        console.log(`Loaded ${transactionsData.length} transactions`);
        useStore.setState({ transactions: transactionsData });
      }

      // Always load fresh expense categories
      const { data: categoriesData, error: catError } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (catError) {
        console.error("Error loading categories:", catError);
      } else if (categoriesData) {
        console.log(`Loaded ${categoriesData.length} expense categories`);
        setExpenseCategories(categoriesData);
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

      // Clean up orphaned transactions (transactions whose category no longer exists)
      await cleanupOrphanedTransactions(user.id);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const cleanupOrphanedTransactions = async (userId: string) => {
    try {
      // Get all expense categories for this user
      const { data: categories } = await supabase
        .from("expense_categories")
        .select("id")
        .eq("user_id", userId);

      if (!categories) return;

      const validCategoryIds = categories.map(c => c.id);

      // Get all expense transactions
      const { data: expenseTransactions } = await supabase
        .from("transactions")
        .select("id, category")
        .eq("user_id", userId)
        .eq("type", "expense")
        .not("category", "is", null);

      if (!expenseTransactions) return;

      // Find orphaned transactions (transactions with categories that don't exist)
      const orphanedIds = expenseTransactions
        .filter(t => !validCategoryIds.includes(t.category))
        .map(t => t.id);

      if (orphanedIds.length > 0) {
        console.log(`Cleaning up ${orphanedIds.length} orphaned transactions`);
        
        // Delete orphaned transactions from database
        const { error } = await supabase
          .from("transactions")
          .delete()
          .in("id", orphanedIds);

        if (error) {
          console.error("Error cleaning up orphaned transactions:", error);
        } else {
          // Update local state to remove orphaned transactions
          useStore.setState({
            transactions: transactions.filter(t => !orphanedIds.includes(t.id))
          });
        }
      }
    } catch (error) {
      console.error("Error in cleanup:", error);
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

      // Find existing category by name or create new one
      const existingCategory = expenseCategories.find(
        (c) => c.name.toLowerCase() === category.toLowerCase()
      );
      
      let categoryId: string;
      
      if (existingCategory) {
        // Use existing category
        categoryId = existingCategory.id;
      } else {
        // Create new category
        const { data: newCategory, error: categoryError } = await supabase
          .from("expense_categories")
          .insert({
            name: category.trim(),
            user_id: user?.id,
          })
          .select()
          .single();

        if (categoryError || !newCategory) {
          throw new Error("Failed to create category");
        }
        
        categoryId = newCategory.id;
        setExpenseCategories([...expenseCategories, newCategory]);
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
    const today = new Date();
    const totalDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    
    // Check if we're viewing the current month
    const isCurrentMonth = 
      today.getFullYear() === currentMonth.getFullYear() && 
      today.getMonth() === currentMonth.getMonth();
    
    // For past/future months, just show color based on total percentage
    if (!isCurrentMonth) {
      if (budgetPercentage >= 100) return "bg-red-500";
      if (budgetPercentage >= 80) return "bg-amber-500";
      return "bg-green-500";
    }
    
    // For current month, calculate expected spending based on day
    const currentDay = today.getDate();
    const expectedPercentage = (currentDay / totalDays) * 100;
    
    // Compare actual spending to expected spending
    const difference = budgetPercentage - expectedPercentage;
    
    // Red: spending significantly more than expected (20%+ ahead of pace)
    if (difference > 20 || budgetPercentage >= 100) return "bg-red-500";
    
    // Yellow: spending moderately more than expected (5-20% ahead of pace)
    if (difference > 5) return "bg-amber-500";
    
    // Green: on track or under budget
    return "bg-green-500";
  };

  // Calculate day progress for budget tracking
  const getDayProgress = () => {
    const today = new Date();
    const totalDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    
    // Check if we're viewing the current month
    const isCurrentMonth = 
      today.getFullYear() === currentMonth.getFullYear() && 
      today.getMonth() === currentMonth.getMonth();
    
    // Only show day progress for current month
    if (!isCurrentMonth) {
      return null;
    }
    
    const currentDay = today.getDate();
    const dayPercentage = (currentDay / totalDays) * 100;
    
    return {
      currentDay,
      totalDays,
      dayPercentage,
      isOnTrack: budgetPercentage <= dayPercentage,
      difference: budgetPercentage - dayPercentage,
    };
  };

  const dayProgress = budgetEnabled && budgetAmount > 0 ? getDayProgress() : null;

  const getProgressStatus = () => {
    if (!dayProgress) return "";
    
    if (budgetPercentage >= 100) {
      return "Budget exceeded";
    }
    
    const diff = Math.abs(dayProgress.difference);
    if (dayProgress.isOnTrack) {
      if (diff < 5) {
        return "On track";
      }
      return "Under budget";
    } else {
      return "Over pace";
    }
  };

  const getProgressStatusColor = () => {
    if (!dayProgress) return "";
    
    if (budgetPercentage >= 100) {
      return "text-red-600 dark:text-red-400";
    }
    
    const diff = Math.abs(dayProgress.difference);
    if (dayProgress.isOnTrack) {
      return "text-green-600 dark:text-green-400";
    } else {
      if (diff > 20) {
        return "text-red-600 dark:text-red-400";
      }
      return "text-amber-600 dark:text-amber-400";
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    // Navigate to category detail page
    router.push(`/expenses/category/${categoryId}`);
  };

  // Calculate spending analytics and recommendations
  const getBudgetAnalytics = () => {
    const today = new Date();
    const isCurrentMonth = 
      today.getFullYear() === currentMonth.getFullYear() && 
      today.getMonth() === currentMonth.getMonth();
    
    const totalDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const currentDay = isCurrentMonth ? today.getDate() : totalDays;
    const daysRemaining = isCurrentMonth ? totalDays - currentDay : 0;
    
    // Get expenses from the selected month
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = isCurrentMonth 
      ? today 
      : new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const monthExpenses = transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return t.type === "expense" && transactionDate >= monthStart && transactionDate <= monthEnd;
    });

    // Calculate daily spending for the past days
    const spendingByDay: Record<number, number> = {};
    monthExpenses.forEach((t) => {
      const day = new Date(t.date).getDate();
      const convertedAmount = calculateConvertedAmount(t.amount, t.currency, budgetCurrency);
      spendingByDay[day] = (spendingByDay[day] || 0) + convertedAmount;
    });

    // Calculate average daily spending (only for days that have passed)
    const pastDays = Math.min(currentDay, 7); // Look at last 7 days or fewer
    let recentTotal = 0;
    let recentDaysCount = 0;
    for (let i = Math.max(1, currentDay - pastDays + 1); i <= currentDay; i++) {
      if (spendingByDay[i]) {
        recentTotal += spendingByDay[i];
        recentDaysCount++;
      }
    }
    const avgDailySpending = recentDaysCount > 0 ? recentTotal / recentDaysCount : budgetSpent / currentDay;

    // Calculate what daily spending should be
    const idealDailySpending = budgetAmount / totalDays;
    const spendingDifference = avgDailySpending - idealDailySpending;

    // Calculate recommendations for different scenarios
    const recommendations = [];
    
    if (daysRemaining > 0) {
      const remainingBudget = budgetAmount - budgetSpent;
      
      // Option 1: Get back on track by end of month
      const endOfMonthDaily = remainingBudget / daysRemaining;
      recommendations.push({
        days: daysRemaining,
        label: "by end of month",
        dailyAmount: endOfMonthDaily,
        totalAmount: remainingBudget,
      });

      // Option 2: Get back on track in 3 days (if applicable)
      if (daysRemaining >= 3) {
        const in3Days = Math.min(3, daysRemaining);
        const cushion = (remainingBudget - idealDailySpending * in3Days) / Math.max(1, daysRemaining - in3Days);
        recommendations.push({
          days: in3Days,
          label: "in next 3 days",
          dailyAmount: cushion,
          totalAmount: cushion * in3Days,
        });
      }

      // Option 3: Get back on track in 5 days (if applicable)
      if (daysRemaining >= 5) {
        const in5Days = Math.min(5, daysRemaining);
        const cushion5 = (remainingBudget - idealDailySpending * in5Days) / Math.max(1, daysRemaining - in5Days);
        recommendations.push({
          days: in5Days,
          label: "in next 5 days",
          dailyAmount: cushion5,
          totalAmount: cushion5 * in5Days,
        });
      }
    }

    return {
      avgDailySpending,
      idealDailySpending,
      spendingDifference,
      daysAnalyzed: recentDaysCount || currentDay,
      daysRemaining,
      remainingBudget: budgetAmount - budgetSpent,
      recommendations,
      isOverspending: budgetSpent > (idealDailySpending * currentDay),
    };
  };

  const analytics = budgetEnabled && budgetAmount > 0 ? getBudgetAnalytics() : null;

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCategorySubmitting(true);

    try {
      if (!newCategoryName.trim()) {
        return;
      }

      // Check if category already exists
      const exists = expenseCategories.find(
        (c) => c.name.toLowerCase() === newCategoryName.trim().toLowerCase()
      );

      if (exists) {
        alert("A category with this name already exists");
        return;
      }

      const { data, error } = await supabase
        .from("expense_categories")
        .insert({ name: newCategoryName.trim(), user_id: user?.id })
        .select()
        .single();

      if (error) throw error;

      setExpenseCategories([...expenseCategories, data]);
      setNewCategoryName("");
      setIsCategoryModalOpen(false);
    } catch (err: any) {
      console.error("Error creating category:", err);
      alert("Failed to create category");
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Collapsible Sidebar */}
      <div className={`fixed left-0 top-0 h-full glass border-r-2 border-gray-200 dark:border-gray-700 transition-all duration-300 z-30 ${
        isSidebarExpanded ? 'w-64' : 'w-16'
      }`}>
        <div className="h-full flex flex-col p-3">
          {/* Toggle Button */}
          <button
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className="p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors mb-6"
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
          <div className="mb-6">
            {isSidebarExpanded ? (
              <div className="space-y-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3">VIEW</span>
                <button
                  onClick={() => setViewMode("categories")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                    viewMode === "categories"
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Layers size={18} />
                  <span className="text-sm font-medium">Categories</span>
                </button>
                <button
                  onClick={() => setViewMode("transactions")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                    viewMode === "transactions"
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Receipt size={18} />
                  <span className="text-sm font-medium">Transactions</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => setViewMode("categories")}
                  className={`w-full p-3 rounded-xl transition-colors ${
                    viewMode === "categories"
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title="Categories"
                >
                  <Layers size={20} />
                </button>
                <button
                  onClick={() => setViewMode("transactions")}
                  className={`w-full p-3 rounded-xl transition-colors ${
                    viewMode === "transactions"
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title="Transactions"
                >
                  <Receipt size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Month Navigation */}
          <div className="mb-6">
            {isSidebarExpanded ? (
              <div className="space-y-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3">MONTH</span>
                <div className="flex items-center justify-between px-2">
                  <button
                    onClick={() => navigateMonth("prev")}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    title="Previous month"
                  >
                    <ChevronLeft size={16} className="text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    title="Go to current month"
                  >
                    {getMonthYear(currentMonth)}
                  </button>
                  <button
                    onClick={() => navigateMonth("next")}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    title="Next month"
                  >
                    <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
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
          <div className="mt-auto">
            {isSidebarExpanded ? (
              <div className="space-y-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3">TOTAL</span>
                <div className="relative">
                  <button
                    onClick={() => setIsTotalsDropdownOpen(!isTotalsDropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className="text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(convertedTotal, homeCurrency)}
                      </span>
                    </div>
                    <ChevronDown 
                      size={14} 
                      className={`text-gray-600 dark:text-gray-400 transition-transform ${isTotalsDropdownOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>

                  {/* Dropdown */}
                  {isTotalsDropdownOpen && (
                    <div className="mt-2 bg-[#f8fafc] dark:bg-[#0f0f0f] rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="p-1">
                        {Object.entries(totals).map(([currency, amount]) => (
                          <button
                            key={currency}
                            onClick={() => {
                              setSelectedCurrency(currency);
                              setIsTotalsDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs ${
                              selectedCurrency === currency ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                            }`}
                          >
                            <span className="font-medium text-gray-900 dark:text-white">{currency}</span>
                            <span className="font-semibold text-red-600 dark:text-red-400">
                              {formatCurrency(amount, currency)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
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
      <div className={`flex-1 transition-all duration-300 ${isSidebarExpanded ? 'ml-64' : 'ml-16'}`}>
        <div className="p-4 pb-24">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Expenses</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Track your spending and categories
              </p>
            </div>

            {/* Compact Total Button with Dropdown */}
            <div className="mb-6 flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setIsTotalsDropdownOpen(!isTotalsDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl glass border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total:</span>
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(convertedTotal, homeCurrency)}
                  </span>
                  <ChevronDown 
                    size={16} 
                    className={`text-gray-600 dark:text-gray-400 transition-transform ${isTotalsDropdownOpen ? 'rotate-180' : ''}`} 
                  />
                </button>

                {/* Dropdown */}
                {isTotalsDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsTotalsDropdownOpen(false)}
                    />
                    <div className="absolute top-full mt-2 left-0 min-w-[240px] bg-[#f8fafc] dark:bg-[#0f0f0f] rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-xl z-20 overflow-hidden animate-fadeIn">
                      <div className="p-2">
                        {Object.entries(totals).map(([currency, amount]) => (
                          <button
                            key={currency}
                            onClick={() => {
                              setSelectedCurrency(currency);
                              setIsTotalsDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                              selectedCurrency === currency ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                            }`}
                          >
                            <span className="font-medium text-gray-900 dark:text-white">{currency}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                {formatCurrency(amount, currency)}
                              </span>
                              <ArrowRight size={14} className="text-gray-400" />
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 bg-[#f1f5f9] dark:bg-[#0a0a0a]">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Total ({homeCurrency})
                          </span>
                          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(convertedTotal, homeCurrency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Active Currency Filter Badge */}
              {selectedCurrency !== "all" && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    Filtered by: {selectedCurrency}
                  </span>
                  <button
                    onClick={() => setSelectedCurrency("all")}
                    className="p-0.5 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                  >
                    <X size={14} className="text-indigo-600 dark:text-indigo-400" />
                  </button>
                </div>
              )}
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

                {/* Day Progress Indicator - Current Month Only */}
                {dayProgress && (
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">
                      Day {dayProgress.currentDay} of {dayProgress.totalDays}
                    </span>
                    <button
                      onClick={() => setIsBudgetAnalyticsOpen(true)}
                      className={`font-medium ${getProgressStatusColor()} hover:underline cursor-pointer transition-all`}
                    >
                      {getProgressStatus()} →
                    </button>
                  </div>
                )}

                {/* Analytics Button - Past Months Only */}
                {!dayProgress && (() => {
                  const today = new Date();
                  const isPastMonth = currentMonth < new Date(today.getFullYear(), today.getMonth(), 1);
                  
                  return isPastMonth && (
                    <div className="flex items-center justify-end text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => setIsBudgetAnalyticsOpen(true)}
                        className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer transition-all"
                      >
                        View Analytics →
                      </button>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}

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
              </div>
            )}

            {/* Active Currency Filter Badge */}
            {selectedCurrency !== "all" && (
              <div className="mb-6 flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 inline-flex">
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  Filtered by: {selectedCurrency}
                </span>
                <button
                  onClick={() => setSelectedCurrency("all")}
                  className="p-0.5 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                >
                  <X size={14} className="text-indigo-600 dark:text-indigo-400" />
                </button>
              </div>
            )}

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
                        <div className="flex items-center gap-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-red-600 dark:text-red-400">
                              {formatCurrency(cat.amount, homeCurrency)}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              ({cat.percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <ArrowRight size={18} className="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
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

        {/* Add Category Modal */}
        <Modal 
          isOpen={isCategoryModalOpen} 
          onClose={() => {
            setIsCategoryModalOpen(false);
            setNewCategoryName("");
          }} 
          title="Add Category"
        >
          <form onSubmit={handleAddCategory} className="space-y-4">
            <Input
              type="text"
              label="Category Name"
              placeholder="e.g., Food, Transport, Bills"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              required
            />

            <Button type="submit" className="w-full" isLoading={isCategorySubmitting}>
              Create Category
            </Button>
          </form>
        </Modal>

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

        {/* Budget Analytics Modal */}
        <Modal
          isOpen={isBudgetAnalyticsOpen}
          onClose={() => setIsBudgetAnalyticsOpen(false)}
          title="Budget Analytics & Recommendations"
        >
          {analytics && (
            <div className="space-y-4">
              {/* Spending Pattern */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Your Spending Pattern
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Avg. daily (last {analytics.daysAnalyzed}d):
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(analytics.avgDailySpending, budgetCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Ideal daily:
                    </span>
                    <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(analytics.idealDailySpending, budgetCurrency)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Difference:
                      </span>
                      <span className={`text-lg font-bold ${
                        analytics.spendingDifference > 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {analytics.spendingDifference > 0 ? '+' : ''}
                        {formatCurrency(analytics.spendingDifference, budgetCurrency)}/day
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Status */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {analytics.isOverspending ? (
                    <>
                      You {analytics.daysRemaining > 0 ? 've been' : 'had'} <span className="font-semibold text-red-600 dark:text-red-400">overspending</span> by{' '}
                      <span className="font-bold">{formatCurrency(Math.abs(analytics.spendingDifference), budgetCurrency)}</span>/day.
                    </>
                  ) : (
                    <>
                      Great job! {analytics.daysRemaining > 0 ? "You're" : "You were"} <span className="font-semibold text-green-600 dark:text-green-400">under budget</span> by{' '}
                      <span className="font-bold">{formatCurrency(Math.abs(analytics.spendingDifference), budgetCurrency)}</span>/day.
                    </>
                  )}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {analytics.daysRemaining > 0 
                    ? `${analytics.daysRemaining} days remaining this month`
                    : 'Month complete'}
                </p>
              </div>

              {/* Recommendations */}
              {analytics.recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {analytics.isOverspending ? 'To get back on track:' : 'You can afford to spend:'}
                  </h3>
                  <div className="space-y-2">
                    {analytics.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {rec.label}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              ({rec.days} {rec.days === 1 ? 'day' : 'days'})
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(rec.dailyAmount, budgetCurrency)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              per day
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Suggestions */}
              {!analytics.isOverspending && analytics.remainingBudget > 0 && (
                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-800 dark:text-green-200 font-medium mb-1">
                    💡 {analytics.daysRemaining > 0 ? 'Smart Suggestion' : 'Month Summary'}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    {analytics.daysRemaining > 0 ? (
                      <>
                        Transfer excess to savings or use{' '}
                        {formatCurrency(analytics.remainingBudget / analytics.daysRemaining, budgetCurrency)}/day
                        for extras!
                      </>
                    ) : (
                      <>
                        You saved {formatCurrency(analytics.remainingBudget, budgetCurrency)} this month!
                        Great financial discipline.
                      </>
                    )}
                  </p>
                </div>
              )}

              {analytics.isOverspending && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-800 dark:text-amber-200 font-medium mb-1">
                    💡 {analytics.daysRemaining > 0 ? 'Quick Tips' : 'Month Review'}
                  </p>
                  {analytics.daysRemaining > 0 ? (
                    <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
                      <li>Review recent transactions</li>
                      <li>Set daily spending alerts</li>
                      <li>Try meal planning</li>
                    </ul>
                  ) : (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      You overspent by {formatCurrency(Math.abs(analytics.remainingBudget), budgetCurrency)} this month. 
                      Consider adjusting next month's budget or finding areas to cut back.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>
          </div>
        </div>
      </div>
    </div>
  );
}

