import React from "react";
import { formatCurrency } from "../utils/cost";
import { CheckCircleIcon, AlertTriangleIcon, AlertCircleIcon } from "./ui/Icons";

interface BudgetProgressProps {
  label: string;
  current: number;
  budget: number;
  unit: string;
  cost: number;
  currency: string;
  projected: number;
  isComplete?: boolean;
  rangeStart?: string;
  rangeEnd?: string;
}

export function BudgetProgress({
  label,
  current,
  budget,
  unit,
  cost,
  currency,
  projected,
  isComplete = false,
  rangeStart,
  rangeEnd,
}: BudgetProgressProps) {
  const percent = budget > 0 ? (current / budget) * 100 : 0;

  // Expected position: how far through the period are we?
  let expectedPercent: number;
  if (isComplete) {
    expectedPercent = 100;
  } else if (rangeStart && rangeEnd) {
    const now = new Date();
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    const totalMs = end.getTime() - start.getTime();
    const elapsedMs = Math.max(0, now.getTime() - start.getTime());
    expectedPercent = totalMs > 0 ? Math.min(100, (elapsedMs / totalMs) * 100) : 0;
  } else {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    expectedPercent = (dayOfMonth / daysInMonth) * 100;
  }

  // Status
  const isOver = percent > 100;
  const isPaceWarning = !isOver && !isComplete && projected > budget;
  const status = isOver ? "over" : isPaceWarning ? "warning" : "good";

  const statusConfig = {
    over: {
      barColor: "bg-ha-error",
      icon: <AlertCircleIcon className="w-3.5 h-3.5" />,
      text: isComplete ? "Over budget" : "Over budget",
      textColor: "text-ha-error",
    },
    warning: {
      barColor: "bg-ha-warning",
      icon: <AlertTriangleIcon className="w-3.5 h-3.5" />,
      text: "Over pace",
      textColor: "text-ha-warning",
    },
    good: {
      barColor: "bg-ha-success",
      icon: <CheckCircleIcon className="w-3.5 h-3.5" />,
      text: isComplete ? "Under budget" : "On track",
      textColor: "text-ha-success",
    },
  };

  const cfg = statusConfig[status];

  return (
    <div>
      {/* Label Row */}
      <div className="flex justify-between items-center text-sm mb-1.5">
        <span className="text-ha-text font-medium">
          {label}: {current.toFixed(1)} {unit} ({formatCurrency(cost, currency)})
        </span>
        <span className="text-ha-text-secondary tabular-nums">
          {Math.min(100, Math.round(percent))}% of budget
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        {percent > 0 && (
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${cfg.barColor}`}
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        )}
        {/* Expected position marker — only for in-progress periods */}
        {!isComplete && expectedPercent > 0 && expectedPercent < 100 && (
          <div
            className="absolute top-0 h-full flex items-center"
            style={{ left: `${expectedPercent}%`, transform: "translateX(-50%)" }}
          >
            <div className="w-0.5 h-full bg-ha-text/50 rounded-full" />
          </div>
        )}
      </div>

      {/* Status Row */}
      <div className="flex justify-between items-center mt-1.5">
        <p className="text-xs text-ha-text-secondary">
          {isComplete
            ? `Final: ${current.toFixed(1)} ${unit} / ${budget} ${unit} budget`
            : `Projected: ${projected.toFixed(1)} ${unit} / ${budget} ${unit} budget`
          }
        </p>
        <span className={`flex items-center gap-1 text-xs font-medium ${cfg.textColor}`}>
          {cfg.icon}
          {cfg.text}
        </span>
      </div>
    </div>
  );
}
