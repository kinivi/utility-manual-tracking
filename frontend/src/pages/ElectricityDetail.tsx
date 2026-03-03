import React, { useMemo, useState } from "react";
import { useStatistics } from "../hooks/useStatistics";
import { useDeviceBreakdown } from "../hooks/useDeviceBreakdown";
import { useSettings } from "../hooks/useSettings";
import { useTimeRange } from "../hooks/useTimeRange";
import { useHass } from "../hooks/useHass";
import { ConsumptionBar } from "../components/ConsumptionBar";
import { DeviceStackedBar } from "../components/DeviceStackedBar";
import { DevicePie } from "../components/DevicePie";
import { CostSummary } from "../components/CostSummary";
import { ForecastLine } from "../components/ForecastLine";
import { HeatmapGrid } from "../components/HeatmapGrid";
import { RangeGauge } from "../components/RangeGauge";
import { ReadingTimeline } from "../components/ReadingTimeline";
import { DayDetailPanel } from "../components/DayDetailPanel";
import { Card } from "../components/ui/Card";
import { SkeletonElectricityPage } from "../components/ui/Skeleton";
import { statsToHourlyHeatmap, dailyAverage } from "../utils/statistics";
import { forecast } from "../utils/forecast";
import { dailyCost, monthlyCost, annualProjection } from "../utils/cost";

export function ElectricityDetail() {
  const { data: elecData, loading } = useStatistics();
  const { breakdown } = useDeviceBreakdown();
  const { settings } = useSettings();
  const { resolved } = useTimeRange();
  const hass = useHass();

  const [drillDay, setDrillDay] = useState<string | null>(null);

  const dailyStats = elecData?.dailyStats ?? [];
  const hourlyStats = elecData?.hourlyStats ?? [];
  const monthlyStats = elecData?.monthlyStats ?? [];

  const elecForecast = useMemo(() => forecast(dailyStats), [dailyStats]);
  const heatmapData = useMemo(() => statsToHourlyHeatmap(hourlyStats), [hourlyStats]);

  const totalConsumption = useMemo(
    () => dailyStats.reduce((s, d) => s + d.value, 0),
    [dailyStats]
  );

  const elecDailyAvg = useMemo(() => dailyAverage(dailyStats), [dailyStats]);
  const elecStdDev = useMemo(() => {
    if (dailyStats.length < 2) return 0;
    const avg = elecDailyAvg;
    const variance = dailyStats.reduce((s, d) => s + (d.value - avg) ** 2, 0) / dailyStats.length;
    return Math.sqrt(variance);
  }, [dailyStats, elecDailyAvg]);

  // Parse readings from the electricity meter entity
  const readings = useMemo(() => {
    const entity = hass.states["sensor.utility_manual_tracking_electricity_meter_energy"];
    if (!entity) return [];

    try {
      const previousReads = JSON.parse(entity.attributes.previous_reads || "[]") as {
        value: number;
        timestamp: string;
      }[];
      const result: { value: number; date: string; delta?: number; cost?: number }[] = [];

      // Skip baseline row (index 0): it has no comparable delta by definition.
      for (let i = 1; i < previousReads.length; i++) {
        const r = previousReads[i];
        const date = new Date(r.timestamp).toLocaleDateString();
        const delta = r.value - previousReads[i - 1].value;
        const cost = delta * settings.electricityRate;
        result.push({ value: r.value, date, delta, cost });
      }

      const currentValue = parseFloat(entity.state);
      if (!isNaN(currentValue) && previousReads.length > 0) {
        const lastRead = previousReads[previousReads.length - 1];
        const delta = currentValue - lastRead.value;
        result.push({
          value: currentValue,
          date: "Current",
          delta,
          cost: delta * settings.electricityRate,
        });
      }

      return result.reverse();
    } catch {
      return [];
    }
  }, [hass.states, settings.electricityRate]);

  if (loading) {
    return <SkeletonElectricityPage />;
  }

  return (
    <div className="space-y-6">
      {/* Device Stacked Bar Chart (primary) */}
      {breakdown ? (
        <Card>
          <h3 className="text-base font-semibold text-ha-text mb-3">
            Daily Consumption by Device — {resolved.label}
          </h3>
          <DeviceStackedBar
            devices={breakdown.devices}
            baseLoad={breakdown.baseLoad}
            totalStats={dailyStats}
            onBarClick={setDrillDay}
          />
        </Card>
      ) : (
        <Card>
          <h3 className="text-base font-semibold text-ha-text mb-3">
            Daily Consumption — {resolved.label}
          </h3>
          <ConsumptionBar data={dailyStats} unit="kWh" onBarClick={setDrillDay} />
        </Card>
      )}

      {/* Day Drill-Down */}
      {drillDay && (
        <DayDetailPanel
          date={drillDay}
          onClose={() => setDrillDay(null)}
        />
      )}

      {/* Today vs Range */}
      <RangeGauge
        current={dailyStats.length > 0 ? dailyStats[dailyStats.length - 1].value : 0}
        average={elecDailyAvg}
        stdDev={elecStdDev}
        unit="kWh"
        label="Today vs Typical Range"
      />

      {/* Cost + Device Breakdown Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CostSummary
          dailyCost={dailyCost(elecForecast.dailyRate, settings.electricityRate)}
          monthlyCost={monthlyCost(dailyStats, settings.electricityRate)}
          annualProjection={annualProjection(elecForecast.dailyRate, settings.electricityRate)}
          currency={settings.currency}
        />
        <Card>
          <h3 className="text-base font-semibold text-ha-text mb-3">Device Breakdown</h3>
          <DevicePie
            devices={breakdown?.totals ?? []}
            totalConsumption={totalConsumption}
            height={250}
          />
        </Card>
      </div>

      {/* Forecast */}
      <Card>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-semibold text-ha-text">Trend & Forecast</h3>
          <div className="text-xs text-ha-text-secondary">
            R² = {elecForecast.confidence.toFixed(2)} · Annual: {elecForecast.annualForecast.toLocaleString()} kWh
            ({settings.currency}{annualProjection(elecForecast.dailyRate, settings.electricityRate).toLocaleString()})
          </div>
        </div>
        <ForecastLine data={dailyStats} unit="kWh" />
      </Card>

      {/* Heatmap */}
      {heatmapData.length > 0 && (
        <Card>
          <h3 className="text-base font-semibold text-ha-text mb-3">
            Consumption Heatmap (Hour x Day of Week)
          </h3>
          <HeatmapGrid data={heatmapData} />
        </Card>
      )}

      {/* Monthly Comparison */}
      {monthlyStats.length > 0 && (
        <Card>
          <h3 className="text-base font-semibold text-ha-text mb-3">Monthly Totals</h3>
          <ConsumptionBar data={monthlyStats} unit="kWh" showDataZoom={false} />
        </Card>
      )}

      {/* Reading History */}
      {readings.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-ha-text mb-3">Reading History</h3>
          <ReadingTimeline readings={readings} unit="kWh" currency={settings.currency} />
        </div>
      )}
    </div>
  );
}
