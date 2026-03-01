import React, { useState, useCallback } from "react";
import { HassContext } from "./hooks/useHass";
import { useSettings } from "./hooks/useSettings";
import { SituationRoom } from "./pages/SituationRoom";
import { ElectricityDetail } from "./pages/ElectricityDetail";
import { WaterDetail } from "./pages/WaterDetail";
import { Settings } from "./pages/Settings";
import type { HomeAssistant, TabId } from "./types";

interface AppProps {
  hass: HomeAssistant;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "situation", label: "Overview", icon: "⚡" },
  { id: "electricity", label: "Electricity", icon: "🔌" },
  { id: "water", label: "Water", icon: "💧" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

export default function App({ hass }: AppProps) {
  const [activeTab, setActiveTab] = useState<TabId>("situation");
  const { settings, setSettings } = useSettings();

  const renderPage = useCallback(() => {
    switch (activeTab) {
      case "situation":
        return <SituationRoom settings={settings} />;
      case "electricity":
        return <ElectricityDetail settings={settings} />;
      case "water":
        return <WaterDetail settings={settings} />;
      case "settings":
        return <Settings settings={settings} onSettingsChange={setSettings} />;
    }
  }, [activeTab, settings, setSettings]);

  return (
    <HassContext.Provider value={hass}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ha-text">Utilities Dashboard</h1>
          <p className="text-sm text-ha-text-secondary mt-1">
            Energy & water monitoring
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-ha-card rounded-xl p-1 shadow-sm border border-ha-divider overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-ha-primary text-white shadow-sm"
                  : "text-ha-text-secondary hover:text-ha-text hover:bg-gray-100"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Page Content */}
        {renderPage()}
      </div>
    </HassContext.Provider>
  );
}
