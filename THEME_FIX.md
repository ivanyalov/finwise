# Theme 400 Error - Fixed

## Problem
When entering the Settings page, you were getting two 400 (Bad Request) errors:
```
GET https://...supabase.co/rest/v1/user_settings?select=theme&user_id=eq...
400 (Bad Request)
```

## Root Cause
The `useTheme()` hook was automatically trying to load the theme from the database as soon as the component mounted, but:
1. This happened BEFORE the user data was fully loaded in the page
2. The settings page was ALSO loading settings separately
3. This caused duplicate, premature API calls that failed

## Solution

### 1. Simplified `useTheme` Hook
**Location:** `lib/hooks/useTheme.ts`

**Changed:** Removed automatic theme loading from the hook
- ❌ Before: Hook loaded theme on mount (useEffect)
- ✅ After: Hook only handles theme updates

```typescript
// No more automatic loading - just updates
export function useTheme() {
  const { theme, setTheme, user } = useStore();
  
  const updateTheme = useCallback(async (newTheme) => {
    setTheme(newTheme);  // UI update
    // Background database save...
  }, [user?.id, setTheme]);
  
  return { theme, setTheme: updateTheme, toggleTheme };
}
```

### 2. Load Theme in Settings Page
**Location:** `app/(app)/settings/page.tsx`

**Changed:** Load theme alongside other settings data

```typescript
// Load settings (including theme)
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
}
```

## What This Fixes

✅ **No more 400 errors** - Theme is loaded at the right time with proper user context  
✅ **No duplicate queries** - Single query loads all settings including theme  
✅ **Proper sequencing** - User data loads first, then settings  
✅ **Better performance** - One query instead of multiple parallel queries  

## How It Works Now

### Page Load Flow
1. User enters Settings page
2. `loadUserAndData()` runs
3. Gets authenticated user
4. Loads user_settings (including theme) in ONE query
5. Sets theme using store's setTheme
6. UI renders with correct theme

### Theme Change Flow
1. User changes theme dropdown
2. `setTheme()` from useTheme hook is called
3. UI updates immediately (optimistic)
4. Database saves in background
5. No page reload needed

## Testing

1. ✅ Open Settings page - no console errors
2. ✅ Change theme - updates immediately
3. ✅ Refresh page - theme persists
4. ✅ Check network tab - only ONE user_settings query

## Note

If you still see errors, check:
- `user_settings` table exists in Supabase
- RLS policies allow SELECT and UPSERT for authenticated users
- User is properly authenticated before accessing settings


