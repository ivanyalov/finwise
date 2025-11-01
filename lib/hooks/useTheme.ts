import { useStore } from "@/lib/store/useStore";
import { supabase } from "@/lib/supabase/client";
import { useCallback } from "react";

/**
 * Custom hook for theme management
 * Note: Theme should be loaded in page components alongside other user data
 * This hook only handles theme updates
 */
export function useTheme() {
  const { theme, setTheme, user } = useStore();

  // Update theme in both UI and database
  const updateTheme = useCallback(
    async (newTheme: "light" | "dark") => {
      // Optimistically update UI immediately
      setTheme(newTheme);

      // Persist to database in background
      if (!user?.id) {
        console.warn("Cannot persist theme: User not authenticated");
        return;
      }

      try {
        // First check if settings exist
        const { data: existing } = await supabase
          .from("user_settings")
          .select("id, home_currency")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existing) {
          // Update existing row
          const { error } = await supabase
            .from("user_settings")
            .update({ theme: newTheme })
            .eq("user_id", user.id);

          if (error) throw error;
        } else {
          // Insert new row with required fields
          const { error } = await supabase
            .from("user_settings")
            .insert({
              user_id: user.id,
              home_currency: "USD", // Default required field
              theme: newTheme,
            });

          if (error) throw error;
        }
      } catch (error: any) {
        console.error("Error saving theme:", error.message || error);
      }
    },
    [user?.id, setTheme]
  );

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "dark" ? "light" : "dark";
    updateTheme(newTheme);
  }, [theme, updateTheme]);

  return {
    theme,
    setTheme: updateTheme,
    toggleTheme,
  };
}

