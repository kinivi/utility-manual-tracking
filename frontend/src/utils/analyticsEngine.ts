/**
 * Analytics Engine.
 *
 * - `computeMetricsSync`: pure deterministic computation for Worker execution.
 * - `computeMetrics`: main-thread fallback that schedules compute work in idle time.
 */

import type {
  DailyConsumption,
  DeviceConsumption,
  UsageFunnelStage,
  MonthlyConsumptionPoint,
  UtilityType,
  DashboardMetrics,
} from "../types";
import { forecast } from "./forecast";
import { detectAnomaly } from "./anomaly";
import { currentMonthTotal } from "./statistics";
import { safeParseDate } from "./dateUtils";

// ---------- Idle scheduling ----------

const rIC =
  typeof requestIdleCallback === "function"
    ? requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 1);

function schedule<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => {
    rIC(() => resolve(fn()));
  });
}

// ---------- Funnel computation ----------

export function computeFunnelStages(
  totalUsage: number,
  knownDeviceUsage: number,
  rangeBudget: number
): UsageFunnelStage[] {
  if (totalUsage <= 0) return [];

  const normalizedKnown = Math.min(totalUsage, Math.max(0, knownDeviceUsage));
  const baseLoad = Math.max(0, totalUsage - normalizedKnown);
  const overBudget = Math.max(0, totalUsage - rangeBudget);

  const stages: UsageFunnelStage[] = [
    {
      id: "total",
      label: "Total Usage",
      value: +totalUsage.toFixed(1),
      percent: 100,
    },
    {
      id: "known",
      label: "Known Devices",
      value: +normalizedKnown.toFixed(1),
      percent: totalUsage > 0 ? +(normalizedKnown / totalUsage * 100).toFixed(1) : 0,
    },
    {
      id: "base",
      label: "Base Load",
      value: +baseLoad.toFixed(1),
      percent: totalUsage > 0 ? +(baseLoad / totalUsage * 100).toFixed(1) : 0,
    },
    {
      id: "over_budget",
      label: "Over Budget",
      value: +overBudget.toFixed(1),
      percent: totalUsage > 0 ? +(overBudget / totalUsage * 100).toFixed(1) : 0,
    },
  ];

  return stages;
}

// ---------- Monthly points ----------

export function computeMonthlyPoints(
  monthlyStats: DailyConsumption[],
  utility: UtilityType,
  rate: number,
  maxPoints = 12
): MonthlyConsumptionPoint[] {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const points = monthlyStats.map((s) => {
    const dt = safeParseDate(s.date);
    const monthIdx = dt.getMonth();
    const year = String(dt.getFullYear()).slice(2);
    return {
      monthKey: dt.toISOString().slice(0, 7),
      label: `${MONTHS[monthIdx]} '${year}`,
      usage: +s.value.toFixed(1),
      cost: +(s.value * rate).toFixed(2),
      utility,
      source: "actual" as const,
    };
  });

  return points
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .slice(-maxPoints);
}

// ---------- Full dashboard metrics ----------

export interface ComputeMetricsInput {
  dailyStats: DailyConsumption[];
  monthlyStats: DailyConsumption[];
  deviceTotals: DeviceConsumption[];
  baseLoadTotal: number;
  waterDailyL: number;
  settings: {
    electricityRate: number;
    waterRate: number;
    monthlyElectricityBudget: number;
    monthlyWaterBudget: number;
    anomalySensitivity: number;
    currency: string;
  };
  rangeDays: number;
}

export function computeMetricsSync(input: ComputeMetricsInput): DashboardMetrics {
  const {
    dailyStats,
    monthlyStats,
    deviceTotals,
    baseLoadTotal,
    waterDailyL,
    settings,
    rangeDays: days,
  } = input;

  const elecForecast = forecast(dailyStats);
  const elecMonthTotal = currentMonthTotal(dailyStats);

  const deviceTotal = deviceTotals.reduce((s, d) => s + d.value, 0) + baseLoadTotal;
  const effectiveMonthTotal = elecMonthTotal > 0 ? elecMonthTotal : deviceTotal;
  const effectiveDailyRate =
    elecForecast.dailyRate > 0
      ? elecForecast.dailyRate
      : deviceTotal / Math.max(1, days);

  const vals = dailyStats.map((d) => d.value);
  const anomaly = vals.length >= 7
    ? detectAnomaly(vals, settings.anomalySensitivity)
    : null;

  const sparkline =
    dailyStats.length >= 2
      ? dailyStats.slice(-7).map((d) => d.value)
      : monthlyStats.length >= 2
        ? monthlyStats.slice(-7).map((d) => d.value)
        : [];

  // Budget scaled to selected range length.
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const avgDailyBudget = settings.monthlyElectricityBudget / Math.max(1, daysInMonth);
  const rangeBudget = avgDailyBudget * Math.max(1, days);
  const knownDeviceTotal = deviceTotals.reduce((s, d) => s + d.value, 0);

  const funnelStages = computeFunnelStages(
    deviceTotal,
    knownDeviceTotal,
    rangeBudget
  );

  const monthlyPoints = computeMonthlyPoints(
    monthlyStats,
    "electricity",
    settings.electricityRate
  );

  // Water
  const waterMonthEstimate = (waterDailyL * dayOfMonth) / 1000; // L → m³

  // Year-to-date calculations
  const currentYear = String(now.getFullYear());
  const yearElecTotal = dailyStats
    .filter((d) => d.date.startsWith(currentYear))
    .reduce((s, d) => s + d.value, 0);
  const yearElecCost = +(yearElecTotal * settings.electricityRate).toFixed(2);

  const dayOfYear = Math.ceil(
    (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000
  );
  const yearWaterCostEstimate = +((waterDailyL / 1000) * Math.max(1, dayOfYear) * settings.waterRate).toFixed(2);
  const yearRunningCost = +(yearElecCost + yearWaterCostEstimate).toFixed(2);
  const dailyAvgCost = dayOfYear > 0 ? +(yearRunningCost / dayOfYear).toFixed(2) : 0;

  // Budget pace for current month
  const monthBudgetPercent = settings.monthlyElectricityBudget > 0
    ? +((effectiveMonthTotal / settings.monthlyElectricityBudget) * 100).toFixed(0)
    : 0;
  const daysRemaining = daysInMonth - dayOfMonth;
  const projectedMonth = dayOfMonth > 0
    ? (effectiveMonthTotal / dayOfMonth) * daysInMonth
    : 0;
  const budgetStatus: "good" | "warning" | "over" =
    monthBudgetPercent > 100 ? "over"
      : projectedMonth > settings.monthlyElectricityBudget ? "warning"
        : "good";

  return {
    electricity: {
      dailyRate: effectiveDailyRate,
      monthTotal: effectiveMonthTotal,
      monthCost: +(effectiveMonthTotal * settings.electricityRate).toFixed(2),
      yearTotal: +yearElecTotal.toFixed(1),
      yearCost: yearElecCost,
      forecast: elecForecast,
      sparkline,
      anomaly,
    },
    water: {
      dailyRate: waterDailyL,
      monthEstimate: +waterMonthEstimate.toFixed(2),
      monthCost: +(waterMonthEstimate * settings.waterRate).toFixed(2),
      yearCostEstimate: yearWaterCostEstimate,
    },
    yearRunningCost,
    dailyAvgCost,
    budgetPace: {
      percent: monthBudgetPercent,
      daysRemaining,
      status: budgetStatus,
    },
    funnelStages,
    monthlyPoints,
  };
}

export async function computeMetrics(
  input: ComputeMetricsInput
): Promise<DashboardMetrics> {
  return schedule(() => computeMetricsSync(input));
}
