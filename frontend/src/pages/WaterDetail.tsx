import React, { useMemo } from "react";
import { useWaterMeters } from "../hooks/useWaterMeters";
import { useSettings } from "../hooks/useSettings";
import { KPICard } from "../components/KPICard";
import { LocationWaterCard } from "../components/LocationWaterCard";
import { WaterBreakdown } from "../components/WaterBreakdown";
import { ReadingTimeline } from "../components/ReadingTimeline";
import { Card } from "../components/ui/Card";
import { DropletIcon, CoinsIcon, ChartBarIcon } from "../components/ui/Icons";
import { formatCurrency, dailyCost } from "../utils/cost";

export function WaterDetail() {
  const { meters, totalDaily } = useWaterMeters();
  const { settings } = useSettings();

  const hotTotal = useMemo(
    () => meters.filter((m) => m.temp === "hot").reduce((s, m) => s + m.dailyUsage, 0),
    [meters]
  );
  const coldTotal = useMemo(
    () => meters.filter((m) => m.temp === "cold").reduce((s, m) => s + m.dailyUsage, 0),
    [meters]
  );
  const hotRatio = totalDaily > 0 ? (hotTotal / totalDaily) * 100 : 0;

  const dailyM3 = totalDaily / 1000;
  const monthlyM3 = dailyM3 * 30.44;

  // Group meters by location
  const kitchenMeters = useMemo(() => meters.filter((m) => m.location === "kitchen"), [meters]);
  const bathroomMeters = useMemo(() => meters.filter((m) => m.location === "bathroom"), [meters]);

  // Parse readings from meter attributes
  const meterReadings = useMemo(() => {
    return meters.map((meter) => {
      const readings: { value: number; date: string; delta?: number }[] = [];

      if (meter.previousReading != null && meter.lastReadingDate) {
        readings.push({
          value: meter.previousReading,
          date: meter.lastReadingDate,
        });
        readings.push({
          value: meter.currentReading,
          date: "Current",
          delta: meter.currentReading - meter.previousReading,
        });
      } else {
        readings.push({
          value: meter.currentReading,
          date: "Current",
        });
      }

      return { label: meter.label, readings: readings.reverse() };
    });
  }, [meters]);

  return (
    <div className="space-y-6">
      {/* Total + Cost KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Total Daily"
          icon={<DropletIcon className="w-5 h-5" />}
          value={totalDaily}
          unit="L/day"
          color="#42a5f5"
        />
        <KPICard
          label="Daily Cost"
          icon={<CoinsIcon className="w-5 h-5" />}
          value={formatCurrency(dailyCost(dailyM3, settings.waterRate), settings.currency)}
          unit="/day"
        />
        <KPICard
          label="Monthly Est."
          icon={<ChartBarIcon className="w-5 h-5" />}
          value={monthlyM3.toFixed(1)}
          unit="m³/month"
        />
        <KPICard
          label="Monthly Cost"
          icon={<CoinsIcon className="w-5 h-5" />}
          value={formatCurrency(monthlyM3 * settings.waterRate, settings.currency)}
          unit="/month"
        />
      </div>

      {/* Location-Grouped Meter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LocationWaterCard
          location="Kitchen"
          meters={kitchenMeters}
          totalDaily={totalDaily}
        />
        <LocationWaterCard
          location="Bathroom"
          meters={bathroomMeters}
          totalDaily={totalDaily}
        />
      </div>

      {/* Stacked Breakdown Chart */}
      <Card>
        <h3 className="text-base font-semibold text-ha-text mb-3">
          Usage by Location (Hot vs Cold)
        </h3>
        <WaterBreakdown meters={meters} />
      </Card>

      {/* Hot/Cold Ratio */}
      <Card>
        <h3 className="text-base font-semibold text-ha-text mb-3">Hot vs Cold Ratio</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-4 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-water-cold transition-all"
                style={{ width: `${100 - hotRatio}%` }}
              />
              <div
                className="h-full bg-water-hot transition-all"
                style={{ width: `${hotRatio}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-ha-text-secondary mt-1">
              <span>Cold: {coldTotal.toFixed(1)} L/day ({(100 - hotRatio).toFixed(0)}%)</span>
              <span>Hot: {hotTotal.toFixed(1)} L/day ({hotRatio.toFixed(0)}%)</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-ha-text-secondary mt-3">
          Higher hot water ratio means increased energy cost for water heating.
        </p>
      </Card>

      {/* Reading History per Meter */}
      <div>
        <h3 className="text-base font-semibold text-ha-text mb-3">Reading History</h3>
        <div className="space-y-4">
          {meterReadings.map(({ label, readings }) => (
            <div key={label}>
              <h4 className="text-sm font-medium text-ha-text mb-2">{label}</h4>
              <ReadingTimeline readings={readings} unit="m³" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
