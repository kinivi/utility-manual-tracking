import React from "react";
import { useTimeRange } from "../hooks/useTimeRange";
import { CalendarIcon } from "./ui/Icons";
import type { TimeRangePreset } from "../utils/timeRange";

const PRESETS: { id: TimeRangePreset; label: string; shortLabel: string }[] = [
  { id: "this_week", label: "This Week", shortLabel: "Week" },
  { id: "this_month", label: "This Month", shortLabel: "Month" },
  { id: "last_month", label: "Last Month", shortLabel: "Prev" },
  { id: "last_3_months", label: "3 Months", shortLabel: "3M" },
  { id: "last_year", label: "Year", shortLabel: "Year" },
];

export function TimeRangeSelector() {
  const { spec, setRange } = useTimeRange();
  const activePreset = spec.type === "preset" ? spec.preset : null;

  return (
    <div className="flex items-center gap-1.5 mb-5 flex-wrap">
      <CalendarIcon className="w-4 h-4 text-ha-text-secondary mr-1" />
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => setRange({ type: "preset", preset: preset.id })}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activePreset === preset.id
              ? "bg-ha-primary text-white shadow-sm"
              : "text-ha-text-secondary hover:text-ha-text hover:bg-ha-divider/30"
          }`}
        >
          <span className="hidden sm:inline">{preset.label}</span>
          <span className="sm:hidden">{preset.shortLabel}</span>
        </button>
      ))}
    </div>
  );
}
