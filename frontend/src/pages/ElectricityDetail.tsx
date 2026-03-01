import React, { useMemo, useState } from "react";
import { useStatistics } from "../hooks/useStatistics";
import { useDevices } from "../hooks/useDevices";
import { useHass } from "../hooks/useHass";
import { ConsumptionBar } from "../components/ConsumptionBar";
import { DevicePie } from "../components/DevicePie";
import { CostSummary } from "../components/CostSummary";
import { ForecastLine } from "../components/ForecastLine";
import { HeatmapGrid } from "../components/HeatmapGrid";
import { ReadingTimeline } from "../components/ReadingTimeline";
import { statsToHourlyHeatmap, currentMonthTotal } from "../utils/statistics";
import { forecast } from "../utils/forecast";
import { dailyCost, monthlyCost, annualProjection } from "../utils/cost";
import type { DashboardSettings } from "../types";

interface ElectricityDetailProps {
  settings: DashboardSettings;
}

const RANGE_OPTIONS = [
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "1 year", value: 365 },
];

export function ElectricityDetail({ settings }: ElectricityDetailProps) {
  const [range, setRange] = useState(30);
  const { hourlyStats, dailyStats, monthlyStats, loading } = useStatistics(range);
  const { devices } = useDevices(range);
  const hass = useHass();

  const elecForecast = useMemo(() => forecast(dailyStats), [dailyStats]);
  const heatmapData = useMemo(() => statsToHourlyHeatmap(hourlyStats), [hourlyStats]);
  const monthTotal = useMemo(() => currentMonthTotal(dailyStats), [dailyStats]);

  // Parse readings from the electricity meter entity
  const readings = useMemo(() => {
    const entity = hass.states["sensor.utility_manual_tracking_electricity_meter_energy"];
    if (!entity) return [];

    try {
      const previousReads = JSON.parse(entity.attributes.previous_reads || "[]") as {
        value: number;
        timestamp: string;
      }[];
      const result: { value: number; date: string; delta?: number; cost?: number }[] = [];

      for (let i = 0; i < previousReads.length; i++) {
        const r = previousReads[i];
        const date = new Date(r.timestamp).toLocaleDateString();
        const delta = i > 0 ? r.value - previousReads[i - 1].value : undefined;
        const cost = delta != null ? delta * settings.electricityRate : undefined;
        result.push({ value: r.value, date, delta, cost });
      }

      // Add current reading
      const currentValue = parseFloat(entity.state);
      if (!isNaN(currentValue) && previousReads.length > 0) {
        const lastRead = previousReads[previousReads.length - 1];
        const delta = currentValue - lastRead.value;
        result.push({
          value: currentValue,
          date: "Current",
          delta,
          cost: delta * settings.electricityRate,
        });
      }

      return result.reverse();
    } catch {
      return [];
    }
  }, [hass.states, settings.electricityRate]);

  const totalConsumption = useMemo(
    () => dailyStats.reduce((s, d) => s + d.value, 0),
    [dailyStats]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ha-text-secondary">Loading electricity data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Range Selector */}
      <div className="flex gap-2">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setRange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              range === opt.value
                ? "bg-ha-primary text-white"
                : "bg-ha-card text-ha-text-secondary border border-ha-divider hover:bg-gray-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Daily Consumption Chart */}
      <div className="bg-ha-card rounded-xl p-4 shadow-sm border border-ha-divider">
        <h3 className="text-sm font-semibold text-ha-text-secondary mb-3">
          Daily Consumption — Last {range} Days
        </h3>
        <ConsumptionBar data={dailyStats} unit="kWh" />
      </div>

      {/* Cost + Device Breakdown Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CostSummary
          dailyCost={dailyCost(elecForecast.dailyRate, settings.electricityRate)}
          monthlyCost={monthlyCost(dailyStats, settings.electricityRate)}
          annualProjection={annualProjection(elecForecast.dailyRate, settings.electricityRate)}
          currency={settings.currency}
        />
        <div className="bg-ha-card rounded-xl p-4 shadow-sm border border-ha-divider">
          <h3 className="text-sm font-semibold text-ha-text-secondary mb-3">Device Breakdown</h3>
          <DevicePie devices={devices} totalConsumption={totalConsumption} height={250} />
        </div>
      </div>

      {/* Forecast */}
      <div className="bg-ha-card rounded-xl p-4 shadow-sm border border-ha-divider">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-ha-text-secondary">
            Trend & Forecast
          </h3>
          <div className="text-sm text-ha-text-secondary">
            R² = {elecForecast.confidence.toFixed(2)} · Annual projection: {elecForecast.annualForecast.toLocaleString()} kWh
            ({settings.currency}{annualProjection(elecForecast.dailyRate, settings.electricityRate).toLocaleString()})
          </div>
        </div>
        <ForecastLine data={dailyStats} unit="kWh" />
      </div>

      {/* Heatmap */}
      {heatmapData.length > 0 && (
        <div className="bg-ha-card rounded-xl p-4 shadow-sm border border-ha-divider">
          <h3 className="text-sm font-semibold text-ha-text-secondary mb-3">
            Consumption Heatmap (Hour × Day of Week)
          </h3>
          <HeatmapGrid data={heatmapData} />
        </div>
      )}

      {/* Monthly Comparison */}
      {monthlyStats.length > 0 && (
        <div className="bg-ha-card rounded-xl p-4 shadow-sm border border-ha-divider">
          <h3 className="text-sm font-semibold text-ha-text-secondary mb-3">Monthly Totals</h3>
          <ConsumptionBar data={monthlyStats} unit="kWh" showDataZoom={false} />
        </div>
      )}

      {/* Reading History */}
      {readings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ha-text-secondary mb-3">Reading History</h3>
          <ReadingTimeline readings={readings} unit="kWh" currency={settings.currency} />
        </div>
      )}
    </div>
  );
}
