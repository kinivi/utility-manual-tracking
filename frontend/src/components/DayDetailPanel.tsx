import React, { useState, useEffect, useMemo } from "react";
import { useHass } from "../hooks/useHass";
import { useSettings } from "../hooks/useSettings";
import { KNOWN_DEVICES } from "../hooks/useDeviceBreakdown";
import { ELECTRICITY_STAT_ID } from "../hooks/useStatistics";
import { Card } from "./ui/Card";
import { XIcon, BoltIcon } from "./ui/Icons";
import { SkeletonChart } from "./ui/Skeleton";
import { formatCurrency } from "../utils/cost";
import type { StatisticsResult, StatisticValue } from "../types";

interface DayDetailPanelProps {
  date: string;
  onClose: () => void;
}

import { toISODate } from "../utils/dateUtils";

export function DayDetailPanel({ date, onClose }: DayDetailPanelProps) {
  const hass = useHass();
  const { settings } = useSettings();
  const [hourlyData, setHourlyData] = useState<{
    total: number[];
    devices: { name: string; color: string; values: number[] }[];
    peakHour: number;
    totalKwh: number;
  } | null>(null);

  const dateLabel = useMemo(() => {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [date]);

  useEffect(() => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const allIds = [ELECTRICITY_STAT_ID, ...KNOWN_DEVICES.map((d) => d.entityId)];

    hass.connection
      .sendMessagePromise<StatisticsResult>({
        type: "recorder/statistics_during_period",
        start_time: dayStart.toISOString(),
        end_time: dayEnd.toISOString(),
        statistic_ids: allIds,
        period: "hour",
        types: ["change"],
        units: { energy: "kWh" },
      })
      .then((result) => {
        const totalStats = result[ELECTRICITY_STAT_ID] || [];
        const total = new Array(24).fill(0);

        for (const s of totalStats) {
          const hour = new Date(toISODate(s.start)).getHours();
          total[hour] = s.change ?? 0;
        }

        const devices = KNOWN_DEVICES.map((dev) => {
          const stats = result[dev.entityId] || [];
          const values = new Array(24).fill(0);
          for (const s of stats) {
            const hour = new Date(toISODate(s.start)).getHours();
            values[hour] = s.change ?? 0;
          }
          return { name: dev.name, color: dev.color, values };
        });

        const peakHour = total.indexOf(Math.max(...total));
        const totalKwh = total.reduce((s, v) => s + v, 0);

        setHourlyData({ total, devices, peakHour, totalKwh });
      })
      .catch(console.error);
  }, [date, hass]);

  return (
    <div className="animate-fadeIn">
      <Card elevation={2}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <BoltIcon className="w-4 h-4 text-ha-primary" />
            <h3 className="text-base font-semibold text-ha-text">{dateLabel}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-ha-divider/30 transition-colors text-ha-text-secondary"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {!hourlyData ? (
          <SkeletonChart height={200} />
        ) : (
          <>
            {/* Summary KPIs */}
            <div className="flex gap-6 mb-4 text-sm">
              <div>
                <span className="text-ha-text-secondary">Total: </span>
                <span className="font-semibold text-ha-text tabular-nums">
                  {hourlyData.totalKwh.toFixed(2)} kWh
                </span>
              </div>
              <div>
                <span className="text-ha-text-secondary">Cost: </span>
                <span className="font-semibold text-ha-text tabular-nums">
                  {formatCurrency(hourlyData.totalKwh * settings.electricityRate, settings.currency)}
                </span>
              </div>
              <div>
                <span className="text-ha-text-secondary">Peak: </span>
                <span className="font-semibold text-ha-text tabular-nums">
                  {hourlyData.peakHour}:00 ({hourlyData.total[hourlyData.peakHour].toFixed(2)} kWh)
                </span>
              </div>
            </div>

            {/* Hourly Bar Chart (simple HTML) */}
            <div className="flex items-end gap-px h-40">
              {hourlyData.total.map((val, hour) => {
                const maxVal = Math.max(...hourlyData.total, 0.01);
                const heightPercent = (val / maxVal) * 100;
                const isPeak = hour === hourlyData.peakHour;

                return (
                  <div
                    key={hour}
                    className="flex-1 flex flex-col items-center group relative"
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        isPeak ? "bg-ha-accent" : "bg-ha-primary"
                      }`}
                      style={{ height: `${heightPercent}%`, minHeight: val > 0 ? 2 : 0 }}
                      title={`${hour}:00 — ${val.toFixed(3)} kWh`}
                    />
                    {hour % 3 === 0 && (
                      <span className="text-[9px] text-ha-text-secondary mt-1 tabular-nums">
                        {hour}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
