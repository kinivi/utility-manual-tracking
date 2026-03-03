/**
 * Centralized dashboard data layer.
 *
 * Combines electricity stats, device breakdown, and water meters into a
 * single hook with computed metrics. Heavy analytics run via requestIdleCallback
 * to avoid blocking the main thread.
 *
 * Tab-based fetch strategy:
 *   - "situation": all overview-critical data
 *   - "electricity": adds hourly heatmap data (already fetched by useStatistics)
 *   - "water": adds water monthly estimate
 *   - "settings": no extra fetching
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useStatistics } from "./useStatistics";
import { useDeviceBreakdown } from "./useDeviceBreakdown";
import { useWaterMeters } from "./useWaterMeters";
import { useSettings } from "./useSettings";
import { useTimeRange } from "./useTimeRange";
import { computeMetrics, type ComputeMetricsInput } from "../utils/analyticsEngine";
import { rangeDays } from "../utils/timeRange";
import type { DashboardMetrics, TabId } from "../types";

export interface DashboardData {
  /** Raw data sources */
  raw: {
    electricity: ReturnType<typeof useStatistics>["data"];
    breakdown: ReturnType<typeof useDeviceBreakdown>["breakdown"];
    meters: ReturnType<typeof useWaterMeters>["meters"];
    totalDaily: number;
  };
  /** Computed analytics (async, may lag raw by one frame) */
  metrics: DashboardMetrics | null;
  /** True only on first load before any data arrives */
  loading: boolean;
  /** True when refreshing in background (cached data is still shown) */
  refreshing: boolean;
  /** Refresh all data sources */
  refresh: () => void;
}

export function useDashboardData(activeTab: TabId): DashboardData {
  const statsEnabled = activeTab !== "settings";
  const includeHourly = activeTab === "electricity";
  const { data: elecData, loading: elecLoading, refresh: refreshElec } = useStatistics({
    enabled: statsEnabled,
    includeHourly,
  });
  const { breakdown, loading: deviceLoading, refresh: refreshBreakdown } = useDeviceBreakdown({
    enabled: statsEnabled,
  });
  const { meters, totalDaily } = useWaterMeters();
  const { settings } = useSettings();
  const { resolved } = useTimeRange();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const computeIdRef = useRef(0);

  // Background refresh interval (120s for active tab)
  const refreshElecRef = useRef(refreshElec);
  refreshElecRef.current = refreshElec;
  const refreshBreakdownRef = useRef(refreshBreakdown);
  refreshBreakdownRef.current = refreshBreakdown;

  useEffect(() => {
    if (!statsEnabled) return;
    const interval = setInterval(() => {
      refreshElecRef.current();
      refreshBreakdownRef.current();
    }, 120_000);
    return () => clearInterval(interval);
  }, [statsEnabled]);

  // Compute derived metrics whenever raw data changes
  useEffect(() => {
    const id = ++computeIdRef.current;

    const dailyStats = elecData?.dailyStats ?? [];
    const monthlyStats = elecData?.monthlyStats ?? [];
    const deviceTotals = breakdown?.totals ?? [];
    const baseLoadTotal = breakdown?.baseLoadTotal ?? 0;

    // Skip compute if no data at all
    if (dailyStats.length === 0 && deviceTotals.length === 0) {
      setMetrics(null);
      return;
    }

    const input: ComputeMetricsInput = {
      dailyStats,
      monthlyStats,
      deviceTotals,
      baseLoadTotal,
      waterDailyL: totalDaily,
      settings,
      rangeDays: rangeDays(resolved),
    };

    computeMetrics(input).then((result) => {
      // Only apply if this is still the latest computation
      if (computeIdRef.current === id) {
        setMetrics(result);
      }
    });
  }, [elecData, breakdown, totalDaily, settings, resolved]);

  const loading = (elecLoading || deviceLoading) && !elecData && !breakdown;
  const refreshing = (elecLoading || deviceLoading) && (!!elecData || !!breakdown);

  return {
    raw: {
      electricity: elecData,
      breakdown,
      meters,
      totalDaily,
    },
    metrics,
    loading,
    refreshing,
    refresh: () => {
      refreshElec();
      refreshBreakdown();
    },
  };
}
