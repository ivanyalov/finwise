"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useStore } from "@/lib/store/useStore";
import { Transaction } from "@/lib/types";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { formatCurrency, formatDate, getPercentageChange } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  LogOut,
  DollarSign,
} from "lucide-react";
import Button from "@/components/ui/Button";

export default function DashboardPage() {
  const router = useRouter();
  const {
    user,
    homeCurrency,
    transactions,
    setUser,
    setTransactions,
    setLoading,
    getCurrentMonthIncome,
    getCurrentMonthExpenses,
    getTotalSavings,
    getAvailableBalance,
  } = useStore();

  const [prevMonthIncome, setPrevMonthIncome] = useState(0);
  const [prevMonthExpenses, setPrevMonthExpenses] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadUserAndData();
  }, []);

  useEffect(() => {
    if (transactions.length > 0) {
      calculatePrevMonthStats();
      setRecentTransactions(transactions.slice(0, 5));
    }
  }, [transactions, homeCurrency]);

  const loadUserAndData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      // Load transactions
      const { data: transactionsData, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && transactionsData) {
        setTransactions(transactionsData);
      }

      // Load settings
      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (settingsData) {
        useStore.setState({ homeCurrency: settingsData.home_currency || "USD" });
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePrevMonthStats = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const lastMonthTransactions = transactions.filter((t) => {
      const date = new Date(t.date);
      return (
        date.getMonth() === lastMonth.getMonth() &&
        date.getFullYear() === lastMonth.getFullYear()
      );
    });

    const income = lastMonthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount / 1, 0); // Simplified conversion

    const expenses = lastMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount / 1, 0);

    setPrevMonthIncome(income);
    setPrevMonthExpenses(expenses);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const currentIncome = getCurrentMonthIncome();
  const currentExpenses = getCurrentMonthExpenses();
  const totalSavings = getTotalSavings();
  const availableBalance = getAvailableBalance();

  const incomeChange = getPercentageChange(currentIncome, prevMonthIncome);
  const expenseChange = getPercentageChange(currentExpenses, prevMonthExpenses);
  const savingsChange = getPercentageChange(totalSavings, 0);

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Welcome back! Here's your financial overview
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut size={18} />
            Logout
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="glass-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Available Balance
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(availableBalance, homeCurrency)}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30">
                  <Wallet className="text-indigo-600 dark:text-indigo-400" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Total Savings
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(totalSavings, homeCurrency)}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30">
                  <PiggyBank className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-hover">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Monthly Income
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(currentIncome, homeCurrency)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {incomeChange >= 0 ? (
                      <TrendingUp className="text-green-600" size={14} />
                    ) : (
                      <TrendingDown className="text-red-600" size={14} />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        incomeChange >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {Math.abs(incomeChange).toFixed(1)}% vs last month
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-green-100 dark:bg-green-900/30">
                  <DollarSign className="text-green-600 dark:text-green-400" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-hover">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Monthly Expenses
                  </p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(currentExpenses, homeCurrency)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {expenseChange >= 0 ? (
                      <TrendingUp className="text-red-600" size={14} />
                    ) : (
                      <TrendingDown className="text-green-600" size={14} />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        expenseChange >= 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {Math.abs(expenseChange).toFixed(1)}% vs last month
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-900/30">
                  <TrendingDown className="text-red-600 dark:text-red-400" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="mb-6">
          <CardHeader title="Recent Transactions" />
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No transactions yet. Start tracking your finances!
              </p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => {
                  const Icon =
                    transaction.type === "income" ? DollarSign : TrendingDown;
                  const isIncome = transaction.type === "income";
                  const colorClass = isIncome
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400";

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 rounded-2xl glass-hover transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl ${
                            isIncome
                              ? "bg-green-100 dark:bg-green-900/30"
                              : "bg-red-100 dark:bg-red-900/30"
                          }`}
                        >
                          <Icon
                            size={20}
                            className={colorClass}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {transaction.source || transaction.category || "Transaction"}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(transaction.date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${colorClass}`}>
                          {isIncome ? "+" : "-"}
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {transaction.currency}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

