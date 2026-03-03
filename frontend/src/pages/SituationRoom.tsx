import React, { useMemo } from "react";
import { useDashboardData } from "../hooks/useDashboardData";
import { useSettings } from "../hooks/useSettings";
import { useTimeRange } from "../hooks/useTimeRange";
import { KPICard } from "../components/KPICard";
import { MonthlyConsumptionLine } from "../components/MonthlyConsumptionLine";
import { UsageAttributionFunnel } from "../components/UsageAttributionFunnel";
import { BudgetProgress } from "../components/BudgetProgress";
import { EnergyFlowBar } from "../components/EnergyFlowBar";
import { ConsumptionBar } from "../components/ConsumptionBar";
import { Card } from "../components/ui/Card";
import { RefreshBadge, SkeletonOverviewPage } from "../components/ui/Skeleton";
import { BoltIcon, CoinsIcon, DropletIcon } from "../components/ui/Icons";
import { budgetProgress, formatCurrency, monthlyCost } from "../utils/cost";
import { computeMonthlyPoints } from "../utils/analyticsEngine";
import type { TabId, MonthlyConsumptionPoint } from "../types";

interface SituationRoomProps {
  onTabChange: (tab: TabId) => void;
}

export function SituationRoom({ onTabChange }: SituationRoomProps) {
  const { raw, metrics, loading, refreshing } = useDashboardData("situation");
  const { settings } = useSettings();
  const { resolved } = useTimeRange();

  const dailyStats = raw.electricity?.dailyStats ?? [];
  const monthlyStats = raw.electricity?.monthlyStats ?? [];
  const breakdown = raw.breakdown;

  // Budget progress
  const elecBudget = useMemo(
    () => budgetProgress(metrics?.electricity.monthTotal ?? 0, settings.monthlyElectricityBudget),
    [metrics, settings.monthlyElectricityBudget]
  );

  const waterMonthEstimate = metrics?.water.monthEstimate ?? 0;
  const waterBudget = useMemo(
    () => budgetProgress(waterMonthEstimate, settings.monthlyWaterBudget),
    [waterMonthEstimate, settings.monthlyWaterBudget]
  );

  // Monthly chart points
  const elecMonthlyPoints = useMemo(
    () => computeMonthlyPoints(monthlyStats, "electricity", settings.electricityRate, 12),
    [monthlyStats, settings.electricityRate]
  );

  // Water: estimated current month only (no recorder history)
  const waterMonthlyPoints = useMemo((): MonthlyConsumptionPoint[] => {
    if (raw.totalDaily <= 0) return [];
    const now = new Date();
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projectedM3 = (raw.totalDaily * daysInMonth) / 1000;
    return [{
      monthKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTHS[now.getMonth()]} ${String(now.getFullYear()).slice(2)}`,
      usage: +projectedM3.toFixed(1),
      cost: +(projectedM3 * settings.waterRate).toFixed(2),
      utility: "water",
      source: "estimated",
    }];
  }, [raw.totalDaily, settings.waterRate]);

  if (loading) {
    return <SkeletonOverviewPage />;
  }

  const elec = metrics?.electricity;
  const water = metrics?.water;

  return (
    <div className="space-y-6">
      {/* Refreshing indicator */}
      {refreshing && <RefreshBadge />}

      {/* 1. KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Electricity"
          icon={<BoltIcon className="w-5 h-5" />}
          value={elec?.dailyRate ?? 0}
          unit="kWh/day"
          trend={elec && elec.forecast.dailyRate > 0 ? {
            direction: elec.forecast.trendDirection,
            percent: elec.forecast.trendPercent,
          } : undefined}
          comparison={elec && elec.forecast.dailyRate > 0 ? `${elec.forecast.trendDirection} vs last 7d` : undefined}
          sparklineData={elec?.sparkline}
          onClick={() => onTabChange("electricity")}
        />
        <KPICard
          label="MTD Cost"
          icon={<CoinsIcon className="w-5 h-5" />}
          value={formatCurrency(elec?.monthCost ?? 0, settings.currency)}
          unit="/month"
          color="#ff9800"
          comparison={elec ? `projected ${formatCurrency(elecBudget.projected * settings.electricityRate, settings.currency)}` : undefined}
          onClick={() => onTabChange("electricity")}
        />
        <KPICard
          label="Water"
          icon={<DropletIcon className="w-5 h-5" />}
          value={water?.dailyRate ?? 0}
          unit="L/day"
          color="#42a5f5"
          comparison={water && water.monthEstimate > 0 ? `${water.monthEstimate.toFixed(1)} m³ this month` : undefined}
          onClick={() => onTabChange("water")}
        />
        <KPICard
          label="Projected Cost"
          icon={<CoinsIcon className="w-5 h-5" />}
          value={formatCurrency(
            (elecBudget.projected * settings.electricityRate) +
            (waterBudget.projected * settings.waterRate),
            settings.currency
          )}
          unit="/month"
          color="#7e57c2"
          comparison="electricity + water"
        />
      </div>

      {/* 2. Monthly Consumption Trend */}
      {(elecMonthlyPoints.length > 0 || waterMonthlyPoints.length > 0) && (
        <Card>
          <h3 className="text-base font-semibold text-ha-text mb-3">Monthly Consumption</h3>
          <MonthlyConsumptionLine
            electricityPoints={elecMonthlyPoints}
            waterPoints={waterMonthlyPoints}
            electricityBudget={settings.monthlyElectricityBudget}
            waterBudget={settings.monthlyWaterBudget}
            currency={settings.currency}
          />
        </Card>
      )}

      {/* 3. Usage Attribution Funnel */}
      {metrics && metrics.funnelStages.length > 0 && (
        <Card>
          <h3 className="text-base font-semibold text-ha-text mb-3">
            Usage Attribution — {resolved.label}
          </h3>
          <UsageAttributionFunnel stages={metrics.funnelStages} unit="kWh" />
        </Card>
      )}

      {/* 4. Budget Progress */}
      <Card>
        <h3 className="text-base font-semibold text-ha-text mb-4">Month to Date</h3>
        <div className="space-y-5">
          <BudgetProgress
            label="Electricity"
            current={elec?.monthTotal ?? 0}
            budget={settings.monthlyElectricityBudget}
            unit="kWh"
            cost={elec?.monthCost ?? monthlyCost(dailyStats, settings.electricityRate)}
            currency={settings.currency}
            projected={elecBudget.projected}
          />
          <BudgetProgress
            label="Water"
            current={waterMonthEstimate}
            budget={settings.monthlyWaterBudget}
            unit="m³"
            cost={waterMonthEstimate * settings.waterRate}
            currency={settings.currency}
            projected={waterBudget.projected}
          />
        </div>
      </Card>

      {/* 5. Energy Breakdown */}
      {breakdown && (
        <Card>
          <h3 className="text-base font-semibold text-ha-text mb-3">
            Energy Breakdown — {resolved.label}
          </h3>
          <EnergyFlowBar
            devices={breakdown.totals}
            baseLoad={breakdown.baseLoadTotal}
            rate={settings.electricityRate}
            currency={settings.currency}
          />
        </Card>
      )}

      {/* 6. Daily Consumption Chart */}
      {dailyStats.length > 0 && (
        <Card>
          <h3 className="text-base font-semibold text-ha-text mb-3">
            Daily Electricity — {resolved.label}
          </h3>
          <ConsumptionBar data={dailyStats} unit="kWh" showDataZoom={false} />
        </Card>
      )}
    </div>
  );
}
