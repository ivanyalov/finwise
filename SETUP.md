# Finwise - Setup Guide

## Quick Start Checklist

### 1. ✅ Install Dependencies
```bash
npm install
```

### 2. ⚙️ Supabase Setup

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → API
4. Copy Project URL and Anon Key

**IMPORTANT: Configure Authentication URLs**
5. Go to Authentication → URL Configuration
6. Set **Site URL**: 
   - Local: `http://localhost:3000`
   - Production: `https://your-app.vercel.app`
7. Add **Redirect URLs** (one per line):
   - `http://localhost:3000/**`
   - `https://your-app.vercel.app/**`

### 3. 🗄️ Database Setup

In Supabase SQL Editor, run the complete schema from README.md:

- Creates `transactions` table with RLS policies
- Creates `income_sources` table
- Creates `expense_categories` table  
- Creates `user_settings` table
- Sets up indexes for performance
- Enables Row Level Security

### 4. 🔐 Environment Variables

Create `.env.local` in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. 🚀 Run Development Server

```bash
npm run dev
# npm run build
```

Visit http://localhost:3000

## Features Implemented

### ✅ Authentication
- Signup page with email/password
- Login page
- Auto-redirect based on auth state
- Middleware protection

### ✅ Dashboard
- Available balance calculation
- Total savings display
- Monthly income/expenses with comparison
- Recent transactions list
- Month-over-month percentage changes

### ✅ Income Tracking
- Add income with modal (2 clicks)
- Currency dropdown (6 currencies supported)
- Month navigation
- Filter by source and currency
- Totals per currency + converted total
- Auto-create income sources

### ✅ Expense Tracking  
- Add expense with modal (2 clicks)
- Currency dropdown
- Month navigation
- Filter by category and currency
- Totals per currency + converted total
- Auto-create expense categories

### ✅ Savings
- Move to/from savings (3 clicks)
- Emergency fund goal tracker with progress bar
- Transaction history
- Visual progress indicators

### ✅ Settings
- Home currency selection
- Manage income sources (add/edit/delete)
- Manage expense categories (add/edit/delete)
- Inline editing

### ✅ Design System
- Glassmorphism UI throughout
- Minimalist aesthetic
- Responsive mobile-first design
- Dark mode support
- Smooth transitions and animations
- Bottom navigation bar

## Tech Stack Summary

- **Next.js 16** - App Router, Server Components
- **TypeScript** - Full type safety
- **Tailwind CSS 4** - Utility-first styling
- **Supabase** - Auth + PostgreSQL
- **Zustand** - State management
- **Lucide React** - Icons
- **Recharts** - Charts (dependency added)

## Key Files

### Pages
- `app/(app)/dashboard/page.tsx` - Main dashboard
- `app/(app)/income/page.tsx` - Income tracking
- `app/(app)/expenses/page.tsx` - Expense tracking
- `app/(app)/savings/page.tsx` - Savings management
- `app/(app)/settings/page.tsx` - Settings & categories
- `app/(auth)/login/page.tsx` - Login
- `app/(auth)/signup/page.tsx` - Signup

### Components
- `components/Navigation.tsx` - Bottom nav
- `components/ui/*` - Reusable UI components

### State & Utils
- `lib/store/useStore.ts` - Zustand store
- `lib/types.ts` - TypeScript types
- `lib/utils.ts` - Utility functions
- `lib/supabase/*` - Supabase clients

## Testing the App

1. **Signup** → Create new account
2. **Settings** → Set home currency
3. **Income** → Add some income sources and records
4. **Expenses** → Add expense categories and records
5. **Savings** → Move money to savings
6. **Dashboard** → View financial overview

## Troubleshooting

### Supabase Connection Issues
- Verify `.env.local` has correct values
- Check Supabase project is active
- Ensure RLS policies are set

### Build Errors
- Run `npm install` again
- Clear `.next` folder: `rm -rf .next`
- Rebuild: `npm run build`

### Authentication Redirect Loop
- Check middleware.ts is present
- Verify Supabase auth is enabled
- Clear browser cookies

### Email Confirmation Not Working
If you get "requested path is invalid" when clicking email links:
- Go to Supabase → Authentication → URL Configuration
- Set **Site URL** to your app URL (e.g., `https://your-app.vercel.app`)
- Add **Redirect URLs**: `https://your-app.vercel.app/**`
- Make sure the `/app/auth/callback/route.ts` file exists

## Next Steps for Production

1. ✅ Add error boundaries
2. Add loading skeletons
3. Implement charts (Recharts ready)
4. Add month-to-month comparison charts
5. Integrate real-time exchange rates
6. Add data export (CSV/PDF)
7. Implement offline support
8. Add push notifications
9. Set up CI/CD
10. Deploy to Vercel

## Support

For issues or questions, check:
- README.md for general info
- Supabase docs: https://supabase.com/docs
- Next.js docs: https://nextjs.org/docs

