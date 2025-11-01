# Theme System Migration Guide

## What's New

You now have a complete theme system with **Light** and **Dark** themes! Users can switch between themes in the Settings page.

## Quick Setup

### 1. Update Your Database

Run this SQL in your Supabase SQL Editor:

```sql
-- Add theme column to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark'));
```

Or simply run the migration file:
```bash
# Copy and paste the contents of add_theme_column.sql into Supabase SQL Editor
```

### 2. That's It!

The application is already configured to use the theme system. No additional setup needed.

## Features Implemented

### ✅ Theme Management
- **Dark Theme** - The default sleek dark mode
- **Light Theme** - Clean and bright light mode
- Persistent theme selection (stored in database)
- Instant theme switching without page reload

### ✅ Settings Page
- New theme selector at the top of settings
- Dropdown with "Dark" and "Light" options
- Automatically saves to database when changed

### ✅ Architecture
- **Global State**: Theme stored in Zustand store
- **Persistence**: Saved to `user_settings` table in Supabase
- **CSS**: Class-based theming (`.light` and `.dark` classes)
- **Provider**: `ThemeProvider` component handles theme application

## Files Modified/Created

### Created:
- `components/ThemeProvider.tsx` - Handles theme application
- `add_theme_column.sql` - Database migration
- `THEME_MIGRATION.md` - This file

### Modified:
- `lib/types.ts` - Added theme to UserSettings type
- `lib/store/useStore.ts` - Added theme state and setTheme action
- `app/globals.css` - Updated to class-based theming
- `app/layout.tsx` - Added ThemeProvider
- `app/(app)/settings/page.tsx` - Added theme selector UI
- `README.md` - Updated database schema

## How It Works

1. **Initial Load**: Theme is loaded from database when user settings are fetched
2. **User Changes Theme**: Dropdown in settings triggers `handleThemeChange()`
3. **State Update**: `setTheme()` updates Zustand store and applies CSS class
4. **Database Save**: Theme is saved to `user_settings` table via Supabase
5. **Class Application**: `ThemeProvider` watches theme state and applies `.light` or `.dark` class to `<html>`
6. **CSS Responds**: All components use `dark:` Tailwind classes for styling

## Usage

Users can change their theme by:
1. Going to Settings page
2. Clicking the "Theme" dropdown
3. Selecting "Light" or "Dark"

The change is instant and persists across sessions!

## Default Theme

The default theme is set to **Dark** for new users or users without a theme preference saved.


