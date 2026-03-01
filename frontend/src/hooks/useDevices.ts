import { useState, useEffect, useCallback } from "react";
import { useHass } from "./useHass";
import type { StatisticsResult, DeviceConsumption } from "../types";

const KNOWN_DEVICES = [
  { entityId: "sensor.bathroom_washer_energy_this_month", name: "Washer", color: "#4fc3f7" },
  { entityId: "sensor.smart_plug_servers_energy", name: "Servers", color: "#ff7043" },
  { entityId: "sensor.smart_plug_vacuum_energy", name: "Vacuum", color: "#66bb6a" },
];

export function useDevices(days: number = 30) {
  const hass = useHass();
  const [devices, setDevices] = useState<DeviceConsumption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = useCallback(async () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - days);

    try {
      const result: StatisticsResult = await hass.connection.sendMessagePromise({
        type: "recorder/statistics_during_period",
        start_time: start.toISOString(),
        end_time: now.toISOString(),
        statistic_ids: KNOWN_DEVICES.map((d) => d.entityId),
        period: "month",
        types: ["change"],
        units: { energy: "kWh" },
      });

      const deviceData: DeviceConsumption[] = KNOWN_DEVICES.map((device) => {
        const stats = result[device.entityId] || [];
        const total = stats.reduce((sum, s) => sum + (s.change ?? 0), 0);
        return { name: device.name, entityId: device.entityId, value: total, color: device.color };
      });

      setDevices(deviceData);
    } catch (e) {
      console.error("Failed to fetch device stats:", e);
    } finally {
      setLoading(false);
    }
  }, [hass, days]);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  return { devices, loading };
}
