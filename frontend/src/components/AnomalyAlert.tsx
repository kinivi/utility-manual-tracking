import React from "react";
import type { AnomalyResult } from "../types";

interface AnomalyAlertProps {
  anomaly: AnomalyResult;
}

export function AnomalyAlert({ anomaly }: AnomalyAlertProps) {
  const bgColor =
    anomaly.severity === "critical"
      ? "bg-red-50 border-red-300"
      : anomaly.severity === "warning"
      ? "bg-amber-50 border-amber-300"
      : "bg-green-50 border-green-300";

  const iconColor =
    anomaly.severity === "critical"
      ? "text-red-600"
      : anomaly.severity === "warning"
      ? "text-amber-600"
      : "text-green-600";

  const icon =
    anomaly.severity === "critical" ? "!!" : anomaly.severity === "warning" ? "!" : "\u2713";

  return (
    <div className={`rounded-xl p-4 border shadow-sm ${bgColor}`}>
      <div className="flex items-start gap-3">
        <div className={`text-2xl font-bold ${iconColor}`}>{icon}</div>
        <div>
          <h3 className="text-sm font-semibold text-ha-text">Anomaly Detection</h3>
          <p className="text-sm text-ha-text-secondary mt-1">{anomaly.message}</p>
          {anomaly.zScore !== 0 && (
            <p className="text-xs text-ha-text-secondary mt-1">
              Z-score: {anomaly.zScore.toFixed(2)} (last 30 days)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
