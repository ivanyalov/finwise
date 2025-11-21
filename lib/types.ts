export type TransactionType = "income" | "expense" | "savings_transfer";

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string;
  notes?: string;
  category?: string;
  source?: string;
  project_id?: string;
  transfer_type?: "to_savings" | "from_savings";
  created_at: string;
  user_id: string;
};

export type Project = {
  id: string;
  name: string;
  currency: string;
  status: "active" | "completed" | "on_hold";
  notes?: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
};

export type IncomeSource = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  currency?: string;
  user_id: string;
  created_at: string;
};

export type MonthlySummary = {
  month: string;
  income: number;
  expenses: number;
  savings: number;
};

export type UserSettings = {
  home_currency: string;
  emergency_fund_goal?: number;
  emergency_fund_currency?: string;
  theme?: "light" | "dark";
  budget_enabled?: boolean;
  monthly_budget_amount?: number;
  budget_currency?: string;
};

export type ChartData = {
  date: string;
  income: number;
  expenses: number;
  savings: number;
};

