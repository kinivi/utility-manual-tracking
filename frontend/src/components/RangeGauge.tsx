import React from "react";
import { Card } from "./ui/Card";
import { EmptyState } from "./ui/EmptyState";
import { BoltIcon } from "./ui/Icons";

interface RangeGaugeProps {
  current: number;
  average: number;
  stdDev: number;
  unit: string;
  label: string;
}

export function RangeGauge({ current, average, stdDev, unit, label }: RangeGaugeProps) {
  if (average === 0 && current === 0) {
    return (
      <Card>
        <EmptyState
          icon={<BoltIcon className="w-8 h-8" />}
          title="No range data"
          description="Need more daily data points to show consumption range."
        />
      </Card>
    );
  }
  // Calculate position on a scale: average +/- 2 standard deviations
  const min = Math.max(0, average - 2 * stdDev);
  const max = average + 2 * stdDev;
  const range = max - min;
  const percent = range > 0 ? Math.min(100, Math.max(0, ((current - min) / range) * 100)) : 50;

  let status: string;
  let statusColor: string;
  if (current <= average - stdDev) {
    status = "LOW";
    statusColor = "text-ha-primary";
  } else if (current >= average + stdDev) {
    status = "HIGH";
    statusColor = "text-ha-error";
  } else {
    status = "NORMAL";
    statusColor = "text-ha-success";
  }

  return (
    <div className="bg-ha-card rounded-xl p-4 shadow-sm border border-ha-divider">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-ha-text-secondary">{label}</span>
        <span className={`text-sm font-bold ${statusColor}`}>{status}</span>
      </div>

      <div className="relative h-3 rounded-full overflow-hidden bg-gradient-to-r from-blue-300 via-green-400 to-red-400 mb-2">
        <div
          className="absolute top-0 w-3 h-3 bg-white rounded-full border-2 border-gray-800 shadow-md transform -translate-x-1/2"
          style={{ left: `${percent}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-ha-text-secondary">
        <span>{min.toFixed(1)}</span>
        <span>avg: {average.toFixed(1)} {unit}</span>
        <span>{max.toFixed(1)}</span>
      </div>

      <div className="mt-2 text-center">
        <span className="text-xl font-bold text-ha-text">{current.toFixed(1)}</span>
        <span className="text-sm text-ha-text-secondary ml-1">{unit}/day</span>
      </div>
    </div>
  );
}
