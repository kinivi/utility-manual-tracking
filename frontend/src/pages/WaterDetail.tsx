import React, { useMemo } from "react";
import { useWaterMeters } from "../hooks/useWaterMeters";
import { KPICard } from "../components/KPICard";
import { WaterBreakdown } from "../components/WaterBreakdown";
import { ReadingTimeline } from "../components/ReadingTimeline";
import { formatCurrency, dailyCost } from "../utils/cost";
import type { DashboardSettings } from "../types";

interface WaterDetailProps {
  settings: DashboardSettings;
}

export function WaterDetail({ settings }: WaterDetailProps) {
  const { meters, totalDaily } = useWaterMeters();

  const hotTotal = useMemo(
    () => meters.filter((m) => m.temp === "hot").reduce((s, m) => s + m.dailyUsage, 0),
    [meters]
  );
  const coldTotal = useMemo(
    () => meters.filter((m) => m.temp === "cold").reduce((s, m) => s + m.dailyUsage, 0),
    [meters]
  );
  const hotRatio = totalDaily > 0 ? (hotTotal / totalDaily) * 100 : 0;

  // Estimated monthly cost (daily L -> m³ -> cost)
  const dailyM3 = totalDaily / 1000;
  const monthlyM3 = dailyM3 * 30.44;

  // Parse readings from meter attributes
  const meterReadings = useMemo(() => {
    return meters.map((meter) => {
      const readings: { value: number; date: string; delta?: number }[] = [];

      if (meter.previousReading != null && meter.lastReadingDate) {
        readings.push({
          value: meter.previousReading,
          date: meter.lastReadingDate,
        });
        readings.push({
          value: meter.currentReading,
          date: "Current",
          delta: meter.currentReading - meter.previousReading,
        });
      } else {
        readings.push({
          value: meter.currentReading,
          date: "Current",
        });
      }

      return { label: meter.label, readings: readings.reverse() };
    });
  }, [meters]);

  return (
    <div className="space-y-6">
      {/* Total + Cost KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Total Daily" icon="💧" value={totalDaily} unit="L/day" color="#42a5f5" />
        <KPICard
          label="Daily Cost"
          icon="💰"
          value={formatCurrency(dailyCost(dailyM3, settings.waterRate), settings.currency)}
          unit="/day"
        />
        <KPICard
          label="Monthly Est."
          icon="📊"
          value={monthlyM3.toFixed(1)}
          unit="m³/month"
        />
        <KPICard
          label="Monthly Cost"
          icon="💰"
          value={formatCurrency(monthlyM3 * settings.waterRate, settings.currency)}
          unit="/month"
        />
      </div>

      {/* Per-meter gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {meters.map((meter) => (
          <div
            key={meter.entityId}
            className="bg-ha-card rounded-xl p-4 shadow-sm border border-ha-divider"
          >
            <div className="text-sm text-ha-text-secondary font-medium mb-1">
              {meter.label}
            </div>
            <div className="text-2xl font-bold text-ha-text">
              {meter.dailyUsage.toFixed(1)}
              <span className="text-sm font-normal text-ha-text-secondary ml-1">L/day</span>
            </div>
            <div className="text-xs text-ha-text-secondary mt-1">
              Meter: {meter.currentReading.toFixed(3)} {meter.unit}
            </div>
          </div>
        ))}
      </div>

      {/* Stacked Breakdown Chart */}
      <div className="bg-ha-card rounded-xl p-4 shadow-sm border border-ha-divider">
        <h3 className="text-sm font-semibold text-ha-text-secondary mb-3">
          Usage by Location (Hot vs Cold)
        </h3>
        <WaterBreakdown meters={meters} />
      </div>

      {/* Hot/Cold Ratio */}
      <div className="bg-ha-card rounded-xl p-4 shadow-sm border border-ha-divider">
        <h3 className="text-sm font-semibold text-ha-text-secondary mb-3">Hot vs Cold Ratio</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-4 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-blue-400 transition-all"
                style={{ width: `${100 - hotRatio}%` }}
              />
              <div
                className="h-full bg-red-400 transition-all"
                style={{ width: `${hotRatio}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-ha-text-secondary mt-1">
              <span>Cold: {coldTotal.toFixed(1)} L/day ({(100 - hotRatio).toFixed(0)}%)</span>
              <span>Hot: {hotTotal.toFixed(1)} L/day ({hotRatio.toFixed(0)}%)</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-ha-text-secondary mt-3">
          Higher hot water ratio means increased energy cost for water heating.
        </p>
      </div>

      {/* Reading History per Meter */}
      <div>
        <h3 className="text-sm font-semibold text-ha-text-secondary mb-3">Reading History</h3>
        <div className="space-y-4">
          {meterReadings.map(({ label, readings }) => (
            <div key={label}>
              <h4 className="text-sm font-medium text-ha-text mb-2">{label}</h4>
              <ReadingTimeline readings={readings} unit="m³" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
