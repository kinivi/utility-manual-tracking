import { useMemo } from "react";
import { useRecorderQuery } from "./useRecorderQuery";
import { statsToDaily } from "../utils/statistics";
import type { StatisticValue, DailyConsumption } from "../types";

/** HA statistics `start` can be an ISO string or a numeric timestamp (seconds). */
function toISODate(start: string | number): string {
  if (typeof start === "string") return start;
  return new Date(start * 1000).toISOString();
}

const ELECTRICITY_STAT_ID =
  "utility_manual_tracking:utility_manual_tracking_electricity_meter_energy_statistics_device_aware";

export { ELECTRICITY_STAT_ID };

export interface ElectricityData {
  hourlyStats: StatisticValue[];
  dailyStats: DailyConsumption[];
  monthlyStats: DailyConsumption[];
}

interface UseStatisticsOptions {
  includeHourly?: boolean;
  enabled?: boolean;
}

export function useStatistics(): {
  data: ElectricityData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
};
export function useStatistics(options: UseStatisticsOptions): {
  data: ElectricityData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
};
export function useStatistics(options: UseStatisticsOptions = {}): {
  data: ElectricityData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
} {
  const includeHourly = options.includeHourly !== false;
  const enabled = options.enabled !== false;

  // Hourly stats — uses time range from context
  const hourlyQuery = useRecorderQuery([ELECTRICITY_STAT_ID], {
    period: "hour",
    enabled: enabled && includeHourly,
  });

  // Daily stats — uses time range from context
  const dailyQuery = useRecorderQuery([ELECTRICITY_STAT_ID], {
    period: "day",
    enabled,
  });

  // Monthly stats — always last 365 days (for month-over-month comparison)
  const monthlyStart = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString();
  }, []);
  const monthlyEnd = useMemo(() => new Date().toISOString(), []);

  const monthlyQuery = useRecorderQuery([ELECTRICITY_STAT_ID], {
    period: "month",
    startTime: monthlyStart,
    endTime: monthlyEnd,
    staleTime: 30 * 60 * 1000, // Monthly data is slow-changing
    enabled,
  });

  const data = useMemo((): ElectricityData | null => {
    if (!enabled) return null;
    if (!dailyQuery.data && !(includeHourly && hourlyQuery.data)) return null;

    const hourly = includeHourly ? (hourlyQuery.data?.[ELECTRICITY_STAT_ID] || []) : [];
    const dailyRaw = dailyQuery.data?.[ELECTRICITY_STAT_ID] || [];

    // When daily query returns empty but hourly has data, aggregate hourly → daily
    const daily = dailyRaw.length > 0
      ? dailyRaw.map((s) => ({ date: toISODate(s.start), value: s.change ?? 0 }))
      : statsToDaily(hourly);

    const monthly = (monthlyQuery.data?.[ELECTRICITY_STAT_ID] || []).map((s) => ({
      date: toISODate(s.start),
      value: s.change ?? 0,
    }));

    return { hourlyStats: hourly, dailyStats: daily, monthlyStats: monthly };
  }, [enabled, includeHourly, hourlyQuery.data, dailyQuery.data, monthlyQuery.data]);

  return {
    data,
    loading: enabled && (((includeHourly && hourlyQuery.loading) || dailyQuery.loading) && !data),
    error: (includeHourly ? hourlyQuery.error : null) || dailyQuery.error || null,
    refresh: () => {
      if (!enabled) return;
      if (includeHourly) hourlyQuery.refresh();
      dailyQuery.refresh();
      monthlyQuery.refresh();
    },
  };
}
