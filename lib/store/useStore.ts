import { create } from "zustand";
import { Transaction, IncomeSource, ExpenseCategory, UserSettings } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";
import { calculateConvertedAmount } from "@/lib/utils";

interface StoreState {
  user: any;
  homeCurrency: string;
  theme: "light" | "dark";
  transactions: Transaction[];
  incomeSources: IncomeSource[];
  expenseCategories: ExpenseCategory[];
  settings: UserSettings | null;
  isLoading: boolean;

  // Actions
  setUser: (user: any) => void;
  setHomeCurrency: (currency: string) => void;
  setTheme: (theme: "light" | "dark") => void;
  setTransactions: (transactions: Transaction[]) => void;
  setIncomeSources: (sources: IncomeSource[]) => void;
  setExpenseCategories: (categories: ExpenseCategory[]) => void;
  setSettings: (settings: UserSettings) => void;
  setLoading: (loading: boolean) => void;
  addTransaction: (transaction: Transaction) => void;

  // Computed values
  getTransactionsByType: (type: string) => Transaction[];
  getCurrentMonthIncome: () => number;
  getCurrentMonthExpenses: () => number;
  getTotalSavings: () => number;
  getAvailableBalance: () => number;
}

export const useStore = create<StoreState>((set, get) => ({
  user: null,
  homeCurrency: "USD",
  theme: "dark",
  transactions: [],
  incomeSources: [],
  expenseCategories: [],
  settings: null,
  isLoading: false,

  setUser: (user) => set({ user }),
  setHomeCurrency: (currency) => set({ homeCurrency: currency }),
  setTheme: (theme) => {
    set({ theme });
    // Apply theme to document
    if (typeof window !== "undefined") {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);
    }
  },
  setTransactions: (transactions) => set({ transactions }),
  setIncomeSources: (sources) => set({ incomeSources: sources }),
  setExpenseCategories: (categories) => set({ expenseCategories: categories }),
  setSettings: (settings) => set({ 
    settings, 
    homeCurrency: settings.home_currency || "USD",
    theme: settings.theme || "dark"
  }),
  setLoading: (loading) => set({ isLoading: loading }),
  addTransaction: (transaction) => set((state) => ({ transactions: [transaction, ...state.transactions] })),

  getTransactionsByType: (type) => {
    return get().transactions.filter((t) => t.type === type);
  },

  getCurrentMonthIncome: () => {
    const now = new Date();
    const transactions = get().getTransactionsByType("income");
    return transactions
      .filter((t) => {
        const date = new Date(t.date);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, t) => {
        const amount = calculateConvertedAmount(t.amount, t.currency, get().homeCurrency);
        return sum + amount;
      }, 0);
  },

  getCurrentMonthExpenses: () => {
    const now = new Date();
    const transactions = get().getTransactionsByType("expense");
    return transactions
      .filter((t) => {
        const date = new Date(t.date);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, t) => {
        const amount = calculateConvertedAmount(t.amount, t.currency, get().homeCurrency);
        return sum + amount;
      }, 0);
  },

  getTotalSavings: () => {
    const transactions = get().getTransactionsByType("savings_transfer");
    return transactions.reduce((sum, t) => {
      let amount = calculateConvertedAmount(t.amount, t.currency, get().homeCurrency);
      if (t.transfer_type === "from_savings") amount = -amount;
      return sum + amount;
    }, 0);
  },

  getAvailableBalance: () => {
    const income = get().getCurrentMonthIncome();
    const expenses = get().getCurrentMonthExpenses();
    const savings = get().getTotalSavings();
    return income - expenses - savings;
  },
}));

