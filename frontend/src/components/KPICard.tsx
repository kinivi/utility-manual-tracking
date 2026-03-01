import React from "react";

interface KPICardProps {
  label: string;
  value: string | number;
  unit: string;
  trend?: { direction: "up" | "down" | "stable"; percent: number };
  icon?: string;
  color?: string;
}

export function KPICard({ label, value, unit, trend, icon, color }: KPICardProps) {
  const trendColor = trend
    ? trend.direction === "up"
      ? "text-ha-warning"
      : trend.direction === "down"
      ? "text-ha-success"
      : "text-ha-text-secondary"
    : "";
  const trendArrow = trend
    ? trend.direction === "up"
      ? "↗"
      : trend.direction === "down"
      ? "↘"
      : "→"
    : "";

  return (
    <div className="bg-ha-card rounded-xl p-4 shadow-sm border border-ha-divider">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="text-sm text-ha-text-secondary font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold" style={color ? { color } : undefined}>
          {typeof value === "number" ? value.toFixed(1) : value}
        </span>
        <span className="text-sm text-ha-text-secondary">{unit}</span>
      </div>
      {trend && (
        <div className={`mt-1 text-sm font-medium ${trendColor}`}>
          {trendArrow} {trend.percent > 0 ? "+" : ""}{trend.percent.toFixed(1)}%
        </div>
      )}
    </div>
  );
}
