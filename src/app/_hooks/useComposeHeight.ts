"use client";

import { useState, useCallback } from "react";
import {
  COMPOSE_HEIGHT_STORAGE_KEY,
  DEFAULT_COMPOSE_HEIGHT,
  clampComposeHeight,
  parseComposeHeightPrefs,
  type ComposeHeightPrefs,
} from "@/lib/compose-height";

export function useComposeHeight() {
  const [height, setHeight] = useState<ComposeHeightPrefs>(() => {
    try {
      return parseComposeHeightPrefs(
        localStorage.getItem(COMPOSE_HEIGHT_STORAGE_KEY),
      );
    } catch {
      return { ...DEFAULT_COMPOSE_HEIGHT };
    }
  });
  const [isLoaded] = useState(true);

  const updateHeight = useCallback((partial: Partial<ComposeHeightPrefs>) => {
    setHeight((prev) => {
      const updated: ComposeHeightPrefs = {
        desktopPx: clampComposeHeight(
          partial.desktopPx ?? prev.desktopPx,
        ),
        mobilePx: clampComposeHeight(partial.mobilePx ?? prev.mobilePx),
      };
      try {
        localStorage.setItem(
          COMPOSE_HEIGHT_STORAGE_KEY,
          JSON.stringify(updated),
        );
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const resetHeight = useCallback(() => {
    try {
      localStorage.removeItem(COMPOSE_HEIGHT_STORAGE_KEY);
    } catch {
      // ignore
    }
    setHeight({ ...DEFAULT_COMPOSE_HEIGHT });
  }, []);

  return { height, updateHeight, resetHeight, isLoaded };
}
