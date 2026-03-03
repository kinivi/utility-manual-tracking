import React from "react";
import { Card } from "./ui/Card";
import { DropletIcon } from "./ui/Icons";
import type { WaterMeterData } from "../types";

interface LocationWaterCardProps {
  location: string;
  meters: WaterMeterData[];
  totalDaily: number;
}

export function LocationWaterCard({ location, meters, totalDaily }: LocationWaterCardProps) {
  const cold = meters.find((m) => m.temp === "cold");
  const hot = meters.find((m) => m.temp === "hot");
  const locationTotal = meters.reduce((s, m) => s + m.dailyUsage, 0);
  const sharePercent = totalDaily > 0 ? (locationTotal / totalDaily) * 100 : 0;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <DropletIcon className="w-4 h-4 text-water-cold" />
        <h3 className="text-base font-semibold text-ha-text">{location}</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        {/* Cold */}
        <div>
          <div className="text-xs text-water-cold font-medium mb-0.5">Cold</div>
          <div className="text-xl font-bold text-ha-text tabular-nums">
            {cold ? cold.dailyUsage.toFixed(1) : "—"}
            <span className="text-xs font-normal text-ha-text-secondary ml-1">L/day</span>
          </div>
          {cold && (
            <div className="text-xs text-ha-text-secondary mt-0.5">
              Meter: {cold.currentReading.toFixed(3)} m³
            </div>
          )}
        </div>

        {/* Hot */}
        <div>
          <div className="text-xs text-water-hot font-medium mb-0.5">Hot</div>
          <div className="text-xl font-bold text-ha-text tabular-nums">
            {hot ? hot.dailyUsage.toFixed(1) : "—"}
            <span className="text-xs font-normal text-ha-text-secondary ml-1">L/day</span>
          </div>
          {hot && (
            <div className="text-xs text-ha-text-secondary mt-0.5">
              Meter: {hot.currentReading.toFixed(3)} m³
            </div>
          )}
        </div>
      </div>

      {/* Location total + share */}
      <div className="pt-2 border-t border-ha-divider">
        <div className="flex justify-between items-center text-xs text-ha-text-secondary mb-1">
          <span>Total: {locationTotal.toFixed(1)} L/day</span>
          <span>{sharePercent.toFixed(0)}% of total</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-water-cold rounded-full transition-all"
            style={{ width: `${Math.min(100, sharePercent)}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
