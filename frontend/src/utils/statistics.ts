import type { StatisticValue, DailyConsumption } from "../types";

/** HA statistics `start` can be an ISO string or numeric timestamp (seconds). */
function toDate(start: string | number): Date {
  if (typeof start === "number") return new Date(start * 1000);
  return new Date(start);
}

export function statsToDaily(stats: StatisticValue[]): DailyConsumption[] {
  const dayMap = new Map<string, number>();

  for (const s of stats) {
    const day = toDate(s.start).toISOString().slice(0, 10);
    dayMap.set(day, (dayMap.get(day) || 0) + (s.change ?? 0));
  }

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }));
}

export function statsToHourlyHeatmap(stats: StatisticValue[]): { dayOfWeek: number; hour: number; value: number }[] {
  const grid = new Map<string, { sum: number; count: number }>();

  for (const s of stats) {
    const d = toDate(s.start);
    const key = `${d.getDay()}-${d.getHours()}`;
    const existing = grid.get(key) || { sum: 0, count: 0 };
    existing.sum += s.change ?? 0;
    existing.count += 1;
    grid.set(key, existing);
  }

  const result: { dayOfWeek: number; hour: number; value: number }[] = [];
  for (const [key, { sum, count }] of grid.entries()) {
    const [dow, hour] = key.split("-").map(Number);
    result.push({ dayOfWeek: dow, hour, value: Math.round((sum / count) * 100) / 100 });
  }

  return result;
}

export function currentMonthTotal(stats: DailyConsumption[]): number {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return stats
    .filter((s) => String(s.date).startsWith(monthPrefix))
    .reduce((sum, s) => sum + s.value, 0);
}

export function dailyAverage(stats: DailyConsumption[], lastNDays: number = 30): number {
  const recent = stats.slice(-lastNDays);
  if (recent.length === 0) return 0;
  return recent.reduce((sum, s) => sum + s.value, 0) / recent.length;
}

export function monthOverMonthChange(monthlyStats: DailyConsumption[]): number | null {
  if (monthlyStats.length < 2) return null;
  const current = monthlyStats[monthlyStats.length - 1].value;
  const previous = monthlyStats[monthlyStats.length - 2].value;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
