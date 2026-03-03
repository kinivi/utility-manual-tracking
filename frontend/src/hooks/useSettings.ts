import React, { createContext, useContext, useState, useCallback } from "react";
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

interface SettingsContextValue {
  settings: DashboardSettings;
  setSettings: (update: Partial<DashboardSettings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<DashboardSettings>(loadSettings);

  const setSettings = useCallback((update: Partial<DashboardSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...update };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return React.createElement(
    SettingsContext.Provider,
    { value: { settings, setSettings } },
    children
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
}
