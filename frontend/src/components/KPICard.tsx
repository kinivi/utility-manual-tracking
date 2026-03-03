import React from "react";
import { Card } from "./ui/Card";
import { Sparkline } from "./ui/Sparkline";
import { TrendUpIcon, TrendDownIcon, TrendFlatIcon } from "./ui/Icons";

interface KPICardProps {
  label: string;
  value: string | number;
  unit: string;
  trend?: { direction: "up" | "down" | "stable"; percent: number };
  comparison?: string;
  sparklineData?: number[];
  icon?: React.ReactNode;
  color?: string;
  onClick?: () => void;
}

export function KPICard({
  label,
  value,
  unit,
  trend,
  comparison,
  sparklineData,
  icon,
  color,
  onClick,
}: KPICardProps) {
  const trendColor = trend
    ? trend.direction === "up"
      ? "text-ha-warning"
      : trend.direction === "down"
      ? "text-ha-success"
      : "text-ha-text-secondary"
    : "";

  const TrendIcon = trend
    ? trend.direction === "up"
      ? TrendUpIcon
      : trend.direction === "down"
      ? TrendDownIcon
      : TrendFlatIcon
    : null;

  const displayValue = (() => {
    if (typeof value !== "number") return value;
    if (!Number.isFinite(value)) return "N/A";
    return value.toFixed(1);
  })();

  return (
    <Card onClick={onClick}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && <span className="text-ha-text-secondary">{icon}</span>}
          <span className="text-sm text-ha-text-secondary font-medium">{label}</span>
        </div>
        {sparklineData && sparklineData.length >= 2 && (
          <Sparkline
            data={sparklineData}
            color={color || "currentColor"}
            className="opacity-30"
          />
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className="text-3xl font-bold tabular-nums"
          style={color ? { color } : undefined}
        >
          {displayValue}
        </span>
        <span className="text-sm text-ha-text-secondary">{unit}</span>
      </div>
      {trend && (
        <div className={`mt-1 flex items-center gap-1 text-sm font-medium ${trendColor}`}>
          {TrendIcon && <TrendIcon />}
          <span>{trend.percent > 0 ? "+" : ""}{trend.percent.toFixed(1)}%</span>
        </div>
      )}
      {comparison && (
        <div className="text-xs text-ha-text-secondary mt-0.5">{comparison}</div>
      )}
    </Card>
  );
}
