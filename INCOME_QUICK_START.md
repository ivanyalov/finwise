# Income Project System - Quick Start Guide

## 🎯 What You Got

A complete project-based income tracking system for freelancers and entrepreneurs!

## 📋 Before You Start

**Run the SQL migration first:**

1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `add_projects_table.sql`
4. Click "Run"

This creates the `projects` table and adds `project_id` to `transactions`.

## 🚀 Quick Walkthrough

### 1. Create Your First Project

```
Navigate to: /income
Click: "+ New Project"
Enter: Project name (e.g., "Acme Corp")
Select: Currency
Choose: Status (Active/Completed/On Hold)
Add: Notes (optional - rates, contact info, etc.)
Click: "Create Project"
```

### 2. Add Income to a Project

```
From main income page: Click on any project card
In project detail page: Click "+ Add Income"
Enter: Amount, date, description
Click: "Add Income"
```

The income automatically links to the project and updates the P&L.

### 3. Link Expenses to Projects

```
Navigate to: /expenses
Click: "+ Add Expense"
Fill in: Amount, category, date
Select: Project from "Link to Project" dropdown
Click: "Add Expense"
```

The expense now appears in the project's P&L and linked expenses section.

### 4. Track Project Profitability

Each project detail page shows:

- **Income**: All income for the selected month
- **Expenses**: All linked expenses
- **Net Profit**: Income minus expenses
- **Profit Margin**: Percentage of income kept as profit
- **6-Month Trend**: Visual chart of income over time

### 5. Manage Projects

**Edit Project:**
- Click menu (⋮) → "Edit Project"
- Update any field
- Click "Save Changes"

**Delete Project:**
- Click menu (⋮) → "Delete Project"
- Confirm deletion
- Transactions are unlinked but NOT deleted

**Edit Notes:**
- Scroll to "Project Notes" section
- Click "Edit"
- Add rates, deadlines, client info, etc.
- Click "Save Notes"

## 🎨 Visual Features

### Main Income Page
- **Project Cards**: Color-coded for easy identification
- **Monthly Income**: Shows current month per project
- **Trend Indicators**: Green ↑ or Red ↓ with percentage change
- **Total Income**: Sum across all projects at the top

### Project Detail Page
- **4-Card Dashboard**: Income, Expenses, Net Profit, Profit Margin
- **Bar Chart**: 6-month income trend
- **Transaction Lists**: Separate sections for income and expenses
- **Editable Notes**: Click-to-edit project information

## 💡 Pro Tips

1. **Project Status**: Use "Active" for current clients, "Completed" for finished projects, "On Hold" for paused work

2. **Notes Section**: Store everything you need:
   - Hourly/project rates
   - Contract terms
   - Client contact info
   - Deadlines and milestones
   - Invoice numbers

3. **Expense Linking**: Link expenses as you create them for accurate profit tracking

4. **Monthly Navigation**: Use the month selector to review historical data

5. **Color Coding**: Projects automatically get unique colors - helps you spot them quickly

## 📊 Understanding the Numbers

**Income**: Sum of all income transactions linked to this project

**Expenses**: Sum of all expenses linked to this project

**Net Profit**: Income - Expenses (can be negative)

**Profit Margin**: (Net Profit / Income) × 100%
- 50% margin = You keep half the income as profit
- 25% margin = Quarter of income is profit
- Negative = Expenses exceed income (loss)

**Percentage Change**: Compares current month to previous month
- +50% = Income increased by half
- -20% = Income decreased by a fifth

## 🔄 Monthly Workflow

**Start of Month:**
1. Navigate to /income
2. Review all project cards
3. Note which projects are active

**During Month:**
1. Add income as payments arrive
2. Link expenses to projects as they occur
3. Check P&L periodically

**End of Month:**
1. Review each project's profitability
2. Update project notes with new info
3. Set status to "Completed" for finished projects
4. Navigate to next month

## 🎯 Use Cases

**Freelancer with Multiple Clients:**
- Create a project per client
- Track income per client
- See which clients are most profitable

**Agency with Different Services:**
- Create a project per service type
- Compare profitability across services
- Identify your most profitable offerings

**Consultant with Projects:**
- Create a project per engagement
- Track project expenses (tools, travel, etc.)
- Calculate true profit per project

**Small Business with Product Lines:**
- Create a project per product/service
- Link related expenses
- Identify your profit leaders

## 🐛 Troubleshooting

**Projects not showing:**
- Make sure you ran the SQL migration
- Check browser console for errors
- Refresh the page

**Expenses not appearing in P&L:**
- Ensure expense is linked to the project
- Check that you're viewing the correct month
- Verify the expense date matches the selected month

**Can't create project:**
- Check Supabase connection
- Verify RLS policies are enabled
- Ensure user is authenticated

## 📱 Responsive Design

- **Desktop**: 3-4 project cards per row
- **Tablet**: 2 cards per row
- **Mobile**: Stacked single column
- All features work on all screen sizes

## 🌓 Dark Mode

Fully supports dark mode:
- Automatically detects system preference
- Can be toggled in settings
- All project features styled for both modes

## 🔐 Security

- **Row Level Security (RLS)**: Users only see their own projects
- **Cascade Delete**: Deleting user deletes their projects
- **Set NULL**: Deleting project unlinks transactions (doesn't delete them)

## 🎉 You're Ready!

Start creating projects and tracking income like a pro. Your financial clarity awaits!

---

**Need help?** Check `INCOME_PROJECT_SYSTEM.md` for detailed technical information.


