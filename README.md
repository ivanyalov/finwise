# Finwise - Personal Finance Manager

A beautiful, modern personal finance management app with multi-currency support, built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- 🔐 **User Authentication** - Secure signup and login
- 💰 **Income Tracking** - Record and categorize income sources
- 💸 **Expense Tracking** - Track spending by category
- 🏦 **Savings Management** - Move money to/from savings, track emergency fund
- 🌍 **Multi-Currency Support** - Track finances in multiple currencies with automatic conversion
- 📊 **Dashboard** - Visual overview of your financial health
- ⚙️ **Customizable** - Manage income sources and expense categories
- 🎨 **Glassmorphism Design** - Modern, clean UI with beautiful visual effects

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Backend:** Supabase (Authentication + PostgreSQL)
- **Charts:** Recharts
- **State Management:** Zustand
- **Icons:** Lucide React

## Prerequisites

- Node.js 18+ installed
- A Supabase account ([sign up here](https://supabase.com))

## Setup Instructions

### 1. Clone and Install

```bash
# Install dependencies
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your:
   - Project URL
   - Anon (public) key

3. Run the following SQL in your Supabase SQL Editor to create the database schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'savings_transfer')),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  source TEXT,
  category TEXT,
  transfer_type TEXT CHECK (transfer_type IN ('to_savings', 'from_savings')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create income_sources table
CREATE TABLE income_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expense_categories table
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_settings table
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  home_currency TEXT NOT NULL DEFAULT 'USD',
  emergency_fund_goal DECIMAL(10, 2),
  emergency_fund_currency TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_income_sources_user_id ON income_sources(user_id);
CREATE INDEX idx_expense_categories_user_id ON expense_categories(user_id);

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for income_sources
CREATE POLICY "Users can manage own income sources" ON income_sources
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for expense_categories
CREATE POLICY "Users can manage own expense categories" ON expense_categories
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for user_settings
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
fintechapp1/
├── app/
│   ├── (app)/              # Main app routes (dashboard, income, etc.)
│   │   ├── dashboard/
│   │   ├── income/
│   │   ├── expenses/
│   │   ├── savings/
│   │   └── settings/
│   ├── (auth)/             # Authentication routes
│   │   ├── login/
│   │   └── signup/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page (redirects)
│   └── globals.css         # Global styles
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Select.tsx
│   └── Navigation.tsx      # Bottom navigation
├── lib/
│   ├── store/              # Zustand state management
│   ├── supabase/           # Supabase client setup
│   ├── types.ts            # TypeScript types
│   └── utils.ts            # Utility functions
└── public/                 # Static assets
```

## Design Principles

- **Glassmorphism** - Modern glass effect with backdrop blur
- **Minimalist** - Clean, uncluttered interface
- **3-Click Rule** - Primary actions completable in 3 clicks or less
- **Mobile-First** - Responsive design for all devices
- **Accessibility** - WCAG compliant components

## Currency Support

Currently supports:
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- JPY (Japanese Yen)
- CNY (Chinese Yuan)
- INR (Indian Rupee)

Exchange rates are static and can be updated in `lib/utils.ts` or integrated with a real-time API.

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## License

MIT
