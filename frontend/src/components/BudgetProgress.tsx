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
}

export function BudgetProgress({
  label,
  current,
  budget,
  unit,
  cost,
  currency,
  projected,
}: BudgetProgressProps) {
  const percent = budget > 0 ? (current / budget) * 100 : 0;

  // Expected position marker: how far through the month are we?
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const expectedPercent = (dayOfMonth / daysInMonth) * 100;

  // Status determination
  const isOver = percent > 100;
  const isPaceWarning = !isOver && projected > budget;
  const status = isOver ? "over" : isPaceWarning ? "warning" : "good";

  const statusConfig = {
    over: {
      barColor: "bg-ha-error",
      icon: <AlertCircleIcon className="w-3.5 h-3.5" />,
      text: "Over budget",
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
      text: "On track",
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

      {/* Progress Bar with Expected Marker */}
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        {percent > 0 && (
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${cfg.barColor}`}
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        )}
        {/* Expected position marker */}
        <div
          className="absolute top-0 h-full w-1 bg-ha-text/40 rounded-full"
          style={{ left: `${expectedPercent}%` }}
          title={`Expected: ${expectedPercent.toFixed(0)}% through the month`}
        />
      </div>

      {/* Status Row */}
      <div className="flex justify-between items-center mt-1.5">
        <p className="text-xs text-ha-text-secondary">
          Projected: {projected.toFixed(1)} {unit} / {budget} {unit} budget
        </p>
        <span className={`flex items-center gap-1 text-xs font-medium ${cfg.textColor}`}>
          {cfg.icon}
          {cfg.text}
        </span>
      </div>
    </div>
  );
}
