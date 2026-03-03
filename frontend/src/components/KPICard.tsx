import React from "react";
import { Sparkline } from "./ui/Sparkline";
import { TrendUpIcon, TrendDownIcon, TrendFlatIcon } from "./ui/Icons";

interface KPICardProps {
  label: string;
  value: string | number;
  unit: string;
  /** Color for left accent border */
  borderColor?: string;
  /** Secondary value shown below primary */
  secondaryValue?: string;
  secondaryLabel?: string;
  trend?: { direction: "up" | "down" | "stable"; percent: number };
  comparison?: string;
  sparklineData?: number[];
  icon?: React.ReactNode;
  onClick?: () => void;
}

export function KPICard({
  label,
  value,
  unit,
  borderColor,
  secondaryValue,
  secondaryLabel,
  trend,
  comparison,
  sparklineData,
  icon,
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
    if (typeof value === "string") return value;
    if (!Number.isFinite(value)) return "—";
    if (value === 0) return "—";
    return value.toFixed(1);
  })();

  const Wrapper = onClick ? "button" : "div";
  const wrapperProps = onClick
    ? {
        onClick,
        type: "button" as const,
        className:
          "w-full text-left bg-ha-card rounded-xl p-4 border border-ha-divider border-l-4 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ha-primary/30 cursor-pointer",
      }
    : {
        className:
          "bg-ha-card rounded-xl p-4 border border-ha-divider border-l-4",
      };

  return (
    <Wrapper
      {...wrapperProps}
      style={{ borderLeftColor: borderColor || "var(--primary-color, #03a9f4)" }}
    >
      {/* Top row: icon + label + sparkline */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {icon && <span className="opacity-50">{icon}</span>}
          <span className="text-[10px] font-semibold text-ha-text-secondary uppercase tracking-wider">
            {label}
          </span>
        </div>
        {sparklineData && sparklineData.length >= 2 && (
          <Sparkline
            data={sparklineData}
            color={borderColor || "currentColor"}
            width={64}
            height={24}
          />
        )}
      </div>

      {/* Primary value */}
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="text-2xl font-bold tabular-nums text-ha-text">
          {displayValue}
        </span>
        <span className="text-xs text-ha-text-secondary">{unit}</span>
      </div>

      {/* Secondary value */}
      {secondaryValue && (
        <div className="text-sm text-ha-text-secondary tabular-nums mt-0.5">
          {secondaryLabel && (
            <span className="text-[10px] uppercase tracking-wider mr-1">{secondaryLabel}</span>
          )}
          {secondaryValue}
        </div>
      )}

      {/* Trend */}
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${trendColor}`}>
          {TrendIcon && <TrendIcon />}
          <span>{trend.percent > 0 ? "+" : ""}{trend.percent.toFixed(1)}%</span>
        </div>
      )}

      {/* Comparison */}
      {comparison && (
        <div className="text-[10px] text-ha-text-secondary mt-0.5">{comparison}</div>
      )}
    </Wrapper>
  );
}
