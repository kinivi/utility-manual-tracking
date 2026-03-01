import type { AnomalyResult } from "../types";

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function detectAnomaly(dailyValues: number[], sensitivity: number = 2): AnomalyResult {
  if (dailyValues.length < 7) {
    return { isAnomaly: false, zScore: 0, message: "Not enough data", severity: "normal" };
  }

  const window = dailyValues.slice(-30);
  const latest = window[window.length - 1];
  const historical = window.slice(0, -1);

  const m = mean(historical);
  const s = stddev(historical);

  if (s === 0) {
    return { isAnomaly: false, zScore: 0, message: "Stable consumption", severity: "normal" };
  }

  const z = (latest - m) / s;

  let severity: AnomalyResult["severity"] = "normal";
  let message = "Normal consumption";

  if (Math.abs(z) > sensitivity * 1.5) {
    severity = "critical";
    message = z > 0 ? "Very high consumption detected" : "Very low consumption detected";
  } else if (Math.abs(z) > sensitivity) {
    severity = "warning";
    message = z > 0 ? "Unusually high consumption" : "Unusually low consumption";
  }

  return {
    isAnomaly: Math.abs(z) > sensitivity,
    zScore: Math.round(z * 100) / 100,
    message,
    severity,
  };
}

export function detectAnomalies(dailyValues: number[], sensitivity: number = 2): { index: number; anomaly: AnomalyResult }[] {
  const results: { index: number; anomaly: AnomalyResult }[] = [];

  for (let i = 7; i < dailyValues.length; i++) {
    const windowSlice = dailyValues.slice(0, i + 1);
    const result = detectAnomaly(windowSlice, sensitivity);
    if (result.isAnomaly) {
      results.push({ index: i, anomaly: result });
    }
  }

  return results;
}
