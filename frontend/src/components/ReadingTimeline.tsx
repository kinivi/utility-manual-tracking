import React from "react";
import { formatCurrency } from "../utils/cost";
import { Card } from "./ui/Card";
import { EmptyState } from "./ui/EmptyState";
import { CalendarIcon } from "./ui/Icons";

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
      <Card>
        <EmptyState icon={<CalendarIcon className="w-8 h-8" />} title="No readings" description="No readings available yet." />
      </Card>
    );
  }

  return (
    <Card className="!p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-ha-divider">
            <th className="text-left p-3 font-semibold text-ha-text-secondary">Date</th>
            <th className="text-right p-3 font-semibold text-ha-text-secondary">Reading</th>
            <th className="text-right p-3 font-semibold text-ha-text-secondary hidden sm:table-cell">Delta</th>
            {currency && <th className="text-right p-3 font-semibold text-ha-text-secondary hidden sm:table-cell">Cost</th>}
          </tr>
        </thead>
        <tbody>
          {readings.map((r, i) => (
            <tr key={i} className="border-b border-ha-divider last:border-0">
              <td className="p-3 text-ha-text">{r.date}</td>
              <td className="p-3 text-right text-ha-text tabular-nums font-mono">
                {r.value.toFixed(1)} {unit}
              </td>
              <td className="p-3 text-right text-ha-text-secondary tabular-nums font-mono hidden sm:table-cell">
                {r.delta != null ? `${r.delta >= 0 ? "+" : ""}${r.delta.toFixed(1)} ${unit}` : "N/A"}
              </td>
              {currency && (
                <td className="p-3 text-right text-ha-text tabular-nums font-mono hidden sm:table-cell">
                  {r.cost != null ? formatCurrency(r.cost, currency) : "N/A"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
