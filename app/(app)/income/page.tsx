"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useStore } from "@/lib/store/useStore";
import { Transaction, IncomeSource } from "@/lib/types";
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
import { Plus, TrendingUp, ChevronLeft, ChevronRight, DollarSign } from "lucide-react";

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

  const filterTransactions = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999); // End of day

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

    console.log("Filtering income:", {
      totalTransactions: transactions.length,
      incomeTransactions: transactions.filter((t) => t.type === "income").length,
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

      // Only load income sources if not already loaded
      if (incomeSources.length === 0) {
        const { data: sourcesData } = await supabase
          .from("income_sources")
          .select("*")
          .eq("user_id", user.id)
          .order("name");

        if (sourcesData) {
          setIncomeSources(sourcesData);
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
        console.log("Adding new income to store:", newTransaction);
        addTransaction(newTransaction);
        console.log("Transactions after add:", transactions.length);
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

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Income</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track your earnings and sources
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <Plus size={18} />
            Add Income
          </Button>
        </div>

        {/* Month Navigation */}
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateMonth("prev")}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft size={24} className="text-gray-600 dark:text-gray-400" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {getMonthYear(currentMonth)}
            </h2>
            <button
              onClick={() => navigateMonth("next")}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronRight size={24} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </Card>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Select
            label="Filter by Source"
            options={[
              { value: "all", label: "All Sources" },
              ...incomeSources.map((s) => ({ value: s.id, label: s.name })),
            ]}
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
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
                    <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30">
                      <DollarSign className="text-green-600 dark:text-green-400" size={20} />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{currency}</span>
                  </div>
                  <span className="text-lg font-semibold text-green-600 dark:text-green-400">
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

        {/* Transactions List */}
        <Card>
          <CardHeader title="Transactions" />
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No income recorded for this month
              </p>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => {
                  const sourceName = incomeSources.find((s) => s.id === transaction.source)?.name || transaction.source || "Income";
                  
                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 rounded-2xl glass-hover"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30">
                          <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {sourceName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(transaction.date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          +{formatCurrency(transaction.amount, transaction.currency)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

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
              onChange={(e) => setCurrency(e.target.value)}
              required
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
  );
}

