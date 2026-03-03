import { useState, useEffect, useMemo, useCallback } from "react";
import { useHass } from "./useHass";
import { useTimeRange } from "./useTimeRange";
import type { StatisticsResult } from "../types";

interface CacheEntry {
  data: StatisticsResult;
  expiresAt: number;
}

// Module-level cache survives component unmount/remount
const cache = new Map<string, CacheEntry>();
// Deduplicate concurrent requests for the same cache key.
const inflight = new Map<string, Promise<StatisticsResult>>();

function makeCacheKey(
  statisticIds: string[],
  startTime: string,
  endTime: string,
  period: string
): string {
  return JSON.stringify([
    [...statisticIds].sort(),
    startTime,
    endTime,
    period,
  ]);
}

interface UseRecorderQueryOptions {
  /** Override start/end instead of using TimeRange context */
  startTime?: string;
  endTime?: string;
  /** Override period instead of using suggested */
  period?: "hour" | "day" | "month";
  /** How long data stays fresh (ms). Default: 5 minutes. */
  staleTime?: number;
  /** Set false to skip fetching. Default: true. */
  enabled?: boolean;
}

export function useRecorderQuery(
  statisticIds: string[],
  options: UseRecorderQueryOptions = {}
) {
  const hass = useHass();
  const { resolved, suggestedPeriod } = useTimeRange();

  const startTime = options.startTime ?? resolved.start;
  const endTime = options.endTime ?? resolved.end;
  const period = options.period ?? suggestedPeriod;
  const staleTime = options.staleTime ?? 5 * 60 * 1000;
  const enabled = options.enabled !== false;

  const cacheKey = useMemo(
    () => makeCacheKey(statisticIds, startTime, endTime, period),
    [statisticIds, startTime, endTime, period]
  );

  const [data, setData] = useState<StatisticsResult | null>(() => {
    const cached = cache.get(cacheKey);
    return cached && cached.expiresAt > Date.now() ? cached.data : null;
  });
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let promise = inflight.get(cacheKey);
      if (!promise) {
        promise = hass.connection.sendMessagePromise({
          type: "recorder/statistics_during_period",
          start_time: startTime,
          end_time: endTime,
          statistic_ids: statisticIds,
          period,
          types: ["sum", "change"],
          units: { energy: "kWh" },
        }) as Promise<StatisticsResult>;
        inflight.set(cacheKey, promise);
      }

      const result: StatisticsResult = await promise;

      cache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + staleTime,
      });
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      inflight.delete(cacheKey);
      setLoading(false);
    }
  }, [hass, cacheKey, startTime, endTime, statisticIds, period, staleTime]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    (async () => {
      await fetchData();
      if (cancelled) return;
    })();

    // Refresh when stale time elapses
    const interval = setInterval(() => {
      // Invalidate cache so next fetch re-queries
      cache.delete(cacheKey);
      if (!cancelled) fetchData();
    }, staleTime);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, fetchData, cacheKey, staleTime]);

  const refresh = useCallback(() => {
    cache.delete(cacheKey);
    fetchData();
  }, [cacheKey, fetchData]);

  return { data, loading: loading && !data, error, refresh };
}
