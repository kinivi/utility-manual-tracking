import React from "react";
import { formatCurrency } from "../utils/cost";

interface Reading {
  value: number;
  date: string;
  delta?: number;
  cost?: number;
}

interface ReadingTimelineProps {
  readings: Reading[];
  unit: string;
  currency?: string;
}

export function ReadingTimeline({ readings, unit, currency = "\u20ac" }: ReadingTimelineProps) {
  if (readings.length === 0) {
    return (
      <div className="bg-ha-card rounded-xl p-4 shadow-sm border border-ha-divider text-center text-ha-text-secondary text-sm">
        No readings available
      </div>
    );
  }

  return (
    <div className="bg-ha-card rounded-xl shadow-sm border border-ha-divider overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-ha-divider">
            <th className="text-left p-3 font-semibold text-ha-text-secondary">Date</th>
            <th className="text-right p-3 font-semibold text-ha-text-secondary">Reading</th>
            <th className="text-right p-3 font-semibold text-ha-text-secondary">Delta</th>
            {currency && <th className="text-right p-3 font-semibold text-ha-text-secondary">Cost</th>}
          </tr>
        </thead>
        <tbody>
          {readings.map((r, i) => (
            <tr key={i} className="border-b border-ha-divider last:border-0">
              <td className="p-3 text-ha-text">{r.date}</td>
              <td className="p-3 text-right text-ha-text font-mono">
                {r.value.toFixed(1)} {unit}
              </td>
              <td className="p-3 text-right text-ha-text-secondary font-mono">
                {r.delta != null ? `+${r.delta.toFixed(1)} ${unit}` : "\u2014"}
              </td>
              {currency && (
                <td className="p-3 text-right text-ha-text font-mono">
                  {r.cost != null ? formatCurrency(r.cost, currency) : "\u2014"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
