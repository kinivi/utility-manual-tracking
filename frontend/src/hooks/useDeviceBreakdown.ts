import { useMemo } from "react";
import { useRecorderQuery } from "./useRecorderQuery";
import { ELECTRICITY_STAT_ID } from "./useStatistics";
import type { DeviceConsumption, StatisticValue } from "../types";

/** HA statistics `start` can be an ISO string or a numeric timestamp (seconds). */
function toISODate(start: string | number): string {
  if (typeof start === "string") return start;
  return new Date(start * 1000).toISOString();
}

function toDateKey(start: string | number): string {
  return toISODate(start).slice(0, 10);
}

export const KNOWN_DEVICES = [
  { entityId: "sensor.bathroom_washer_energy_this_month", name: "Washer", color: "#4fc3f7" },
  { entityId: "sensor.smart_plug_servers_energy", name: "Servers", color: "#ff7043" },
  { entityId: "sensor.smart_plug_vacuum_energy", name: "Vacuum", color: "#66bb6a" },
];

export interface DeviceTimeSeries {
  entityId: string;
  name: string;
  color: string;
  data: Map<string, number>; // date key → kWh
}

export interface DeviceBreakdown {
  devices: DeviceTimeSeries[];
  baseLoad: Map<string, number>; // date key → kWh
  totals: DeviceConsumption[];
  baseLoadTotal: number;
}

interface UseDeviceBreakdownOptions {
  enabled?: boolean;
}

export function useDeviceBreakdown(): {
  breakdown: DeviceBreakdown | null;
  loading: boolean;
  refresh: () => void;
};
export function useDeviceBreakdown(options: UseDeviceBreakdownOptions): {
  breakdown: DeviceBreakdown | null;
  loading: boolean;
  refresh: () => void;
};
export function useDeviceBreakdown(options: UseDeviceBreakdownOptions = {}): {
  breakdown: DeviceBreakdown | null;
  loading: boolean;
  refresh: () => void;
} {
  const enabled = options.enabled !== false;
  // Fetch all devices + total electricity in one query at daily granularity
  const allIds = useMemo(
    () => [ELECTRICITY_STAT_ID, ...KNOWN_DEVICES.map((d) => d.entityId)],
    []
  );

  const query = useRecorderQuery(allIds, { period: "day", enabled });

  const breakdown = useMemo((): DeviceBreakdown | null => {
    if (!enabled) return null;
    if (!query.data) return null;

    const totalStats: StatisticValue[] = query.data[ELECTRICITY_STAT_ID] || [];

    // Build per-device time series
    const devices: DeviceTimeSeries[] = KNOWN_DEVICES.map((device) => {
      const stats = query.data![device.entityId] || [];
      const data = new Map<string, number>();
      for (const s of stats) {
        data.set(toDateKey(s.start), s.change ?? 0);
      }
      return { entityId: device.entityId, name: device.name, color: device.color, data };
    });

    // Compute base load per day
    const baseLoad = new Map<string, number>();
    for (const stat of totalStats) {
      const key = toDateKey(stat.start);
      const totalForDay = stat.change ?? 0;
      let knownForDay = 0;
      for (const d of devices) {
        knownForDay += d.data.get(key) ?? 0;
      }
      baseLoad.set(key, Math.max(0, totalForDay - knownForDay));
    }

    // Aggregate totals
    const totals: DeviceConsumption[] = devices.map((d) => {
      let total = 0;
      d.data.forEach((v) => (total += v));
      return { name: d.name, entityId: d.entityId, value: total, color: d.color };
    });

    let baseLoadTotal = 0;
    baseLoad.forEach((v) => (baseLoadTotal += v));

    return { devices, baseLoad, totals, baseLoadTotal };
  }, [enabled, query.data]);

  return {
    breakdown,
    loading: enabled && query.loading,
    refresh: enabled ? query.refresh : () => {},
  };
}
