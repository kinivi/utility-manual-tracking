import React, { useMemo } from "react";
import { useDashboardData } from "../hooks/useDashboardData";
import { useSettings } from "../hooks/useSettings";
import { useTimeRange } from "../hooks/useTimeRange";
import { KPICard } from "../components/KPICard";
import { MonthlyConsumptionLine } from "../components/MonthlyConsumptionLine";
import { CostTrendChart } from "../components/CostTrendChart";
import { UsageAttributionFunnel } from "../components/UsageAttributionFunnel";
import { BudgetProgress } from "../components/BudgetProgress";
import { EnergyFlowBar } from "../components/EnergyFlowBar";
import { ConsumptionBar } from "../components/ConsumptionBar";
import { Card } from "../components/ui/Card";
import { RefreshBadge, SkeletonOverviewPage } from "../components/ui/Skeleton";
import { BoltIcon, CoinsIcon, DropletIcon, ChartBarIcon } from "../components/ui/Icons";
import { formatCurrency } from "../utils/cost";
import { computeMonthlyPoints } from "../utils/analyticsEngine";
import { monthOverMonthChange } from "../utils/statistics";
import type { TabId, MonthlyConsumptionPoint } from "../types";

interface SituationRoomProps {
  onTabChange: (tab: TabId) => void;
}

export function SituationRoom({ onTabChange }: SituationRoomProps) {
  const { raw, metrics, loading, refreshing, workerMode, workerError } = useDashboardData("situation");
  const { settings } = useSettings();
  const { spec, resolved } = useTimeRange();

  const dailyStats = raw.electricity?.dailyStats ?? [];
  const monthlyStats = raw.electricity?.monthlyStats ?? [];
  const breakdown = raw.breakdown;

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
      label: `${MONTHS[now.getMonth()]} '${String(now.getFullYear()).slice(2)}`,
      usage: +projectedM3.toFixed(1),
      cost: +(projectedM3 * settings.waterRate).toFixed(2),
      utility: "water",
      source: "estimated",
    }];
  }, [raw.totalDaily, settings.waterRate]);

  // Month-over-month change for trend
  const momChange = useMemo(() => monthOverMonthChange(monthlyStats), [monthlyStats]);

  // Determine if viewing a completed period
  const isCompletePeriod = spec.type === "preset" && spec.preset === "last_month";

  if (loading) {
    return <SkeletonOverviewPage />;
  }

  const elec = metrics?.electricity;
  const water = metrics?.water;
  const pace = metrics?.budgetPace;

  // Budget pace visual
  const paceColor = pace
    ? pace.status === "over" ? "var(--error-color, #db4437)"
      : pace.status === "warning" ? "var(--warning-color, #ffa600)"
        : "var(--success-color, #43a047)"
    : "var(--success-color, #43a047)";

  return (
    <div className="space-y-6">
      {/* Refreshing indicator */}
      {refreshing && <RefreshBadge />}
      {import.meta.env.DEV && workerMode === "fallback" && (
        <div className="text-xs text-ha-warning">
          Worker fallback active{workerError ? `: ${workerError}` : ""}
        </div>
      )}

      {/* 1. KPI Strip — always current month/year */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Electricity"
          icon={<BoltIcon className="w-4 h-4" />}
          value={elec?.monthTotal ?? 0}
          unit="kWh"
          borderColor="var(--primary-color, #03a9f4)"
          secondaryValue={elec ? formatCurrency(elec.monthCost, settings.currency) : undefined}
          secondaryLabel="cost"
          trend={momChange !== null ? {
            direction: momChange > 2 ? "up" : momChange < -2 ? "down" : "stable",
            percent: momChange,
          } : undefined}
          comparison={momChange !== null ? "vs prev month" : undefined}
          sparklineData={elec?.sparkline}
          onClick={() => onTabChange("electricity")}
        />
        <KPICard
          label="Year Cost"
          icon={<CoinsIcon className="w-4 h-4" />}
          value={metrics ? formatCurrency(metrics.yearRunningCost, settings.currency) : "—"}
          unit="YTD"
          borderColor="var(--accent-color, #ff9800)"
          secondaryValue={metrics ? `${formatCurrency(metrics.dailyAvgCost, settings.currency)}/day` : undefined}
          secondaryLabel="avg"
        />
        <KPICard
          label="Budget"
          icon={<ChartBarIcon className="w-4 h-4" />}
          value={pace ? `${pace.percent}%` : "—"}
          unit="used"
          borderColor={paceColor}
          secondaryValue={pace ? `${pace.daysRemaining}d left` : undefined}
          comparison={pace ? (
            pace.status === "over" ? "Over budget"
              : pace.status === "warning" ? "Over pace"
                : "On track"
          ) : undefined}
        />
        <KPICard
          label="Water"
          icon={<DropletIcon className="w-4 h-4" />}
          value={water?.monthEstimate ?? 0}
          unit="m³"
          borderColor="#42a5f5"
          secondaryValue={water ? formatCurrency(water.monthCost, settings.currency) : undefined}
          secondaryLabel="cost"
          onClick={() => onTabChange("water")}
        />
      </div>

      {/* 2. Monthly Consumption Combo Chart */}
      {(elecMonthlyPoints.length > 0 || waterMonthlyPoints.length > 0) && (
        <Card>
          <h3 className="text-base font-semibold text-ha-text mb-3">Monthly Consumption</h3>
          <MonthlyConsumptionLine
            electricityPoints={elecMonthlyPoints}
            waterPoints={waterMonthlyPoints}
            electricityBudget={settings.monthlyElectricityBudget}
            waterBudget={settings.monthlyWaterBudget}
            electricityRate={settings.electricityRate}
            currency={settings.currency}
          />
        </Card>
      )}

      {/* 3. Cost Analysis */}
      {elecMonthlyPoints.length > 1 && (
        <Card>
          <h3 className="text-base font-semibold text-ha-text mb-3">Cost Analysis</h3>
          <CostTrendChart
            electricityPoints={elecMonthlyPoints}
            waterPoints={waterMonthlyPoints}
            electricityRate={settings.electricityRate}
            waterRate={settings.waterRate}
            currency={settings.currency}
          />
        </Card>
      )}

      {/* 4. Budget Progress */}
      <Card>
        <h3 className="text-base font-semibold text-ha-text mb-4">Budget Tracking</h3>
        <div className="space-y-5">
          <BudgetProgress
            label="Electricity"
            current={elec?.monthTotal ?? 0}
            budget={settings.monthlyElectricityBudget}
            unit="kWh"
            cost={elec?.monthCost ?? 0}
            currency={settings.currency}
            projected={pace ? (elec?.monthTotal ?? 0) / Math.max(1, new Date().getDate()) * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() : 0}
            isComplete={isCompletePeriod}
            rangeStart={resolved.start}
            rangeEnd={resolved.end}
          />
          <BudgetProgress
            label="Water"
            current={water?.monthEstimate ?? 0}
            budget={settings.monthlyWaterBudget}
            unit="m³"
            cost={water?.monthCost ?? 0}
            currency={settings.currency}
            projected={(water?.dailyRate ?? 0) / 1000 * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}
            isComplete={isCompletePeriod}
            rangeStart={resolved.start}
            rangeEnd={resolved.end}
          />
        </div>
      </Card>

      {/* 5. Energy Flow Sankey */}
      {metrics && metrics.funnelStages.length > 0 && (
        <Card>
          <h3 className="text-base font-semibold text-ha-text mb-3">
            Energy Flow — {resolved.label}
          </h3>
          <UsageAttributionFunnel
            stages={metrics.funnelStages}
            devices={breakdown?.totals ?? []}
            unit="kWh"
            height={420}
          />
        </Card>
      )}

      {/* 6. Energy Breakdown */}
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

      {/* 7. Daily Consumption Chart */}
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
