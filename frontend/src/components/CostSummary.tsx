import React from "react";
import { formatCurrency } from "../utils/cost";

interface CostSummaryProps {
  dailyCost: number;
  monthlyCost: number;
  annualProjection: number;
  currency: string;
}

export function CostSummary({ dailyCost, monthlyCost, annualProjection, currency }: CostSummaryProps) {
  return (
    <div className="bg-ha-card rounded-xl p-4 shadow-sm border border-ha-divider">
      <h3 className="text-sm font-semibold text-ha-text-secondary mb-3">Cost Summary</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-ha-text-secondary text-sm">Daily</span>
          <span className="text-lg font-semibold text-ha-text">{formatCurrency(dailyCost, currency)}</span>
        </div>
        <div className="h-px bg-ha-divider" />
        <div className="flex justify-between items-center">
          <span className="text-ha-text-secondary text-sm">This Month</span>
          <span className="text-lg font-semibold text-ha-text">{formatCurrency(monthlyCost, currency)}</span>
        </div>
        <div className="h-px bg-ha-divider" />
        <div className="flex justify-between items-center">
          <span className="text-ha-text-secondary text-sm">Annual Projection</span>
          <span className="text-lg font-bold text-ha-primary">{formatCurrency(annualProjection, currency)}</span>
        </div>
      </div>
    </div>
  );
}
