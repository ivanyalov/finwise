# Theme Persistence Implementation

## Overview

Your theme settings are now fully persistent across page reloads! The theme is stored in **two places**:

1. **localStorage** - For instant theme application (no flash)
2. **Supabase database** - For cross-device persistence

## How It Works

### 1. Instant Theme Application (No Flash)
When the page loads, a blocking script in the HTML `<head>` immediately reads from `localStorage` and applies the theme **before** React renders anything:

```javascript
// In app/layout.tsx
const theme = localStorage.getItem('theme') || 'dark';
document.documentElement.classList.add(theme);
```

This prevents any flash of the wrong theme.

### 2. Theme Loading on App Start
The `ThemeProvider` component loads the theme in two steps:

**Step 1: Fast Load from localStorage**
- Instantly applies the saved theme from browser storage
- Happens in milliseconds

**Step 2: Load from Database**
- Fetches the theme from Supabase `user_settings` table
- Overwrites localStorage if database has a newer value
- Ensures consistency across devices

### 3. Theme Saving
When you change the theme in Settings:
1. Updates Zustand store (immediate UI update)
2. Saves to localStorage (for next page load)
3. Saves to Supabase database (for persistence & cross-device sync)

## Data Flow

```
User Changes Theme in Settings
         ↓
   Updates Zustand Store ────────→ UI Updates Immediately
         ↓
   Saves to localStorage ────────→ Next Reload is Instant
         ↓
   Saves to Database ─────────────→ Cross-Device Sync
```

## Files Modified

### 1. `app/layout.tsx`
- Added blocking script to prevent theme flash
- Added `suppressHydrationWarning` to `<html>` tag

### 2. `components/ThemeProvider.tsx`
- Loads theme from localStorage (instant)
- Loads theme from database (persistent)
- Syncs localStorage on theme change

### 3. `lib/store/useStore.ts`
- `setTheme()` applies theme to DOM
- Updates Zustand state

### 4. `app/(app)/settings/page.tsx`
- `handleThemeChange()` saves to database with `upsert`
- Includes all required fields (home_currency + theme)

## Priority Order

1. **Blocking Script** - Applies theme from localStorage immediately
2. **ThemeProvider localStorage** - Confirms theme on React mount
3. **ThemeProvider Database** - Overwrites with database value (authoritative)

## Benefits

✅ **No Flash** - Theme appears instantly, no white/dark flash  
✅ **Persistent** - Theme survives page reloads  
✅ **Cross-Device** - Database sync works across devices  
✅ **Fast** - localStorage provides instant feedback  
✅ **Reliable** - Database is the source of truth  

## Testing

1. **Change Theme**: Go to Settings → Change theme → Should update immediately
2. **Reload Page**: Press F5 → Theme should persist
3. **Clear Cache**: Clear localStorage → Theme loads from database
4. **New Device**: Login from another browser → Theme syncs from database

## Troubleshooting

### Theme Reverts on Reload
- Check if database has `theme` column: Run the SQL migration
- Check browser console for errors in ThemeProvider

### Theme Flashes Wrong Color
- Check blocking script in `app/layout.tsx`
- Verify localStorage has 'theme' key (F12 → Application → Local Storage)

### Theme Not Saving
- Verify Supabase connection
- Check `user_settings` table has both `home_currency` and `theme` columns
- Check browser console for upsert errors

## Migration Required

If you haven't already, run this SQL in Supabase:

```sql
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark'));
```

## Default Theme

The default theme is **dark**. This is set in:
- `lib/store/useStore.ts` - Initial state
- `app/layout.tsx` - Fallback in blocking script
- Database column default value


