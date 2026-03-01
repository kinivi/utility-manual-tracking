import type { DailyConsumption } from "../types";

export function dailyCost(consumption: number, rate: number): number {
  return Math.round(consumption * rate * 100) / 100;
}

export function monthlyCost(dailyConsumption: DailyConsumption[], rate: number, month?: string): number {
  const prefix = month || currentMonthPrefix();
  const total = dailyConsumption
    .filter((d) => String(d.date).startsWith(prefix))
    .reduce((sum, d) => sum + d.value, 0);
  return Math.round(total * rate * 100) / 100;
}

export function annualProjection(dailyRate: number, rate: number): number {
  return Math.round(dailyRate * 365.25 * rate);
}

export function budgetProgress(currentTotal: number, budget: number): {
  percent: number;
  status: "good" | "warning" | "over";
  projected: number;
} {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const dailyAvg = dayOfMonth > 0 ? currentTotal / dayOfMonth : 0;
  const projected = dailyAvg * daysInMonth;
  const percent = budget > 0 ? (currentTotal / budget) * 100 : 0;

  let status: "good" | "warning" | "over" = "good";
  if (percent > 100) status = "over";
  else if (projected > budget) status = "warning";

  return { percent: Math.round(percent), status, projected: Math.round(projected * 10) / 10 };
}

export function formatCurrency(value: number, currency: string = "\u20ac"): string {
  return `${currency}${value.toFixed(2)}`;
}

export function formatNumber(value: number, decimals: number = 1): string {
  return value.toFixed(decimals);
}

function currentMonthPrefix(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
