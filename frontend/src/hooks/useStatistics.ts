import { useState, useEffect, useCallback } from "react";
import { useHass } from "./useHass";
import type { StatisticsResult, DailyConsumption, StatisticValue } from "../types";

/** HA statistics `start` can be an ISO string or a numeric timestamp (seconds). */
function toISODate(start: string | number): string {
  if (typeof start === "string") return start;
  return new Date(start * 1000).toISOString();
}

const ELECTRICITY_STAT_ID = "utility_manual_tracking:utility_manual_tracking_electricity_meter_energy_statistics_device_aware";

export function useStatistics(days: number = 30) {
  const hass = useHass();
  const [hourlyStats, setHourlyStats] = useState<StatisticValue[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyConsumption[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<DailyConsumption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async (period: "hour" | "day" | "month", numDays: number) => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - numDays);

    const result: StatisticsResult = await hass.connection.sendMessagePromise({
      type: "recorder/statistics_during_period",
      start_time: start.toISOString(),
      end_time: now.toISOString(),
      statistic_ids: [ELECTRICITY_STAT_ID],
      period,
      types: ["sum", "change"],
      units: { energy: "kWh" },
    });

    return result[ELECTRICITY_STAT_ID] || [];
  }, [hass]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [hourly, daily, monthly] = await Promise.all([
          fetchStats("hour", days),
          fetchStats("day", days),
          fetchStats("month", 365),
        ]);

        if (cancelled) return;

        setHourlyStats(hourly);
        setDailyStats(
          daily.map((s) => ({
            date: toISODate(s.start),
            value: s.change ?? 0,
          }))
        );
        setMonthlyStats(
          monthly.map((s) => ({
            date: toISODate(s.start),
            value: s.change ?? 0,
          }))
        );
      } catch (e) {
        console.error("Failed to fetch statistics:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    // Refresh every 5 minutes
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [fetchStats, days]);

  return { hourlyStats, dailyStats, monthlyStats, loading };
}
