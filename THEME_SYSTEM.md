# Theme Management System

## Overview

The app now uses a robust, centralized theme management system that handles both UI updates and database persistence automatically.

## Architecture

### 1. **Custom Hook: `useTheme()`**
Location: `lib/hooks/useTheme.ts`

This hook provides a clean API for theme management:

```typescript
const { theme, setTheme, toggleTheme } = useTheme();
```

**Features:**
- ✅ Automatically loads theme from database on mount
- ✅ Optimistically updates UI immediately
- ✅ Persists theme to database in background
- ✅ Handles authentication state properly
- ✅ Provides helpful error messages

### 2. **Store Integration**
The hook uses Zustand store (`useStore`) which:
- Manages global theme state
- Applies theme classes to `document.documentElement`
- Provides reactive updates across the app

### 3. **Database Persistence**
Theme is stored in the `user_settings` table with:
- `user_id` (foreign key to auth.users)
- `theme` (TEXT: 'light' or 'dark')
- Row Level Security (RLS) for data protection

## Usage

### In Settings Page
```tsx
import { useTheme } from "@/lib/hooks/useTheme";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  
  return (
    <Select
      value={theme}
      onChange={(e) => setTheme(e.target.value as "light" | "dark")}
    />
  );
}
```

### Anywhere in the App
```tsx
import { useTheme } from "@/lib/hooks/useTheme";

function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      Switch to {theme === 'dark' ? 'light' : 'dark'} mode
    </button>
  );
}
```

## How It Works

### Flow Diagram
```
User Changes Theme
      ↓
setTheme() called
      ↓
[1] UI updated immediately (optimistic)
      ↓
[2] Database update queued (async)
      ↓
[3] Document class updated (.dark or .light)
      ↓
CSS variables apply instantly
```

### Key Benefits

1. **Optimistic Updates**: UI changes instantly, no loading state needed
2. **Graceful Degradation**: If database save fails, UI still works
3. **Authentication Aware**: Won't crash if user not loaded yet
4. **Single Source of Truth**: All theme logic in one place
5. **Type Safe**: Full TypeScript support

## Troubleshooting

### Theme not persisting?
- Check user is authenticated (`user?.id` exists)
- Verify `user_settings` table exists in Supabase
- Check RLS policies allow upserts

### Theme not applying?
- Ensure `globals.css` has `.light` and `.dark` classes
- Check `document.documentElement.classList` includes theme class
- Verify Tailwind dark mode is configured

### Errors in console?
- "Cannot persist theme: User not authenticated" - Normal if user not logged in yet
- "Error saving theme:" - Check database connection and RLS policies

## Migration from Old System

The old system had issues:
- ❌ Manual user ID validation in every handler
- ❌ Scattered theme logic across files
- ❌ Poor error handling
- ❌ Race conditions on load

New system fixes all of these! 🎉

## Future Enhancements

Potential improvements:
- [ ] Add local storage fallback for logged-out users
- [ ] System preference detection on first load
- [ ] Theme transition animations
- [ ] Custom theme colors per user


