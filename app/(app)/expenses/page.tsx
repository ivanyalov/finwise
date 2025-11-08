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
import { Plus, TrendingDown, ChevronLeft, ChevronRight, ChevronRight as ArrowRight, ChevronDown, X, FolderPlus, Menu, Layers, Receipt, Calendar, DollarSign, Edit2, Trash2 } from "lucide-react";

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "CNY", label: "CNY (¥)" },
  { value: "INR", label: "INR (₹)" },
];

type ViewMode = "transactions" | "categories";

interface CategoryData {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
  currency: string;
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
  const [newCategoryCurrency, setNewCategoryCurrency] = useState("USD");
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryCurrency, setEditCategoryCurrency] = useState("");
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<ExpenseCategory | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [isBudgetAnalyticsOpen, setIsBudgetAnalyticsOpen] = useState(false);
  const [isBudgetEditModalOpen, setIsBudgetEditModalOpen] = useState(false);
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);
  const [editBudgetAmount, setEditBudgetAmount] = useState("");
  const [editBudgetCurrency, setEditBudgetCurrency] = useState("");
  const [isTotalsDropdownOpen, setIsTotalsDropdownOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  
  // Transaction editing state
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);
  const [editTransactionAmount, setEditTransactionAmount] = useState("");
  const [editTransactionCurrency, setEditTransactionCurrency] = useState("");
  const [editTransactionDate, setEditTransactionDate] = useState("");
  const [editTransactionNotes, setEditTransactionNotes] = useState("");
  const [isDeleteTransactionModalOpen, setIsDeleteTransactionModalOpen] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [isDeletingTransaction, setIsDeletingTransaction] = useState(false);
  
  // Transaction details modal
  const [isTransactionDetailsOpen, setIsTransactionDetailsOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Budget state
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState(0);
  const [budgetCurrency, setBudgetCurrency] = useState("USD");

  // Form state
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
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

      let categoryId: string;
      
      if (isCreatingNewCategory) {
        // Create new category
        if (!newCategoryName.trim()) {
          setError("Please enter a category name");
          return;
        }

        // Check if category already exists
        const exists = expenseCategories.find(
          (c) => c.name.toLowerCase() === newCategoryName.trim().toLowerCase()
        );

        if (exists) {
          setError("A category with this name already exists");
          return;
        }

        const { data: newCategory, error: categoryError } = await supabase
          .from("expense_categories")
          .insert({
            name: newCategoryName.trim(),
            currency: newCategoryCurrency,
            user_id: user?.id,
          })
          .select()
          .single();

        if (categoryError || !newCategory) {
          throw new Error("Failed to create category");
        }
        
        categoryId = newCategory.id;
        setExpenseCategories([...expenseCategories, newCategory]);
      } else {
        // Use selected existing category
        if (!selectedCategoryId) {
          setError("Please select a category");
          return;
        }
        categoryId = selectedCategoryId;
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
      setSelectedCategoryId("");
      setIsCreatingNewCategory(false);
      setCurrency("USD");
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
      const category = expenseCategories.find(c => c.id === categoryId);
      // Use category's own currency, or fall back to transaction currency
      const targetCurrency = category?.currency || t.currency;
      const convertedAmount = calculateConvertedAmount(t.amount, t.currency, targetCurrency);
      categoryTotals[categoryId] = (categoryTotals[categoryId] || 0) + convertedAmount;
    });

    const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

    return expenseCategories
      .map((cat, index) => ({
        id: cat.id,
        name: cat.name,
        amount: categoryTotals[cat.id] || 0,
        percentage: total > 0 ? (categoryTotals[cat.id] || 0) / total * 100 : 0,
        color: "bg-indigo-500 dark:bg-indigo-400", // Uniform purple color for all categories
        currency: cat.currency || homeCurrency,
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

  const getBudgetTextColor = () => {
    if (!dayProgress) {
      // For past/future months, just show color based on total percentage
      if (budgetPercentage >= 100) return "text-red-600 dark:text-red-400";
      if (budgetPercentage >= 80) return "text-amber-600 dark:text-amber-400";
      return "text-green-600 dark:text-green-400";
    }
    
    // For current month, use the same logic as status color
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

  const getBudgetBarColor = () => {
    if (!dayProgress) {
      // For past/future months, just show color based on total percentage
      if (budgetPercentage >= 100) return "bg-red-500";
      if (budgetPercentage >= 80) return "bg-amber-500";
      return "bg-green-500";
    }
    
    // For current month, use the same logic as status color
    if (budgetPercentage >= 100) {
      return "bg-red-500";
    }
    
    const diff = Math.abs(dayProgress.difference);
    if (dayProgress.isOnTrack) {
      return "bg-green-500";
    } else {
      if (diff > 20) {
        return "bg-red-500";
      }
      return "bg-amber-500";
    }
  };

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

    // Calculate average daily spending from start of month to now
    // Total spending divided by number of days that have passed
    const daysElapsed = currentDay; // Days from start of month (1st) to current day
    const avgDailySpending = daysElapsed > 0 ? budgetSpent / daysElapsed : 0;

    // Calculate what daily spending should be
    const idealDailySpending = budgetAmount / totalDays;
    const spendingDifference = avgDailySpending - idealDailySpending;

    // Calculate recommendations for different scenarios
    const recommendations = [];
    
    if (daysRemaining > 0) {
      const remainingBudget = budgetAmount - budgetSpent;
      
      // Option 1: Stay on track in next 3 days (if applicable)
      if (daysRemaining >= 3) {
        const periodDays = 3;
        const targetDay = currentDay + periodDays; // What day it will be after 3 days
        const idealSpendingByTargetDay = (budgetAmount / totalDays) * targetDay; // Where we should be by that day
        const availableForPeriod = idealSpendingByTargetDay - budgetSpent; // How much we can spend in these 3 days
        const dailyAmountFor3Days = availableForPeriod / periodDays;
        
        recommendations.push({
          days: periodDays,
          label: "in next 3 days",
          dailyAmount: dailyAmountFor3Days,
          totalAmount: availableForPeriod,
        });
      }

      // Option 2: Stay on track in next week (if applicable)
      if (daysRemaining >= 7) {
        const periodDays = 7;
        const targetDay = currentDay + periodDays; // What day it will be after a week
        const idealSpendingByTargetDay = (budgetAmount / totalDays) * targetDay; // Where we should be by that day
        const availableForPeriod = idealSpendingByTargetDay - budgetSpent; // How much we can spend in this week
        const dailyAmountForWeek = availableForPeriod / periodDays;
        
        recommendations.push({
          days: periodDays,
          label: "in next week",
          dailyAmount: dailyAmountForWeek,
          totalAmount: availableForPeriod,
        });
      }

      // Option 3: Stay on track by end of month
      const idealSpendingByEndOfMonth = budgetAmount; // Should spend exactly the budget by end of month
      const availableUntilEndOfMonth = idealSpendingByEndOfMonth - budgetSpent; // How much we can spend until end
      const dailyAmountUntilEnd = availableUntilEndOfMonth / daysRemaining;
      
      recommendations.push({
        days: daysRemaining,
        label: "by end of month",
        dailyAmount: dailyAmountUntilEnd,
        totalAmount: availableUntilEndOfMonth,
      });
    }

    return {
      avgDailySpending,
      idealDailySpending,
      spendingDifference,
      daysAnalyzed: daysElapsed,
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
        .insert({ 
          name: newCategoryName.trim(), 
          currency: newCategoryCurrency,
          user_id: user?.id 
        })
        .select()
        .single();

      if (error) throw error;

      setExpenseCategories([...expenseCategories, data]);
      setNewCategoryName("");
      setNewCategoryCurrency("USD");
      setIsCategoryModalOpen(false);
    } catch (err: any) {
      console.error("Error creating category:", err);
      alert("Failed to create category");
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  const handleEditCategory = async (categoryId: string) => {
    if (!editCategoryName.trim()) {
      return;
    }

    setIsEditingCategory(true);

    try {
      // Check if another category with the same name exists
      const exists = expenseCategories.find(
        (c) => c.id !== categoryId && c.name.toLowerCase() === editCategoryName.trim().toLowerCase()
      );

      if (exists) {
        alert("A category with this name already exists");
        return;
      }

      const { data, error } = await supabase
        .from("expense_categories")
        .update({ 
          name: editCategoryName.trim(),
          currency: editCategoryCurrency
        })
        .eq("id", categoryId)
        .select();

      if (error) {
        console.error("Supabase update error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        throw error;
      }
      
      console.log("Update successful, data:", data);

      // Update local state
      setExpenseCategories(
        expenseCategories.map((c) =>
          c.id === categoryId 
            ? { ...c, name: editCategoryName.trim(), currency: editCategoryCurrency } 
            : c
        )
      );

      setEditingCategoryId(null);
      setEditCategoryName("");
      setEditCategoryCurrency("");
    } catch (err: any) {
      console.error("Error updating category:", {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        fullError: err
      });
      alert(`Failed to update category: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsEditingCategory(false);
    }
  };

  const openDeleteModal = (categoryId: string) => {
    const category = expenseCategories.find((c) => c.id === categoryId);
    if (category) {
      setDeletingCategory(category);
      setDeleteConfirmationText("");
      setIsDeleteModalOpen(true);
    }
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingCategory(null);
    setDeleteConfirmationText("");
  };

  // Transaction editing functions
  const startEditingTransaction = (transaction: Transaction) => {
    setEditingTransactionId(transaction.id);
    setEditTransactionAmount(transaction.amount.toString());
    setEditTransactionCurrency(transaction.currency);
    setEditTransactionDate(transaction.date);
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
    const amount = parseFloat(editTransactionAmount);
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setIsEditingTransaction(true);

    try {
      const { error } = await supabase
        .from("transactions")
        .update({
          amount,
          currency: editTransactionCurrency,
          date: editTransactionDate,
          notes: editTransactionNotes || null,
        })
        .eq("id", transactionId);

      if (error) throw error;

      // Update local state
      useStore.setState({
        transactions: transactions.map((t) =>
          t.id === transactionId
            ? {
                ...t,
                amount,
                currency: editTransactionCurrency,
                date: editTransactionDate,
                notes: editTransactionNotes || "",
              }
            : t
        ),
      });

      cancelEditingTransaction();
    } catch (error) {
      console.error("Error updating transaction:", error);
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
    setIsDeleteTransactionModalOpen(false);
    setDeletingTransaction(null);
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

      // Update local state
      useStore.setState({
        transactions: transactions.filter((t) => t.id !== deletingTransaction.id),
      });

      closeDeleteTransactionModal();
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      alert(`Failed to delete transaction: ${error.message || 'Unknown error'}`);
    } finally {
      setIsDeletingTransaction(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    // Validate confirmation text
    const confirmationLower = deleteConfirmationText.trim().toLowerCase();
    const categoryNameLower = deletingCategory.name.toLowerCase();
    const isValidConfirmation = 
      confirmationLower === categoryNameLower || 
      confirmationLower === "delete";

    if (!isValidConfirmation) {
      return;
    }

    setIsDeletingCategory(true);

    try {
      // First, delete all transactions associated with this category
      const { error: transactionsError } = await supabase
        .from("transactions")
        .delete()
        .eq("category", deletingCategory.id);

      if (transactionsError) throw transactionsError;

      // Then delete the category itself
      const { error: categoryError } = await supabase
        .from("expense_categories")
        .delete()
        .eq("id", deletingCategory.id);

      if (categoryError) throw categoryError;

      // Update local state - remove deleted transactions
      useStore.setState({
        transactions: transactions.filter((t) => t.category !== deletingCategory.id),
      });

      // Update categories list
      setExpenseCategories(expenseCategories.filter((c) => c.id !== deletingCategory.id));
      
      closeDeleteModal();
    } catch (err: any) {
      console.error("Error deleting category:", err);
      alert("Failed to delete category");
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const startEditingCategory = (category: ExpenseCategory) => {
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
    setEditCategoryCurrency(category.currency || homeCurrency);
  };

  const cancelEditingCategory = () => {
    setEditingCategoryId(null);
    setEditCategoryName("");
    setEditCategoryCurrency("");
  };

  const openBudgetEditModal = () => {
    setEditBudgetAmount(budgetAmount.toString());
    setEditBudgetCurrency(budgetCurrency);
    setIsBudgetEditModalOpen(true);
  };

  const closeBudgetEditModal = () => {
    setIsBudgetEditModalOpen(false);
    setEditBudgetAmount("");
    setEditBudgetCurrency("");
  };

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingBudget(true);

    try {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const amount = parseFloat(editBudgetAmount);
      if (!amount || amount <= 0) {
        throw new Error("Please enter a valid budget amount");
      }

      const { error } = await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            monthly_budget_amount: amount,
            budget_currency: editBudgetCurrency,
          },
          {
            onConflict: "user_id",
          }
        );

      if (error) throw error;

      // Update local state
      setBudgetAmount(amount);
      setBudgetCurrency(editBudgetCurrency);
      closeBudgetEditModal();
    } catch (err: any) {
      console.error("Error updating budget:", err);
      alert(err.message || "Failed to update budget");
    } finally {
      setIsUpdatingBudget(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Collapsible Sidebar */}
      <div className={`fixed left-0 top-0 h-full glass border-r-2 border-gray-200 dark:border-gray-700 sidebar-transition z-30 ${
        isSidebarExpanded ? 'w-64' : 'w-16'
      }`}>
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
                  onClick={() => setViewMode("categories")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                    viewMode === "categories"
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Layers size={18} className="flex-shrink-0" />
                  <span className="text-sm font-medium flex-1 text-left">Categories</span>
                </button>
                <button
                  onClick={() => setViewMode("transactions")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                    viewMode === "transactions"
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Receipt size={18} className="flex-shrink-0" />
                  <span className="text-sm font-medium flex-1 text-left">Transactions</span>
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
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <DollarSign size={18} className="flex-shrink-0" />
                    <span className="text-sm font-medium flex-1 text-left">
                      {formatCurrency(convertedTotal, homeCurrency)}
                    </span>
                    <ChevronDown 
                      size={18} 
                      className={`flex-shrink-0 transition-transform ${isTotalsDropdownOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>

                  {/* Dropdown */}
                  {isTotalsDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsTotalsDropdownOpen(false)}
                      />
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
                                selectedCurrency === currency ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
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
      <div className="flex-1 ml-16">
        <div className="p-4 pb-24">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Expenses</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Track your spending and categories
              </p>
            </div>

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

        {/* Budget Card */}
        {budgetEnabled && budgetAmount > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-baseline gap-2 flex-wrap flex-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Budget:
                    </span>
                    <span className={`text-lg font-bold ${getBudgetTextColor()}`}>
                      {formatCurrency(budgetSpent, budgetCurrency)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">/</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(budgetAmount, budgetCurrency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-semibold ${getBudgetTextColor()}`}>
                      {budgetRemaining >= 0 ? formatCurrency(budgetRemaining, budgetCurrency) : formatCurrency(Math.abs(budgetRemaining), budgetCurrency)} {budgetRemaining >= 0 ? "left" : "over"}
                    </span>
                    <button
                      onClick={openBudgetEditModal}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      title="Edit budget"
                    >
                      <Edit2 size={16} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative">
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getBudgetBarColor()} rounded-full`}
                      style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Day Progress Indicator - Current Month Only */}
                {dayProgress && (
                  <div className="flex items-center justify-between text-sm pt-1">
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
                    <div className="flex items-center justify-end text-sm pt-1">
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
                  onChange={(value) => setSelectedCategory(value)}
                />
                <Select
                  label="Filter by Currency"
                  options={[
                    { value: "all", label: "All Currencies" },
                    ...CURRENCIES,
                  ]}
                  value={selectedCurrency}
                  onChange={(value) => setSelectedCurrency(value)}
                />
              </div>
            )}

        {/* Categories View */}
        {viewMode === "categories" && (
          <Card>
            <CardHeader 
              title="Spending by Category"
              action={
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                  title="Add Category"
                >
                  <Plus size={18} />
                  <span className="text-sm font-medium">Add</span>
                </button>
              }
            />
            <CardContent>
              {categoryData.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No categories with expenses this month
                  </p>
                  <button
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                  >
                    <Plus size={18} />
                    <span>Add Category</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryData.map((cat, index) => {
                    const isEditing = editingCategoryId === cat.id;
                    const category = expenseCategories.find((c) => c.id === cat.id);
                    
                    return (
                      <div
                        key={cat.id}
                        className="w-full p-4 rounded-2xl glass group relative"
                      >
                        {isEditing ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleEditCategory(cat.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                cancelEditingCategory();
                              }
                            }}
                            className="space-y-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Input
                              type="text"
                              label="Category Name"
                              value={editCategoryName}
                              onChange={(e) => setEditCategoryName(e.target.value)}
                              placeholder="Category name"
                              autoFocus
                              className="text-base font-semibold"
                            />
                            <Select
                              label="Currency"
                              options={CURRENCIES}
                              value={editCategoryCurrency}
                              onChange={(value) => setEditCategoryCurrency(value)}
                              required
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                type="submit"
                                size="sm"
                                isLoading={isEditingCategory}
                                className="flex-1"
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={cancelEditingCategory}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-2.5">
                              <button
                                onClick={() => handleCategoryClick(cat.id)}
                                className="flex-1 text-left flex items-center gap-2 group/nav cursor-pointer hover:opacity-80 transition-opacity"
                              >
                                <span className="font-semibold text-gray-900 dark:text-white group-hover/nav:text-indigo-600 dark:group-hover/nav:text-indigo-400 transition-colors">
                                  {cat.name}
                                </span>
                                <ArrowRight size={16} className="text-gray-400 dark:text-gray-500 group-hover/nav:text-indigo-600 dark:group-hover/nav:text-indigo-400 transition-colors" />
                              </button>
                              <div className="flex items-center gap-2">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(cat.amount, cat.currency)}
                                  </span>
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    ({cat.percentage.toFixed(0)}%)
                                  </span>
                                </div>
                                {/* Add, Edit and delete icons aligned with text */}
                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCategoryId(cat.id);
                                      setIsCreatingNewCategory(false);
                                      setCategory(cat.name);
                                      setCurrency(cat.currency || homeCurrency);
                                      setIsModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    title="Add expense to this category"
                                  >
                                    <Plus size={16} strokeWidth={2} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditingCategory(cat);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    title="Edit category"
                                  >
                                    <Edit2 size={16} strokeWidth={2} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDeleteModal(cat.id);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    title="Delete category"
                                  >
                                    <Trash2 size={16} strokeWidth={2} />
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="relative">
                              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${cat.color} rounded-full`}
                                  style={{ 
                                    width: `${cat.percentage}%`
                                  }}
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Transactions List View */}
        {viewMode === "transactions" && (
          <Card>
            <CardHeader 
              title="Transactions"
              action={
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                  title="Add Transaction"
                >
                  <Plus size={18} />
                  <span className="text-sm font-medium">Add</span>
                </button>
              }
            />
            <CardContent>
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No expenses recorded for this month
                  </p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                  >
                    <Plus size={18} />
                    <span>Add Transaction</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.map((transaction) => {
                    const categoryName = expenseCategories.find((c) => c.id === transaction.category)?.name || transaction.category || "Expense";
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
                                required
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
                                    {categoryName}
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
        )}

        {/* Add Category Modal */}
        <Modal 
          isOpen={isCategoryModalOpen} 
          onClose={() => {
            setIsCategoryModalOpen(false);
            setNewCategoryName("");
            setNewCategoryCurrency("USD");
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
            
            <Select
              label="Currency"
              options={CURRENCIES}
              value={newCategoryCurrency}
              onChange={(value) => setNewCategoryCurrency(value)}
              required
            />

            <Button type="submit" className="w-full" isLoading={isCategorySubmitting}>
              Create Category
            </Button>
          </form>
        </Modal>

        {/* Delete Category Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          title="Delete Category"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                ⚠️ Warning: This action cannot be undone
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Deleting <strong>{deletingCategory?.name}</strong> will permanently remove the category and <strong>all transactions</strong> associated with it.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                To confirm deletion, please type the category name <strong>"{deletingCategory?.name}"</strong> or type <strong>"delete"</strong>:
              </p>
              
              <Input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder={deletingCategory?.name || "Category name or 'delete'"}
                autoFocus
              />

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
                  variant="danger"
                  onClick={handleDeleteCategory}
                  className="flex-1"
                  isLoading={isDeletingCategory}
                  disabled={
                    isDeletingCategory ||
                    !deleteConfirmationText.trim() ||
                    (
                      deleteConfirmationText.trim().toLowerCase() !== deletingCategory?.name.toLowerCase() &&
                      deleteConfirmationText.trim().toLowerCase() !== "delete"
                    )
                  }
                >
                  Delete Category
                </Button>
              </div>
            </div>
          </div>
        </Modal>

        {/* Edit Budget Modal */}
        <Modal
          isOpen={isBudgetEditModalOpen}
          onClose={closeBudgetEditModal}
          title="Edit Budget"
        >
          <form onSubmit={handleUpdateBudget} className="space-y-4">
            <Input
              type="number"
              label="Budget Amount"
              placeholder="0.00"
              value={editBudgetAmount}
              onChange={(e) => setEditBudgetAmount(e.target.value)}
              required
              step="0.01"
              min="0"
            />

            <Select
              label="Currency"
              options={CURRENCIES}
              value={editBudgetCurrency}
              onChange={(value) => setEditBudgetCurrency(value)}
              required
            />

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={closeBudgetEditModal}
                className="flex-1"
                disabled={isUpdatingBudget}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                isLoading={isUpdatingBudget}
              >
                Update Budget
              </Button>
            </div>
          </form>
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
                variant="danger"
                onClick={handleDeleteTransaction}
                className="flex-1"
                isLoading={isDeletingTransaction}
              >
                Delete Transaction
              </Button>
            </div>
          </div>
        </Modal>

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
                  {expenseCategories.find((c) => c.id === selectedTransaction.category)?.name || 
                   selectedTransaction.category || "Expense"}
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

        {/* Add Expense Modal */}
        <Modal isOpen={isModalOpen} onClose={() => {
          setIsModalOpen(false);
          setSelectedCategoryId("");
          setIsCreatingNewCategory(false);
        }} title="Add Expense">
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
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <Select
                options={[
                  { value: "", label: "Create new category..." },
                  ...expenseCategories.map((c) => ({ 
                    value: c.id, 
                    label: c.name 
                  }))
                ]}
                value={selectedCategoryId}
                onChange={(value) => {
                  if (value === "") {
                    setIsCreatingNewCategory(true);
                    setSelectedCategoryId("");
                  } else {
                    setIsCreatingNewCategory(false);
                    setSelectedCategoryId(value);
                    const selectedCat = expenseCategories.find(c => c.id === value);
                    if (selectedCat) {
                      setCategory(selectedCat.name);
                      setCurrency(selectedCat.currency || homeCurrency);
                    }
                  }
                }}
                required={!isCreatingNewCategory}
              />
              
              {isCreatingNewCategory && (
                <div className="mt-3 space-y-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                  <Input
                    type="text"
                    label="New Category Name"
                    placeholder="e.g., Food, Transport, Bills"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    required
                  />
                  <Select
                    label="Category Currency"
                    options={CURRENCIES}
                    value={newCategoryCurrency}
                    onChange={(value) => setNewCategoryCurrency(value)}
                    required
                  />
                </div>
              )}
            </div>

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
                      Avg. daily ({analytics.daysAnalyzed} {analytics.daysAnalyzed === 1 ? 'day' : 'days'}):
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
                  <p className="text-xs text-amber-800 dark:text-white font-medium mb-1">
                    💡 {analytics.daysRemaining > 0 ? 'Quick Tips' : 'Month Review'}
                  </p>
                  {analytics.daysRemaining > 0 ? (
                    <ul className="text-xs text-amber-700 dark:text-white space-y-1 list-disc list-inside">
                      <li>Review recent transactions</li>
                      <li>Set daily spending alerts</li>
                      <li>Try meal planning</li>
                    </ul>
                  ) : (
                    <p className="text-xs text-amber-700 dark:text-white">
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

