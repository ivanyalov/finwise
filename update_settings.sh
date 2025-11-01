#!/bin/bash

# Script to update Settings page with Budget Tracking feature
# This adds the budget tracking code to your Settings page automatically

SETTINGS_FILE="app/(app)/settings/page.tsx"
BACKUP_FILE="app/(app)/settings/page.tsx.manual_backup"

echo "🔧 Updating Settings page with Budget Tracking..."

# Create backup
cp "$SETTINGS_FILE" "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"

# Create the updated file
cat > "$SETTINGS_FILE" << 'EOF'
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useStore } from "@/lib/store/useStore";
import { useTheme } from "@/lib/hooks/useTheme";
import { IncomeSource, ExpenseCategory } from "@/lib/types";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Settings as SettingsIcon, Trash2, Edit2, LogOut } from "lucide-react";

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "CNY", label: "CNY (¥)" },
  { value: "INR", label: "INR (₹)" },
];

const THEMES = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

export default function SettingsPage() {
  const router = useRouter();
  const {
    user,
    homeCurrency,
    incomeSources,
    expenseCategories,
    setUser,
    setIncomeSources,
    setExpenseCategories,
    setHomeCurrency,
    setTheme: setStoreTheme,
    setLoading,
  } = useStore();

  const { theme, setTheme } = useTheme();

  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Budget tracking state
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState("USD");

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

      // Load income sources
      const { data: sourcesData } = await supabase
        .from("income_sources")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (sourcesData) {
        setIncomeSources(sourcesData);
      }

      // Load expense categories
      const { data: categoriesData } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (categoriesData) {
        setExpenseCategories(categoriesData);
      }

      // Load settings
      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (settingsData) {
        setHomeCurrency(settingsData.home_currency || "USD");
        if (settingsData.theme) {
          setStoreTheme(settingsData.theme as "light" | "dark");
        }
        // Load budget settings
        setBudgetEnabled(settingsData.budget_enabled || false);
        setBudgetAmount(settingsData.monthly_budget_amount?.toString() || "");
        setBudgetCurrency(settingsData.budget_currency || settingsData.home_currency || "USD");
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = async (currency: string) => {
    if (!user?.id) {
      console.error("Cannot update currency: User not authenticated");
      return;
    }

    try {
      setHomeCurrency(currency);

      const { error } = await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            home_currency: currency,
          },
          {
            onConflict: "user_id",
          }
        );

      if (error) throw error;
    } catch (err: any) {
      console.error("Error updating currency:", err.message || err);
    }
  };

  const handleBudgetEnabledChange = async (enabled: boolean) => {
    if (!user?.id) return;

    try {
      setBudgetEnabled(enabled);

      const { error } = await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            budget_enabled: enabled,
            monthly_budget_amount: enabled && budgetAmount ? parseFloat(budgetAmount) : null,
            budget_currency: enabled ? budgetCurrency : null,
          },
          {
            onConflict: "user_id",
          }
        );

      if (error) throw error;
    } catch (err: any) {
      console.error("Error updating budget enabled:", err.message || err);
    }
  };

  const handleBudgetAmountChange = async (amount: string) => {
    if (!user?.id) return;

    try {
      setBudgetAmount(amount);

      if (budgetEnabled && amount && parseFloat(amount) > 0) {
        const { error } = await supabase
          .from("user_settings")
          .upsert(
            {
              user_id: user.id,
              monthly_budget_amount: parseFloat(amount),
            },
            {
              onConflict: "user_id",
            }
          );

        if (error) throw error;
      }
    } catch (err: any) {
      console.error("Error updating budget amount:", err.message || err);
    }
  };

  const handleBudgetCurrencyChange = async (currency: string) => {
    if (!user?.id) return;

    try {
      setBudgetCurrency(currency);

      if (budgetEnabled) {
        const { error } = await supabase
          .from("user_settings")
          .upsert(
            {
              user_id: user.id,
              budget_currency: currency,
            },
            {
              onConflict: "user_id",
            }
          );

        if (error) throw error;
      }
    } catch (err: any) {
      console.error("Error updating budget currency:", err.message || err);
    }
  };

  const handleSaveSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!name.trim()) {
        setError("Please enter a valid name");
        return;
      }

      if (editingSource) {
        const { error } = await supabase
          .from("income_sources")
          .update({ name: name.trim() })
          .eq("id", editingSource.id);

        if (error) throw error;

        setIncomeSources(
          incomeSources.map((s) => (s.id === editingSource.id ? { ...s, name: name.trim() } : s))
        );
      } else {
        const { data, error } = await supabase
          .from("income_sources")
          .insert({ name: name.trim(), user_id: user?.id })
          .select()
          .single();

        if (error) throw error;

        setIncomeSources([...incomeSources, data]);
      }

      setName("");
      setEditingSource(null);
      setIsSourceModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to save income source");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm("Are you sure you want to delete this income source?")) return;

    try {
      const { error } = await supabase.from("income_sources").delete().eq("id", id);

      if (error) throw error;

      setIncomeSources(incomeSources.filter((s) => s.id !== id));
    } catch (err: any) {
      console.error("Error deleting income source:", err);
    }
  };

  const handleEditSource = (source: IncomeSource) => {
    setEditingSource(source);
    setName(source.name);
    setIsSourceModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!name.trim()) {
        setError("Please enter a valid name");
        return;
      }

      if (editingCategory) {
        const { error } = await supabase
          .from("expense_categories")
          .update({ name: name.trim() })
          .eq("id", editingCategory.id);

        if (error) throw error;

        setExpenseCategories(
          expenseCategories.map((c) =>
            c.id === editingCategory.id ? { ...c, name: name.trim() } : c
          )
        );
      } else {
        const { data, error } = await supabase
          .from("expense_categories")
          .insert({ name: name.trim(), user_id: user?.id })
          .select()
          .single();

        if (error) throw error;

        setExpenseCategories([...expenseCategories, data]);
      }

      setName("");
      setEditingCategory(null);
      setIsCategoryModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to save expense category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const { error } = await supabase.from("expense_categories").delete().eq("id", id);

      if (error) throw error;

      setExpenseCategories(expenseCategories.filter((c) => c.id !== id));
    } catch (err: any) {
      console.error("Error deleting category:", err);
    }
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setName(category.name);
    setIsCategoryModalOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleModalClose = () => {
    setName("");
    setEditingSource(null);
    setEditingCategory(null);
    setIsSourceModalOpen(false);
    setIsCategoryModalOpen(false);
  };

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-3">
            <SettingsIcon size={32} />
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your preferences and categories
          </p>
        </div>

        {/* Theme */}
        <Card className="mb-6">
          <CardHeader title="Theme" subtitle="Choose your preferred color scheme" />
          <CardContent>
            <Select
              options={THEMES}
              value={theme}
              onChange={(e) => setTheme(e.target.value as "light" | "dark")}
            />
          </CardContent>
        </Card>

        {/* Home Currency */}
        <Card className="mb-6">
          <CardHeader title="Home Currency" subtitle="Default currency for conversions" />
          <CardContent>
            <Select
              options={CURRENCIES}
              value={homeCurrency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Monthly Budget */}
        <Card className="mb-6">
          <CardHeader title="Monthly Budget" subtitle="Track your spending against a monthly budget" />
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl glass-hover">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Enable monthly budget tracking</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Display budget progress on the Expenses page
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={budgetEnabled}
                    onChange={(e) => handleBudgetEnabledChange(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {budgetEnabled && (
                <div className="space-y-4 animate-fadeIn">
                  <Input
                    type="number"
                    label="Monthly Budget Amount"
                    placeholder="e.g., 5000"
                    value={budgetAmount}
                    onChange={(e) => handleBudgetAmountChange(e.target.value)}
                    step="0.01"
                    min="0"
                  />
                  <Select
                    label="Budget Currency"
                    options={CURRENCIES}
                    value={budgetCurrency}
                    onChange={(e) => handleBudgetCurrencyChange(e.target.value)}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Income Sources */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Income Sources
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage your income categories
              </p>
            </div>
            <Button onClick={() => setIsSourceModalOpen(true)} size="sm">
              Add Source
            </Button>
          </div>
          <CardContent>
            {incomeSources.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                No income sources yet
              </p>
            ) : (
              <div className="space-y-2">
                {incomeSources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-4 rounded-2xl glass-hover"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">{source.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditSource(source)}
                        className="p-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Edit2 size={16} className="text-indigo-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteSource(source.id)}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Expense Categories
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage your spending categories
              </p>
            </div>
            <Button onClick={() => setIsCategoryModalOpen(true)} size="sm">
              Add Category
            </Button>
          </div>
          <CardContent>
            {expenseCategories.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                No categories yet
              </p>
            ) : (
              <div className="space-y-2">
                {expenseCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-4 rounded-2xl glass-hover"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">
                      {category.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="p-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Edit2 size={16} className="text-indigo-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logout Section */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                  Account
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sign out of your account
                </p>
              </div>
              <Button
                variant="danger"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut size={18} />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Income Source Modal */}
        <Modal
          isOpen={isSourceModalOpen}
          onClose={handleModalClose}
          title={editingSource ? "Edit Income Source" : "Add Income Source"}
        >
          <form onSubmit={handleSaveSource} className="space-y-4">
            <Input
              type="text"
              label="Name"
              placeholder="e.g., Salary, Freelance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              {editingSource ? "Update" : "Add"} Source
            </Button>
          </form>
        </Modal>

        {/* Add/Edit Expense Category Modal */}
        <Modal
          isOpen={isCategoryModalOpen}
          onClose={handleModalClose}
          title={editingCategory ? "Edit Expense Category" : "Add Expense Category"}
        >
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <Input
              type="text"
              label="Name"
              placeholder="e.g., Food, Transport, Bills"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              {editingCategory ? "Update" : "Add"} Category
            </Button>
          </form>
        </Modal>
      </div>
    </div>
  );
}
EOF

echo ""
echo "✅ Settings page updated successfully!"
echo ""
echo "The budget tracking feature has been added to your Settings page."
echo "A backup of the original file was saved to: $BACKUP_FILE"

