import { useMemo } from "react";
import { useHass } from "./useHass";
import type { WaterMeterData } from "../types";

const WATER_METERS = [
  { entityId: "sensor.water_kitchen_cold_meter", label: "Kitchen Cold", location: "kitchen" as const, temp: "cold" as const },
  { entityId: "sensor.water_kitchen_hot_meter", label: "Kitchen Hot", location: "kitchen" as const, temp: "hot" as const },
  { entityId: "sensor.water_bathroom_cold_meter", label: "Bathroom Cold", location: "bathroom" as const, temp: "cold" as const },
  { entityId: "sensor.water_bathroom_hot_meter", label: "Bathroom Hot", location: "bathroom" as const, temp: "hot" as const },
];

const DAILY_SENSORS = [
  { entityId: "sensor.water_kitchen_cold_daily", location: "kitchen" as const, temp: "cold" as const },
  { entityId: "sensor.water_kitchen_hot_daily", location: "kitchen" as const, temp: "hot" as const },
  { entityId: "sensor.water_bathroom_cold_daily", location: "bathroom" as const, temp: "cold" as const },
  { entityId: "sensor.water_bathroom_hot_daily", location: "bathroom" as const, temp: "hot" as const },
];

function safeParseNumber(value?: string): number {
  if (value == null) return 0;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function useWaterMeters() {
  const hass = useHass();

  const meters = useMemo((): WaterMeterData[] => {
    return WATER_METERS.map((meter) => {
      const entity = hass.states[meter.entityId];
      const dailySensor = DAILY_SENSORS.find(
        (d) => d.location === meter.location && d.temp === meter.temp
      );
      const dailyEntity = dailySensor ? hass.states[dailySensor.entityId] : undefined;

      return {
        entityId: meter.entityId,
        label: meter.label,
        location: meter.location,
        temp: meter.temp,
        currentReading: safeParseNumber(entity?.state),
        dailyUsage: safeParseNumber(dailyEntity?.state),
        unit: entity?.attributes?.unit_of_measurement || "m³",
        previousReading: entity?.attributes?.previous_reading,
        lastReadingDate: entity?.attributes?.last_reading_date,
      };
    });
  }, [hass.states]);

  const totalDaily = useMemo(() => {
    const totalEntity = hass.states["sensor.water_total_daily"];
    const total = safeParseNumber(totalEntity?.state);
    return total > 0 ? total : meters.reduce((sum, m) => sum + m.dailyUsage, 0);
  }, [hass.states, meters]);

  return { meters, totalDaily };
}
