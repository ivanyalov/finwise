"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  getMonthYear,
  calculateConvertedAmount,
} from "@/lib/utils";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  FolderOpen,
  ArrowRight,
} from "lucide-react";

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "CNY", label: "CNY (¥)" },
  { value: "INR", label: "INR (₹)" },
];

const PROJECT_COLORS = [
  "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
  "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
  "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  "bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800",
];

export default function IncomePage() {
  const router = useRouter();
  const {
    user,
    homeCurrency,
    transactions,
    projects,
    setUser,
    setProjects,
    setLoading,
  } = useStore();

  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Form state for creating project
  const [projectName, setProjectName] = useState("");
  const [projectCurrency, setProjectCurrency] = useState("USD");
  const [projectStatus, setProjectStatus] = useState<"active" | "completed" | "on_hold">("active");
  const [projectNotes, setProjectNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUserAndData();
  }, []);

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
        setProjects(projectsData);
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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!projectName.trim()) {
        setError("Please enter a project name");
        return;
      }

      const { data: newProject, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: projectName,
          currency: projectCurrency,
          status: projectStatus,
          notes: projectNotes || null,
          user_id: user?.id,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      if (newProject) {
        useStore.getState().addProject(newProject);
      }

      // Reset form
      setProjectName("");
      setProjectCurrency("USD");
      setProjectStatus("active");
      setProjectNotes("");
      setIsCreateProjectModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateProjectIncome = (projectId: string, month: Date) => {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    return transactions
      .filter((t) => t.type === "income" && t.project_id === projectId)
      .filter((t) => {
        const transactionDate = new Date(t.date);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const calculatePreviousMonthIncome = (projectId: string, month: Date) => {
    const prevMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    return calculateProjectIncome(projectId, prevMonth);
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const calculateTotalIncome = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    return transactions
      .filter((t) => t.type === "income")
      .filter((t) => {
        const transactionDate = new Date(t.date);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
      })
      .reduce((sum, t) => {
        return sum + calculateConvertedAmount(t.amount, t.currency, homeCurrency);
      }, 0);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + (direction === "next" ? 1 : -1))
    );
  };

  const getProjectColor = (index: number) => {
    return PROJECT_COLORS[index % PROJECT_COLORS.length];
  };

  const totalIncome = calculateTotalIncome();

  return (
    <div className="min-h-screen p-8 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Income</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your projects and track income by client
              </p>
            </div>
            <Button
              onClick={() => setIsCreateProjectModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus size={20} />
              New Project
            </Button>
          </div>

          {/* Month Navigation and Total */}
          <div className="flex items-center justify-between p-6 rounded-2xl glass border-2 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
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

            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Income</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalIncome, homeCurrency)}
              </p>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
              <Briefcase size={48} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No projects yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first project to start tracking income by client
            </p>
            <Button
              onClick={() => setIsCreateProjectModalOpen(true)}
              className="inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Create First Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => {
              const currentIncome = calculateProjectIncome(project.id, currentMonth);
              const previousIncome = calculatePreviousMonthIncome(project.id, currentMonth);
              const percentageChange = calculatePercentageChange(currentIncome, previousIncome);
              const isPositive = percentageChange >= 0;

              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/income/project/${project.id}`)}
                  className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-xl ${getProjectColor(
                    index
                  )}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white dark:bg-gray-900/50">
                        <FolderOpen size={24} className="text-gray-700 dark:text-gray-300" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {project.name}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                          {project.status.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    <ArrowRight
                      size={20}
                      className="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                    />
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">This Month</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(currentIncome, project.currency)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPositive ? (
                      <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown size={16} className="text-red-600 dark:text-red-400" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        isPositive
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {percentageChange.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">vs last month</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Project Modal */}
        <Modal
          isOpen={isCreateProjectModalOpen}
          onClose={() => setIsCreateProjectModalOpen(false)}
          title="Create New Project"
        >
          <form onSubmit={handleCreateProject} className="space-y-4">
            <Input
              type="text"
              label="Project Name"
              placeholder="e.g., Acme Corp, Website Redesign"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
            />

            <Select
              label="Currency"
              options={CURRENCIES}
              value={projectCurrency}
              onChange={(value) => setProjectCurrency(value)}
            />

            <Select
              label="Status"
              options={[
                { value: "active", label: "Active" },
                { value: "completed", label: "Completed" },
                { value: "on_hold", label: "On Hold" },
              ]}
              value={projectStatus}
              onChange={(value) => setProjectStatus(value as "active" | "completed" | "on_hold")}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={projectNotes}
                onChange={(e) => setProjectNotes(e.target.value)}
                placeholder="Add project details, rates, deadlines, etc."
                className="w-full px-4 py-3 rounded-xl glass border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none transition-colors resize-none"
                rows={4}
              />
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Create Project
            </Button>
          </form>
        </Modal>
      </div>
    </div>
  );
}
