import React, { useState, useCallback } from "react";
import { HassContext } from "./hooks/useHass";
import { SettingsProvider } from "./hooks/useSettings";
import { TimeRangeProvider } from "./hooks/useTimeRange";
import { TimeRangeSelector } from "./components/TimeRangeSelector";
import { SituationRoom } from "./pages/SituationRoom";
import { ElectricityDetail } from "./pages/ElectricityDetail";
import { WaterDetail } from "./pages/WaterDetail";
import { Settings } from "./pages/Settings";
import { BoltIcon, PlugIcon, DropletIcon, GearIcon } from "./components/ui/Icons";
import type { HomeAssistant, TabId } from "./types";

interface AppProps {
  hass: HomeAssistant;
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "situation", label: "Overview", icon: <BoltIcon className="w-4 h-4" /> },
  { id: "electricity", label: "Electricity", icon: <PlugIcon className="w-4 h-4" /> },
  { id: "water", label: "Water", icon: <DropletIcon className="w-4 h-4" /> },
  { id: "settings", label: "Settings", icon: <GearIcon className="w-4 h-4" /> },
];

export default function App({ hass }: AppProps) {
  const [activeTab, setActiveTab] = useState<TabId>("situation");

  const renderPage = useCallback(() => {
    switch (activeTab) {
      case "situation":
        return <SituationRoom onTabChange={setActiveTab} />;
      case "electricity":
        return <ElectricityDetail />;
      case "water":
        return <WaterDetail />;
      case "settings":
        return <Settings />;
    }
  }, [activeTab]);

  return (
    <HassContext.Provider value={hass}>
      <SettingsProvider>
        <TimeRangeProvider>
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-ha-text tracking-tight">
                Utilities Dashboard
              </h1>
              <p className="text-sm text-ha-text-secondary mt-1">
                Energy & water monitoring
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 mb-4 bg-ha-card rounded-xl p-1 shadow-sm border border-ha-divider overflow-x-auto scrollbar-hide">
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
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Time Range Selector (global, above content) */}
            {activeTab !== "settings" && <TimeRangeSelector />}

            {/* Page Content with fade-in transition */}
            <div key={activeTab} className="animate-fadeIn">
              {renderPage()}
            </div>
          </div>
        </TimeRangeProvider>
      </SettingsProvider>
    </HassContext.Provider>
  );
}
