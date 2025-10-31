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
import { formatCurrency, formatDate, calculateConvertedAmount } from "@/lib/utils";
import { TrendingUp, TrendingDown, PiggyBank, Shield, Plus } from "lucide-react";

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "CNY", label: "CNY (¥)" },
  { value: "INR", label: "INR (₹)" },
];

export default function SavingsPage() {
  const router = useRouter();
  const {
    user,
    homeCurrency,
    transactions,
    setUser,
    setTransactions,
    setLoading,
    getTotalSavings,
    settings,
  } = useStore();

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [savingsTransactions, setSavingsTransactions] = useState<Transaction[]>([]);

  // Form state
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [transferType, setTransferType] = useState<"to" | "from">("to");

  useEffect(() => {
    loadUserAndData();
  }, []);

  useEffect(() => {
    if (transactions.length > 0) {
      const savings = transactions.filter((t) => t.type === "savings_transfer");
      setSavingsTransactions(savings);
    }
  }, [transactions]);

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
      const { data: transactionsData } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (transactionsData) {
        setTransactions(transactionsData);
      }

      // Load settings
      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (settingsData) {
        useStore.setState({
          homeCurrency: settingsData.home_currency || "USD",
          settings: settingsData,
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!amount || parseFloat(amount) <= 0) {
        setError("Please enter a valid amount");
        return;
      }

      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          type: "savings_transfer",
          amount: parseFloat(amount),
          currency,
          date: new Date().toISOString().split("T")[0],
          transfer_type: transferType === "to" ? "to_savings" : "from_savings",
          notes: notes || null,
          user_id: user?.id,
        });

      if (transactionError) throw transactionError;

      // Reload transactions
      const { data: updatedTransactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user?.id)
        .order("date", { ascending: false });

      if (updatedTransactions) {
        setTransactions(updatedTransactions);
      }

      // Reset form and close modal
      setAmount("");
      setNotes("");
      setIsMoveModalOpen(false);
      setIsWithdrawModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to process transfer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSavings = getTotalSavings();
  const emergencyFundGoal = settings?.emergency_fund_goal || 0;
  const emergencyProgress = emergencyFundGoal > 0 ? (totalSavings / emergencyFundGoal) * 100 : 0;

  const openModal = (type: "to" | "from") => {
    setTransferType(type);
    if (type === "to") {
      setIsMoveModalOpen(true);
    } else {
      setIsWithdrawModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Savings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your savings and track your progress
          </p>
        </div>

        {/* Total Savings Card */}
        <Card className="mb-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Total Savings
                </p>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(totalSavings, homeCurrency)}
                </p>
              </div>
              <div className="p-4 rounded-3xl bg-blue-100 dark:bg-blue-900/30">
                <PiggyBank className="text-blue-600 dark:text-blue-400" size={40} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => openModal("to")}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Plus size={18} />
                Move to Savings
              </Button>
              <Button
                onClick={() => openModal("from")}
                variant="secondary"
                className="w-full flex items-center justify-center gap-2"
              >
                <TrendingDown size={18} />
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Fund */}
        {emergencyFundGoal > 0 && (
          <Card className="mb-6">
            <CardHeader
              title="Emergency Fund"
              subtitle="Financial safety net"
            />
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                      <Shield className="text-indigo-600 dark:text-indigo-400" size={20} />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">Goal</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(emergencyFundGoal, homeCurrency)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min(emergencyProgress, 100)}%` }}
                  />
                </div>

                <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                  {emergencyProgress >= 100
                    ? "🎉 Goal reached!"
                    : `${Math.round(emergencyProgress)}% of goal completed`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card>
          <CardHeader title="Recent Transactions" />
          <CardContent>
            {savingsTransactions.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No savings transactions yet
              </p>
            ) : (
              <div className="space-y-3">
                {savingsTransactions.map((transaction) => {
                  const isTo = transaction.transfer_type === "to_savings";
                  const Icon = isTo ? TrendingUp : TrendingDown;
                  const colorClass = isTo
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-red-600 dark:text-red-400";

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 rounded-2xl glass-hover"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl ${
                            isTo
                              ? "bg-blue-100 dark:bg-blue-900/30"
                              : "bg-red-100 dark:bg-red-900/30"
                          }`}
                        >
                          <Icon size={20} className={colorClass} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {isTo ? "Moved to Savings" : "Withdrawn from Savings"}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(transaction.date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${colorClass}`}>
                          {isTo ? "+" : "-"}
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Move to Savings Modal */}
        <Modal
          isOpen={isMoveModalOpen}
          onClose={() => setIsMoveModalOpen(false)}
          title="Move to Savings"
        >
          <form onSubmit={handleTransfer} className="space-y-4">
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
              label="Notes (optional)"
              placeholder="Additional details"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Move to Savings
            </Button>
          </form>
        </Modal>

        {/* Withdraw from Savings Modal */}
        <Modal
          isOpen={isWithdrawModalOpen}
          onClose={() => setIsWithdrawModalOpen(false)}
          title="Withdraw from Savings"
        >
          <form onSubmit={handleTransfer} className="space-y-4">
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
              label="Notes (optional)"
              placeholder="Additional details"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Withdraw
            </Button>
          </form>
        </Modal>
      </div>
    </div>
  );
}

