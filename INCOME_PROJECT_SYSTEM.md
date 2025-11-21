# Income Project-Based Tracking System

## Overview

The income page has been completely rebuilt to organize income by projects/clients. This allows freelancers and entrepreneurs to track income, expenses, and profitability per project.

## Features Implemented

### 1. Main Income Page (`/income`)
- **Project Cards Grid**: Beautiful card-based layout showing all projects
- **Monthly Navigation**: Navigate between months to see historical data
- **Total Income Display**: Shows total income across all projects for the selected month
- **Project Metrics**: Each card shows:
  - Project name and status
  - Monthly income in project currency
  - Percentage change vs previous month (with trend indicators)
- **Empty State**: Friendly prompt to create first project when none exist
- **Color Coding**: Each project card has a unique subtle color for quick identification

### 2. Project Detail Page (`/income/project/[id]`)
- **P&L Dashboard**: 4-card overview showing:
  - Total Income
  - Total Expenses (linked to project)
  - Net Profit
  - Profit Margin %
- **Monthly Trend Chart**: Visual bar chart showing last 6 months of income
- **Income Transactions**: List of all income for the selected month
- **Linked Expenses**: Shows expenses associated with this project
- **Project Notes**: Editable notes section for rates, deadlines, client contact, etc.
- **Edit/Delete Project**: Full project management capabilities

### 3. Project Management
- **Create Project**: Modal with fields for name, currency, status, and notes
- **Edit Project**: Update all project details
- **Delete Project**: Safely delete projects (transactions are unlinked, not deleted)
- **Project Status**: Active, Completed, or On Hold

### 4. Income Transactions
- **Add Income**: Link income transactions directly to projects
- **Auto-fill Project**: When adding from project detail page, project is auto-selected
- **Delete Transactions**: Remove income transactions with confirmation
- **Transaction Details**: View full transaction information

### 5. Expense Linking
- Expenses can be linked to projects for P&L calculation
- View all linked expenses in project detail page
- Calculate accurate profit margins per project

## Database Changes

### New Table: `projects`
```sql
- id (UUID, Primary Key)
- name (Text, Required)
- currency (Text, Default: 'USD')
- status (Text, Options: active, completed, on_hold)
- notes (Text, Optional)
- user_id (UUID, Foreign Key)
- created_at (Timestamp)
- updated_at (Timestamp)
```

### Updated Table: `transactions`
```sql
- project_id (UUID, Optional, Foreign Key to projects)
```

## Setup Instructions

### 1. Run the SQL Migration

You need to run the SQL migration to create the projects table and add the project_id column:

```bash
# Option 1: Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Open the file: add_projects_table.sql
4. Run the entire script

# Option 2: Via Supabase CLI (if installed)
supabase db push
```

The migration file (`add_projects_table.sql`) includes:
- Projects table creation
- project_id column addition to transactions
- Row Level Security (RLS) policies
- Indexes for performance
- Automatic updated_at trigger

### 2. Test the Application

```bash
# Start the development server
npm run dev
```

Navigate to `/income` to see the new project-based income system.

## User Flow

### Creating Your First Project
1. Go to `/income`
2. Click "New Project" button
3. Enter project name (e.g., "Acme Corp", "Website Redesign")
4. Select currency and status
5. Optionally add notes
6. Click "Create Project"

### Adding Income to a Project
1. Click on a project card from main income page
2. In project detail page, click "Add Income"
3. Enter amount, date, and description
4. Income is automatically linked to the project
5. Transaction appears in the income list and updates P&L

### Viewing Project Profitability
1. Open any project detail page
2. Top section shows 4 key metrics:
   - Income (green)
   - Expenses (red)
   - Net Profit (blue)
   - Profit Margin % (purple)
3. Scroll down to see monthly trend chart
4. Review individual transactions and linked expenses

### Linking Expenses to Projects
When adding an expense, you can now link it to a project:
1. Go to Expenses page
2. Click "Add Expense"
3. Fill in amount, currency, category, date, and notes
4. In "Link to Project" dropdown, select a project (or "No project")
5. Submit the expense

The expense will now appear in the project's detail page under "Linked Expenses" and will be included in the P&L calculations.

### Managing Projects
- **Edit**: Click menu (three dots) → "Edit Project"
- **Delete**: Click menu → "Delete Project" → Confirm
- **Update Notes**: Click "Edit" in Notes section → Save

## Data Model

### Project Colors
Projects are automatically assigned colors from a predefined palette for visual distinction:
- Indigo
- Purple
- Blue
- Green
- Yellow
- Pink

Colors rotate based on project index in the list.

### Calculations

**Monthly Income**: Sum of all income transactions with matching project_id in selected month

**Monthly Expenses**: Sum of all expense transactions with matching project_id in selected month

**Net Profit**: Income - Expenses

**Profit Margin**: (Net Profit / Income) × 100

**Percentage Change**: ((Current Month - Previous Month) / Previous Month) × 100

### Month Navigation
- Uses the existing month navigation pattern
- All data (P&L, transactions, trends) updates based on selected month
- "Current Month" button to quickly return to present

## Technical Details

### State Management
- Uses Zustand store (`useStore`)
- New state: `projects` array
- New actions: `setProjects`, `addProject`, `updateProject`, `deleteProject`

### Type System
- New type: `Project` in `lib/types.ts`
- Updated type: `Transaction` with optional `project_id`

### API Calls
- All project CRUD operations use Supabase client
- RLS policies ensure users only see their own projects
- Cascade delete: Deleting user → deletes their projects
- Set NULL: Deleting project → unlinks transactions (sets project_id to NULL)

## Styling

- Maintains existing glassmorphism design
- Card-based layouts for scanability
- Color-coded metrics (green for income, red for expenses, blue for profit)
- Hover effects and transitions for interactivity
- Responsive grid layout (3-4 cards on desktop, stacked on mobile)
- Dark mode support throughout

## Future Enhancements

Consider adding:
1. **Project Selector in Expense Form**: Add dropdown to link expenses directly when creating
2. **Project Archive**: Filter to show/hide completed projects
3. **Project Tags**: Categorize projects (client type, industry, etc.)
4. **Recurring Income**: Set up recurring transactions per project
5. **Project Templates**: Duplicate project settings for similar clients
6. **Export Reports**: PDF/CSV export of project P&L
7. **Multi-Currency Conversion**: Convert all project income to home currency for total
8. **Budget per Project**: Set income targets and track progress
9. **Time Tracking**: Link time entries to projects (for hourly work)
10. **Invoice Integration**: Generate invoices directly from projects

## Navigation

The existing side navigation panel remains unchanged. Users can still access:
- Dashboard
- Expenses
- Income (now with project-based view)
- Savings
- Settings

## Compatibility

This update is backward compatible:
- Existing income transactions without project_id still work
- They simply won't appear in any project's detail page
- Users can optionally link old transactions to projects later

## Support

If you encounter any issues:
1. Check browser console for errors
2. Verify SQL migration ran successfully
3. Ensure Supabase RLS policies are active
4. Check that transactions and projects tables exist
5. Verify user authentication is working

## Files Modified/Created

### Created:
- `add_projects_table.sql` - Database migration
- `app/(app)/income/project/[id]/page.tsx` - Project detail page
- `INCOME_PROJECT_SYSTEM.md` - This documentation

### Modified:
- `lib/types.ts` - Added Project type, updated Transaction type
- `lib/store/useStore.ts` - Added projects state and actions
- `app/(app)/income/page.tsx` - Completely rebuilt with project cards
- `app/(app)/expenses/page.tsx` - Added project linking to expense form

---

**Ready to track income like a pro!** 🚀

