# 🚀 Finwise - Quick Start Guide

## Get Running in 5 Minutes

### Step 1: Create Environment File

Create `.env.local` in the project root:

```bash
touch .env.local
```

Add these lines (replace with your Supabase credentials):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 2: Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project
3. Go to SQL Editor
4. Copy and run the complete SQL schema from `README.md` (lines 49-125)
5. Get your credentials from Settings → API

### Step 3: Install & Run

```bash
# Already done: npm install

# Start development server
npm run dev
```

Visit **http://localhost:3000**

### Step 4: Test the App

1. Click "Sign up" on the login screen
2. Create an account
3. You'll be redirected to Dashboard
4. Go to Settings → Set your home currency
5. Try adding income and expenses
6. Move money to savings

## What's Built

✅ **5 Main Pages** - Dashboard, Income, Expenses, Savings, Settings  
✅ **Authentication** - Login and Signup with Supabase  
✅ **Multi-Currency** - Support for 6 currencies with conversion  
✅ **Glassmorphism UI** - Beautiful modern design  
✅ **Mobile Responsive** - Works on all devices  
✅ **Dark Mode** - Automatic theme support  
✅ **3-Click Actions** - Quick add/edit/delete  

## Project Structure

```
fintechapp1/
├── app/
│   ├── (app)/          # Main app (dashboard, income, etc.)
│   ├── (auth)/         # Login/signup
│   └── layout.tsx      # Root layout
├── components/         # UI components
├── lib/               # Utils, store, supabase
└── middleware.ts      # Auth protection
```

## Common Issues

**Can't connect to Supabase?**
→ Check `.env.local` has correct values from Supabase dashboard

**Build errors?**
→ Delete `.next` folder and run `npm run dev` again

**Auth redirect loop?**
→ Clear browser cookies and try again

## Next Steps

See `SETUP.md` for detailed information and `README.md` for full documentation.

Happy tracking! 💰

