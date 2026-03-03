import React, { createContext, useContext, useState, useMemo } from "react";
import {
  resolveRange,
  suggestedPeriod as computeSuggestedPeriod,
  type TimeRangeSpec,
  type ResolvedTimeRange,
} from "../utils/timeRange";

export interface TimeRangeContextValue {
  spec: TimeRangeSpec;
  resolved: ResolvedTimeRange;
  setRange: (spec: TimeRangeSpec) => void;
  suggestedPeriod: "hour" | "day" | "month";
}

const TimeRangeContext = createContext<TimeRangeContextValue | null>(null);

export function TimeRangeProvider({ children }: { children: React.ReactNode }) {
  const [spec, setSpec] = useState<TimeRangeSpec>({
    type: "preset",
    preset: "this_month",
  });

  const resolved = useMemo(() => resolveRange(spec), [spec]);
  const period = useMemo(() => computeSuggestedPeriod(resolved), [resolved]);

  const value: TimeRangeContextValue = useMemo(
    () => ({ spec, resolved, setRange: setSpec, suggestedPeriod: period }),
    [spec, resolved, period]
  );

  return React.createElement(
    TimeRangeContext.Provider,
    { value },
    children
  );
}

export function useTimeRange(): TimeRangeContextValue {
  const ctx = useContext(TimeRangeContext);
  if (!ctx) throw new Error("useTimeRange must be inside TimeRangeProvider");
  return ctx;
}
