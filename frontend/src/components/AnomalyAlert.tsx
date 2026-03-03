import React from "react";
import { AlertCircleIcon, AlertTriangleIcon, CheckCircleIcon } from "./ui/Icons";
import type { AnomalyResult } from "../types";

interface AnomalyAlertProps {
  anomaly: AnomalyResult;
}

export function AnomalyAlert({ anomaly }: AnomalyAlertProps) {
  const config = {
    critical: {
      bg: "bg-red-50 border-red-300",
      iconColor: "text-red-600",
      icon: <AlertCircleIcon className="w-6 h-6" />,
    },
    warning: {
      bg: "bg-amber-50 border-amber-300",
      iconColor: "text-amber-600",
      icon: <AlertTriangleIcon className="w-6 h-6" />,
    },
    normal: {
      bg: "bg-green-50 border-green-300",
      iconColor: "text-green-600",
      icon: <CheckCircleIcon className="w-6 h-6" />,
    },
  };

  const cfg = config[anomaly.severity];

  return (
    <div className={`rounded-xl p-4 border shadow-sm ${cfg.bg}`}>
      <div className="flex items-start gap-3">
        <div className={cfg.iconColor}>{cfg.icon}</div>
        <div>
          <h3 className="text-sm font-semibold text-ha-text">Anomaly Detection</h3>
          <p className="text-sm text-ha-text-secondary mt-1">{anomaly.message}</p>
          {anomaly.zScore !== 0 && (
            <p className="text-xs text-ha-text-secondary mt-1 tabular-nums">
              Z-score: {anomaly.zScore.toFixed(2)} (last 30 days)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
