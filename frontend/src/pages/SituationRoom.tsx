import React, { useMemo } from "react";
import { useStatistics } from "../hooks/useStatistics";
import { useWaterMeters } from "../hooks/useWaterMeters";
import { useDevices } from "../hooks/useDevices";
import { KPICard } from "../components/KPICard";
import { ConsumptionBar } from "../components/ConsumptionBar";
import { RangeGauge } from "../components/RangeGauge";
import { AnomalyAlert } from "../components/AnomalyAlert";
import { dailyAverage, currentMonthTotal } from "../utils/statistics";
import { forecast } from "../utils/forecast";
import { detectAnomaly } from "../utils/anomaly";
import { dailyCost, monthlyCost, budgetProgress, formatCurrency } from "../utils/cost";
import type { DashboardSettings } from "../types";

interface SituationRoomProps {
  settings: DashboardSettings;
}

export function SituationRoom({ settings }: SituationRoomProps) {
  const { dailyStats, loading: elecLoading } = useStatistics(30);
  const { meters, totalDaily } = useWaterMeters();
  const { devices } = useDevices(30);

  const elecForecast = useMemo(() => forecast(dailyStats), [dailyStats]);

  const elecAnomaly = useMemo(
    () => detectAnomaly(dailyStats.map((d) => d.value), settings.anomalySensitivity),
    [dailyStats, settings.anomalySensitivity]
  );

  const elecMonthTotal = useMemo(() => currentMonthTotal(dailyStats), [dailyStats]);
  const elecDailyAvg = useMemo(() => dailyAverage(dailyStats), [dailyStats]);

  const elecBudget = useMemo(
    () => budgetProgress(elecMonthTotal, settings.monthlyElectricityBudget),
    [elecMonthTotal, settings.monthlyElectricityBudget]
  );

  // Standard deviation for gauge (from daily values)
  const elecStdDev = useMemo(() => {
    const values = dailyStats.map((d) => d.value);
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
  }, [dailyStats]);

  if (elecLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ha-text-secondary">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Electricity"
          icon="⚡"
          value={elecForecast.dailyRate}
          unit="kWh/day"
          trend={{
            direction: elecForecast.trendDirection,
            percent: elecForecast.trendPercent,
          }}
        />
        <KPICard
          label="Elec. Cost"
          icon="💰"
          value={formatCurrency(dailyCost(elecForecast.dailyRate, settings.electricityRate), settings.currency)}
          unit="/day"
          color="#ff9800"
        />
        <KPICard
          label="Water"
          icon="💧"
          value={totalDaily}
          unit="L/day"
          color="#42a5f5"
        />
        <KPICard
          label="Water Cost"
          icon="💰"
          value={formatCurrency(dailyCost(totalDaily / 1000, settings.waterRate), settings.currency)}
          unit="/day"
          color="#42a5f5"
        />
      </div>

      {/* Month to Date Progress */}
      <div className="bg-ha-card rounded-xl p-4 shadow-sm border border-ha-divider">
        <h3 className="text-sm font-semibold text-ha-text-secondary mb-3">Month to Date</h3>
        <div className="space-y-4">
          {/* Electricity progress */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-ha-text">
                Electricity: {elecMonthTotal.toFixed(1)} kWh ({formatCurrency(monthlyCost(dailyStats, settings.electricityRate), settings.currency)})
              </span>
              <span className="text-ha-text-secondary">{elecBudget.percent}% of budget</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  elecBudget.status === "over"
                    ? "bg-red-500"
                    : elecBudget.status === "warning"
                    ? "bg-amber-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(100, elecBudget.percent)}%` }}
              />
            </div>
            <p className="text-xs text-ha-text-secondary mt-1">
              Projected: {elecBudget.projected.toFixed(1)} kWh / {settings.monthlyElectricityBudget} kWh budget
            </p>
          </div>

          {/* Water progress (approximate) */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-ha-text">
                Water: ~{(totalDaily * new Date().getDate() / 1000).toFixed(1)} m³ this month
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{
                  width: `${Math.min(100, ((totalDaily * new Date().getDate() / 1000) / settings.monthlyWaterBudget) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-ha-text-secondary mt-1">
              Budget: {settings.monthlyWaterBudget} m³/month
            </p>
          </div>
        </div>
      </div>

      {/* Gauge + Anomaly */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RangeGauge
          current={elecForecast.dailyRate}
          average={elecDailyAvg}
          stdDev={elecStdDev}
          unit="kWh"
          label="Daily Consumption Range"
        />
        <AnomalyAlert anomaly={elecAnomaly} />
      </div>

      {/* 30-Day Consumption Chart */}
      <div className="bg-ha-card rounded-xl p-4 shadow-sm border border-ha-divider">
        <h3 className="text-sm font-semibold text-ha-text-secondary mb-3">Last 30 Days — Electricity</h3>
        <ConsumptionBar data={dailyStats} unit="kWh" showDataZoom={false} />
      </div>
    </div>
  );
}
