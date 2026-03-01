import { useState, useCallback } from "react";
import type { DashboardSettings } from "../types";
import { DEFAULT_SETTINGS } from "../types";

const STORAGE_KEY = "utility-dashboard-settings";

function loadSettings(): DashboardSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_SETTINGS;
}

export function useSettings() {
  const [settings, setSettingsState] = useState<DashboardSettings>(loadSettings);

  const setSettings = useCallback((update: Partial<DashboardSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...update };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, setSettings };
}
