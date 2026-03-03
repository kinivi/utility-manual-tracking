import React from "react";
import type { DeviceConsumption } from "../types";
import { WashingMachineIcon, ServerIcon, VacuumIcon, HomeIcon } from "./ui/Icons";
import { formatCurrency } from "../utils/cost";

interface EnergyFlowBarProps {
  devices: DeviceConsumption[];
  baseLoad: number;
  rate?: number;
  currency?: string;
}

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  Washer: <WashingMachineIcon className="w-4 h-4" />,
  Servers: <ServerIcon className="w-4 h-4" />,
  Vacuum: <VacuumIcon className="w-4 h-4" />,
};

export function EnergyFlowBar({ devices, baseLoad, rate, currency }: EnergyFlowBarProps) {
  const total = devices.reduce((s, d) => s + d.value, 0) + baseLoad;
  if (total <= 0) return null;

  const segments = [
    ...devices.map((d) => ({
      label: d.name,
      value: d.value,
      percent: (d.value / total) * 100,
      color: d.color,
      icon: DEVICE_ICONS[d.name] || null,
    })),
    {
      label: "Base Load",
      value: baseLoad,
      percent: (baseLoad / total) * 100,
      color: "#bdbdbd",
      icon: <HomeIcon className="w-4 h-4" />,
    },
  ].filter((s) => s.value > 0);

  return (
    <div>
      {/* Total */}
      <div className="text-sm text-ha-text-secondary mb-3">
        Total: <span className="font-semibold text-ha-text tabular-nums">{total.toFixed(1)} kWh</span>
        {rate && currency ? (
          <span className="ml-2 text-ha-text-secondary tabular-nums">({formatCurrency(total * rate, currency)})</span>
        ) : null}
      </div>

      {/* Flow Bar */}
      <div className="flex h-12 rounded-lg overflow-hidden shadow-inner">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className="flex items-center justify-center text-white text-xs font-medium transition-all relative group"
            style={{
              width: `${Math.max(seg.percent, 3)}%`,
              backgroundColor: seg.color,
              minWidth: seg.percent > 5 ? undefined : "24px",
            }}
            title={`${seg.label}: ${seg.value.toFixed(1)} kWh (${seg.percent.toFixed(0)}%)`}
          >
            {seg.percent > 10 && (
              <span className="truncate px-1">{seg.label}</span>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5 text-xs">
            <div className="flex items-center gap-1 text-ha-text-secondary">
              {seg.icon}
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: seg.color }}
              />
            </div>
            <span className="text-ha-text font-medium">{seg.label}</span>
            <span className="text-ha-text-secondary tabular-nums">
              {seg.value.toFixed(1)} kWh{rate && currency ? ` (${formatCurrency(seg.value * rate, currency)})` : ""} · {seg.percent.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
