# Quick Setup Checklist - Expenses Upgrade

## ⚡ 3-Step Setup

### Step 1: Database Migration (Required)
Open your Supabase SQL Editor and run:
```sql
ALTER TABLE user_settings 
ADD COLUMN budget_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN monthly_budget_amount DECIMAL(10, 2),
ADD COLUMN budget_currency TEXT;

UPDATE user_settings SET budget_enabled = FALSE WHERE budget_enabled IS NULL;
```

### Step 2: Update Settings Page (Required)
Open `app/(app)/settings/page.tsx` and make these changes:

**2.1 - Add state variables (after line 53):**
```typescript
// Budget tracking state
const [budgetEnabled, setBudgetEnabled] = useState(false);
const [budgetAmount, setBudgetAmount] = useState("");
const [budgetCurrency, setBudgetCurrency] = useState("USD");
```

**2.2 - Load budget settings (in loadUserAndData, add to settingsData if block):**
```typescript
setBudgetEnabled(settingsData.budget_enabled || false);
setBudgetAmount(settingsData.monthly_budget_amount?.toString() || "");
setBudgetCurrency(settingsData.budget_currency || settingsData.home_currency || "USD");
```

**2.3 - Copy the three handler functions and the Monthly Budget Card JSX from `EXPENSES_UPGRADE.md`**

### Step 3: Test
```bash
npm run dev
```

1. Go to Settings
2. Enable "Monthly Budget Tracking"
3. Set a budget amount (e.g., 5000)
4. Go to Expenses page
5. Toggle between "Transactions" and "Categories" views
6. Click on a category in Categories view

## ✅ What's Already Done
- ✅ Expenses page - completely redesigned
- ✅ Type definitions updated
- ✅ CSS animations added
- ✅ Database migration SQL created

## 🎯 Expected Result
- Budget card appears at top of Expenses page (when enabled)
- Two-mode view toggle (Transactions / Categories)
- Categories view shows horizontal bar charts
- Clicking categories filters transactions
- Smooth animations throughout
- Color-coded budget progress

## 📚 Full Documentation
See `EXPENSES_UPGRADE.md` for complete details, code examples, and feature descriptions.

## 🔧 Files Modified
- ✅ `add_budget_tracking.sql` (created)
- ✅ `lib/types.ts` (updated)
- ✅ `app/(app)/expenses/page.tsx` (redesigned)
- ✅ `app/globals.css` (animations added)
- ⚠️ `app/(app)/settings/page.tsx` (needs your update)

## 💡 Backup Files Created
- `app/(app)/settings/page.tsx.backup`
- `app/(app)/expenses/page.tsx.backup`

Restore these if you need to revert changes.

