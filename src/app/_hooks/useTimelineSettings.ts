"use client";

import { useState, useEffect, useCallback } from "react";

export type TimelineUpdateMode = "banner" | "auto";

interface TimelineSettings {
  updateMode: TimelineUpdateMode;
}

const STORAGE_KEY = "pyrrhula-timeline-settings";

const DEFAULT_SETTINGS: TimelineSettings = {
  updateMode: "banner",
};

export function useTimelineSettings() {
  const [settings, setSettings] = useState<TimelineSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch {
      // ignore storage errors
    }
    setIsLoaded(true);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<TimelineSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  }, []);

  return { settings, updateSettings, isLoaded };
}
