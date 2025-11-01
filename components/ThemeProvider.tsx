"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store/useStore";
import { supabase } from "@/lib/supabase/client";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useStore();

  useEffect(() => {
    // Load theme on mount
    const loadTheme = async () => {
      // First, try to load from localStorage for instant application
      const localTheme = localStorage.getItem("theme") as "light" | "dark" | null;
      if (localTheme) {
        setTheme(localTheme);
      }

      // Then, load from database for persistence (overrides localStorage)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: settingsData } = await supabase
            .from("user_settings")
            .select("theme")
            .eq("user_id", user.id)
            .maybeSingle();

          if (settingsData?.theme) {
            const dbTheme = settingsData.theme as "light" | "dark";
            setTheme(dbTheme);
            localStorage.setItem("theme", dbTheme);
          }
        }
      } catch (error) {
        console.error("Error loading theme:", error);
      }
    };

    loadTheme();
  }, [setTheme]);

  useEffect(() => {
    // Save theme to localStorage whenever it changes
    localStorage.setItem("theme", theme);
  }, [theme]);

  return <>{children}</>;
}

