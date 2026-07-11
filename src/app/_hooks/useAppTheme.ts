"use client";

import { useState, useCallback, useEffect } from "react";
import {
  APP_THEME_STORAGE_KEY,
  DEFAULT_APP_THEME,
  applyAppThemeToDocument,
  type AppThemeColors,
} from "@/lib/app-theme";

export function useAppTheme() {
  const [theme, setTheme] = useState<AppThemeColors>(() => {
    try {
      const stored = localStorage.getItem(APP_THEME_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_APP_THEME, ...JSON.parse(stored) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_APP_THEME;
  });
  const [isLoaded] = useState(true);

  useEffect(() => {
    applyAppThemeToDocument(theme);
  }, [theme]);

  const updateTheme = useCallback((partial: Partial<AppThemeColors>) => {
    setTheme((prev) => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem(APP_THEME_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const resetTheme = useCallback(() => {
    try {
      localStorage.removeItem(APP_THEME_STORAGE_KEY);
    } catch {
      // ignore
    }
    setTheme(DEFAULT_APP_THEME);
  }, []);

  return { theme, updateTheme, resetTheme, isLoaded };
}
