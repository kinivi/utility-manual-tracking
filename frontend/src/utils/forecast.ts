import type { ForecastResult, DailyConsumption } from "../types";

function linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0]?.y ?? 0, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const { x, y } of data) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const ssTot = sumY2 - (sumY * sumY) / n;
  const ssRes = data.reduce((sum, { x, y }) => {
    const predicted = slope * x + intercept;
    return sum + (y - predicted) ** 2;
  }, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2: Math.max(0, r2) };
}

export function forecast(daily: DailyConsumption[]): ForecastResult {
  if (daily.length === 0) {
    return { dailyRate: 0, monthlyForecast: 0, annualForecast: 0, confidence: 0, trendDirection: "stable", trendPercent: 0 };
  }

  const data = daily.map((d, i) => ({ x: i, y: d.value }));
  const { slope, intercept, r2 } = linearRegression(data);

  // Current daily rate (latest point on regression line)
  const dailyRate = slope * (data.length - 1) + intercept;

  // Trend: compare last 7 days avg to previous 7 days avg
  const last7 = daily.slice(-7);
  const prev7 = daily.slice(-14, -7);
  const avgLast = last7.reduce((s, d) => s + d.value, 0) / (last7.length || 1);
  const avgPrev = prev7.length > 0 ? prev7.reduce((s, d) => s + d.value, 0) / prev7.length : avgLast;
  const trendPercent = avgPrev > 0 ? ((avgLast - avgPrev) / avgPrev) * 100 : 0;

  let trendDirection: "up" | "down" | "stable" = "stable";
  if (trendPercent > 2) trendDirection = "up";
  else if (trendPercent < -2) trendDirection = "down";

  return {
    dailyRate: Math.round(dailyRate * 10) / 10,
    monthlyForecast: Math.round(dailyRate * 30.44 * 10) / 10,
    annualForecast: Math.round(dailyRate * 365.25),
    confidence: Math.round(r2 * 100) / 100,
    trendDirection,
    trendPercent: Math.round(trendPercent * 10) / 10,
  };
}
