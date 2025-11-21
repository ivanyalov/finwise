"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useStore } from "@/lib/store/useStore";
import { Project, Transaction } from "@/lib/types";
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
  Edit2,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  FileText,
  Receipt,
  Link as LinkIcon,
  MoreVertical,
  Save,
  X,
  BarChart3,
} from "lucide-react";

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "CNY", label: "CNY (¥)" },
  { value: "INR", label: "INR (₹)" },
];

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const {
    user,
    homeCurrency,
    transactions,
    projects,
    expenseCategories,
    setUser,
    setLoading,
    addTransaction,
    updateProject,
    deleteProject,
  } = useStore();

  const [project, setProject] = useState<Project | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Edit project form
  const [editName, setEditName] = useState("");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [editStatus, setEditStatus] = useState<"active" | "completed" | "on_hold">("active");
  const [editNotes, setEditNotes] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Add income form
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeCurrency, setIncomeCurrency] = useState("USD");
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split("T")[0]);
  const [incomeDescription, setIncomeDescription] = useState("");
  const [isSubmittingIncome, setIsSubmittingIncome] = useState(false);

  // Notes editing
  const [tempNotes, setTempNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUserAndData();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      const foundProject = projects.find((p) => p.id === projectId);
      if (foundProject) {
        setProject(foundProject);
        setEditName(foundProject.name);
        setEditCurrency(foundProject.currency);
        setEditStatus(foundProject.status);
        setEditNotes(foundProject.notes || "");
        setTempNotes(foundProject.notes || "");
        setIncomeCurrency(foundProject.currency);
      } else {
        router.push("/income");
      }
    }
  }, [projects, projectId]);

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

      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (projectsError) {
        console.error("Error loading projects:", projectsError);
      } else if (projectsData) {
        useStore.setState({ projects: projectsData });
      }

      // Load expense categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (categoriesError) {
        console.error("Error loading categories:", categoriesError);
      } else if (categoriesData) {
        useStore.setState({ expenseCategories: categoriesData });
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

  const getMonthTransactions = (type: "income" | "expense") => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    return transactions
      .filter((t) => t.type === type && t.project_id === projectId)
      .filter((t) => {
        const transactionDate = new Date(t.date);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
      });
  };

  const calculateMonthIncome = () => {
    return getMonthTransactions("income").reduce((sum, t) => sum + t.amount, 0);
  };

  const calculateMonthExpenses = () => {
    return getMonthTransactions("expense").reduce((sum, t) => sum + t.amount, 0);
  };

  const calculateNetProfit = () => {
    return calculateMonthIncome() - calculateMonthExpenses();
  };

  const calculateProfitMargin = () => {
    const income = calculateMonthIncome();
    if (income === 0) return 0;
    return (calculateNetProfit() / income) * 100;
  };

  const getMonthlyTrendData = () => {
    const months = [];
    const currentDate = new Date();

    for (let i = 5; i >= 0; i--) {
      const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      const income = transactions
        .filter((t) => t.type === "income" && t.project_id === projectId)
        .filter((t) => {
          const transactionDate = new Date(t.date);
          return transactionDate >= monthStart && transactionDate <= monthEnd;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      months.push({
        month: month.toLocaleDateString("en-US", { month: "short" }),
        income,
      });
    }

    return months;
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmittingEdit(true);

    try {
      if (!editName.trim()) {
        setError("Please enter a project name");
        return;
      }

      const { data: updatedProject, error: updateError } = await supabase
        .from("projects")
        .update({
          name: editName,
          currency: editCurrency,
          status: editStatus,
          notes: editNotes || null,
        })
        .eq("id", projectId)
        .eq("user_id", user?.id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (updatedProject) {
        updateProject(projectId, updatedProject);
        setProject(updatedProject);
      }

      setIsEditProjectModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to update project");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteProject = async () => {
    setIsDeletingProject(true);

    try {
      const { error: deleteError } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)
        .eq("user_id", user?.id);

      if (deleteError) throw deleteError;

      deleteProject(projectId);
      router.push("/income");
    } catch (err: any) {
      console.error("Error deleting project:", err);
      alert("Failed to delete project");
    } finally {
      setIsDeletingProject(false);
    }
  };

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmittingIncome(true);

    try {
      if (!incomeAmount || parseFloat(incomeAmount) <= 0) {
        setError("Please enter a valid amount");
        return;
      }

      const { data: newTransaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          type: "income",
          amount: parseFloat(incomeAmount),
          currency: incomeCurrency,
          date: incomeDate,
          notes: incomeDescription || null,
          project_id: projectId,
          user_id: user?.id,
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      if (newTransaction) {
        addTransaction(newTransaction);
      }

      // Reset form
      setIncomeAmount("");
      setIncomeDate(new Date().toISOString().split("T")[0]);
      setIncomeDescription("");
      setIsAddIncomeModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to add income");
    } finally {
      setIsSubmittingIncome(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);

    try {
      const { data: updatedProject, error: updateError } = await supabase
        .from("projects")
        .update({ notes: tempNotes || null })
        .eq("id", projectId)
        .eq("user_id", user?.id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (updatedProject) {
        updateProject(projectId, updatedProject);
        setProject(updatedProject);
      }

      setIsEditingNotes(false);
    } catch (err: any) {
      console.error("Error saving notes:", err);
      alert("Failed to save notes");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId)
        .eq("user_id", user?.id);

      if (error) throw error;

      useStore.setState({
        transactions: transactions.filter((t) => t.id !== transactionId),
      });
    } catch (err: any) {
      console.error("Error deleting transaction:", err);
      alert("Failed to delete transaction");
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + (direction === "next" ? 1 : -1))
    );
  };

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading project...</p>
      </div>
    );
  }

  const monthIncome = calculateMonthIncome();
  const monthExpenses = calculateMonthExpenses();
  const netProfit = calculateNetProfit();
  const profitMargin = calculateProfitMargin();
  const incomeTransactions = getMonthTransactions("income");
  const linkedExpenses = getMonthTransactions("expense");
  const trendData = getMonthlyTrendData();
  const maxIncome = Math.max(...trendData.map((d) => d.income), 1);

  return (
    <div className="min-h-screen p-8 pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/income")}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            Back to Income
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
                <p className="text-gray-600 dark:text-gray-400 capitalize mt-1">
                  {project.status.replace("_", " ")} • {project.currency}
                </p>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <MoreVertical size={24} />
              </button>

              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-xl border-2 border-gray-200 dark:border-gray-700 z-20">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsEditProjectModalOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-t-xl"
                    >
                      <Edit2 size={18} />
                      <span>Edit Project</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsDeleteProjectModalOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-b-xl text-red-600 dark:text-red-400"
                    >
                      <Trash2 size={18} />
                      <span>Delete Project</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigateMonth("prev")}
            className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 py-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="text-lg font-semibold">{getMonthYear(currentMonth)}</span>
          </button>
          <button
            onClick={() => navigateMonth("next")}
            className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* P&L Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Income</p>
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(monthIncome, project.currency)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <Receipt className="text-red-600 dark:text-red-400" size={20} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Expenses</p>
              </div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(monthExpenses, project.currency)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <DollarSign className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Net Profit</p>
              </div>
              <p
                className={`text-2xl font-bold ${
                  netProfit >= 0
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {formatCurrency(netProfit, project.currency)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <BarChart3 className="text-purple-600 dark:text-purple-400" size={20} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Profit Margin</p>
              </div>
              <p
                className={`text-2xl font-bold ${
                  profitMargin >= 0
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {profitMargin.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend Chart */}
        <Card className="mb-8">
          <CardHeader title="Income Trend (Last 6 Months)" />
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-40">
              {trendData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex items-end justify-center h-32 mb-2">
                    <div
                      className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 dark:from-indigo-500 dark:to-indigo-300 rounded-t-lg transition-all duration-300 hover:opacity-80"
                      style={{
                        height: `${(data.income / maxIncome) * 100}%`,
                        minHeight: data.income > 0 ? "4px" : "0px",
                      }}
                      title={formatCurrency(data.income, project.currency)}
                    />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{data.month}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Transactions */}
          <Card>
            <CardHeader
              title="Income Transactions"
              action={
                <Button
                  onClick={() => setIsAddIncomeModalOpen(true)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Income
                </Button>
              }
            />
            <CardContent>
              {incomeTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No income transactions this month
                  </p>
                  <Button
                    onClick={() => setIsAddIncomeModalOpen(true)}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Income
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {incomeTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="p-4 rounded-xl glass hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {transaction.notes || "Income"}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(transaction.date)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-green-600 dark:text-green-400">
                            +{formatCurrency(transaction.amount, transaction.currency)}
                          </p>
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Trash2 size={16} className="text-gray-500 dark:text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Expenses */}
          <Card>
            <CardHeader title="Linked Expenses" />
            <CardContent>
              {linkedExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No linked expenses this month</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Link expenses to this project from the Expenses page
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedExpenses.map((transaction) => {
                    const categoryName =
                      expenseCategories.find((c) => c.id === transaction.category)?.name ||
                      "Expense";

                    return (
                      <div
                        key={transaction.id}
                        className="p-4 rounded-xl glass hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {categoryName}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(transaction.date)}
                              {transaction.notes && ` • ${transaction.notes}`}
                            </p>
                          </div>
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
        </div>

        {/* Project Notes */}
        <Card className="mt-6">
          <CardHeader
            title="Project Notes"
            action={
              !isEditingNotes && (
                <Button
                  onClick={() => setIsEditingNotes(true)}
                  size="sm"
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <Edit2 size={16} />
                  Edit
                </Button>
              )
            }
          />
          <CardContent>
            {isEditingNotes ? (
              <div className="space-y-3">
                <textarea
                  value={tempNotes}
                  onChange={(e) => setTempNotes(e.target.value)}
                  placeholder="Add project notes, rates, contract details, deadlines, client contact, etc."
                  className="w-full px-4 py-3 rounded-xl glass border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none transition-colors resize-none"
                  rows={6}
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSaveNotes}
                    isLoading={isSavingNotes}
                    className="flex items-center gap-2"
                  >
                    <Save size={16} />
                    Save Notes
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditingNotes(false);
                      setTempNotes(project.notes || "");
                    }}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <X size={16} />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {project.notes ? (
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {project.notes}
                  </p>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic">
                    No notes yet. Click "Edit" to add project notes.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Project Modal */}
        <Modal
          isOpen={isEditProjectModalOpen}
          onClose={() => setIsEditProjectModalOpen(false)}
          title="Edit Project"
        >
          <form onSubmit={handleEditProject} className="space-y-4">
            <Input
              type="text"
              label="Project Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />

            <Select
              label="Currency"
              options={CURRENCIES}
              value={editCurrency}
              onChange={(value) => setEditCurrency(value)}
            />

            <Select
              label="Status"
              options={[
                { value: "active", label: "Active" },
                { value: "completed", label: "Completed" },
                { value: "on_hold", label: "On Hold" },
              ]}
              value={editStatus}
              onChange={(value) => setEditStatus(value as "active" | "completed" | "on_hold")}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add project details, rates, deadlines, etc."
                className="w-full px-4 py-3 rounded-xl glass border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none transition-colors resize-none"
                rows={4}
              />
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <Button type="submit" className="w-full" isLoading={isSubmittingEdit}>
              Save Changes
            </Button>
          </form>
        </Modal>

        {/* Delete Project Modal */}
        <Modal
          isOpen={isDeleteProjectModalOpen}
          onClose={() => setIsDeleteProjectModalOpen(false)}
          title="Delete Project"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                ⚠️ Warning: This action cannot be undone
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Delete "{project.name}"? Income transactions will be unlinked from this project but
                not deleted.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsDeleteProjectModalOpen(false)}
                className="flex-1"
                disabled={isDeletingProject}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteProject}
                className="flex-1 bg-red-600 hover:bg-red-700"
                isLoading={isDeletingProject}
              >
                Delete Project
              </Button>
            </div>
          </div>
        </Modal>

        {/* Add Income Modal */}
        <Modal
          isOpen={isAddIncomeModalOpen}
          onClose={() => setIsAddIncomeModalOpen(false)}
          title="Add Income"
        >
          <form onSubmit={handleAddIncome} className="space-y-4">
            <Input
              type="number"
              label="Amount"
              placeholder="0.00"
              value={incomeAmount}
              onChange={(e) => setIncomeAmount(e.target.value)}
              required
              step="0.01"
              min="0"
            />

            <Select
              label="Currency"
              options={CURRENCIES}
              value={incomeCurrency}
              onChange={(value) => setIncomeCurrency(value)}
            />

            <Input
              type="date"
              label="Date"
              value={incomeDate}
              onChange={(e) => setIncomeDate(e.target.value)}
              required
            />

            <Input
              type="text"
              label="Description (optional)"
              placeholder="e.g., Invoice #123, Milestone payment"
              value={incomeDescription}
              onChange={(e) => setIncomeDescription(e.target.value)}
            />

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <Button type="submit" className="w-full" isLoading={isSubmittingIncome}>
              Add Income
            </Button>
          </form>
        </Modal>
      </div>
    </div>
  );
}


