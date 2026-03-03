import React from "react";
import { formatCurrency } from "../utils/cost";
import { Card } from "./ui/Card";

interface CostSummaryProps {
  dailyCost: number;
  monthlyCost: number;
  annualProjection: number;
  currency: string;
}

export function CostSummary({ dailyCost, monthlyCost, annualProjection, currency }: CostSummaryProps) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-ha-text-secondary mb-3">Cost Summary</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-ha-text-secondary text-sm">Daily</span>
          <span className="text-lg font-semibold text-ha-text tabular-nums">{formatCurrency(dailyCost, currency)}</span>
        </div>
        <div className="h-px bg-ha-divider" />
        <div className="flex justify-between items-center">
          <span className="text-ha-text-secondary text-sm">This Month</span>
          <span className="text-lg font-semibold text-ha-text tabular-nums">{formatCurrency(monthlyCost, currency)}</span>
        </div>
        <div className="h-px bg-ha-divider" />
        <div className="flex justify-between items-center">
          <span className="text-ha-text-secondary text-sm">Annual Projection</span>
          <span className="text-lg font-bold text-ha-primary tabular-nums">{formatCurrency(annualProjection, currency)}</span>
        </div>
      </div>
    </Card>
  );
}
