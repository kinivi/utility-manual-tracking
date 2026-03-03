import React, { useRef, useEffect } from "react";
import * as echarts from "echarts/core";
import { SankeyChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { baseTooltip, baseAnimation } from "../utils/chartConfig";
import { CHART_COLORS } from "../utils/theme";
import type { DeviceConsumption, UsageFunnelStage } from "../types";

echarts.use([SankeyChart, TooltipComponent, CanvasRenderer]);

interface UsageAttributionFunnelProps {
  stages: UsageFunnelStage[];
  devices?: DeviceConsumption[];
  unit?: string;
  height?: number;
}

const NODE_COLORS = {
  total: "#0d8ba6",
  known: "#2979ff",
  base: "#9e9e9e",
  deviceA: "#e53935",
  deviceB: "#1e88e5",
  deviceC: "#f9a825",
  deviceD: "#2e7d32",
};

export function UsageAttributionFunnel({
  stages,
  devices = [],
  unit = "kWh",
  height = 420,
}: UsageAttributionFunnelProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || stages.length === 0) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const total = stages.find((s) => s.id === "total")?.value ?? 0;
    const known = stages.find((s) => s.id === "known")?.value ?? 0;
    const base = stages.find((s) => s.id === "base")?.value ?? 0;
    if (total <= 0) {
      instanceRef.current.clear();
      return;
    }

    const activeDevices = devices
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);

    const sumDeviceRaw = activeDevices.reduce((s, d) => s + d.value, 0);
    const scale = sumDeviceRaw > 0 && known > 0 ? known / sumDeviceRaw : 0;

    const deviceNodes = activeDevices.map((d, i) => ({
      name: d.name,
      itemStyle: {
        color:
          [NODE_COLORS.deviceA, NODE_COLORS.deviceB, NODE_COLORS.deviceC, NODE_COLORS.deviceD][i % 4],
      },
    }));

    const links: { source: string; target: string; value: number }[] = [];
    if (known > 0) links.push({ source: "Total Usage", target: "Known Devices", value: +known.toFixed(2) });
    if (base > 0) links.push({ source: "Total Usage", target: "Base Load", value: +base.toFixed(2) });

    if (known > 0 && deviceNodes.length > 0 && scale > 0) {
      for (const d of activeDevices) {
        links.push({
          source: "Known Devices",
          target: d.name,
          value: +(d.value * scale).toFixed(2),
        });
      }
    } else if (known > 0) {
      deviceNodes.push({
        name: "Tracked Loads",
        itemStyle: { color: NODE_COLORS.deviceA },
      });
      links.push({ source: "Known Devices", target: "Tracked Loads", value: +known.toFixed(2) });
    }

    const option: echarts.EChartsCoreOption = {
      ...baseAnimation(),
      tooltip: {
        ...baseTooltip("item"),
        formatter: (params: any): string => {
          if (params?.data?.source && params?.data?.target) {
            const pct = total > 0 ? ((params.data.value / total) * 100).toFixed(1) : "0.0";
            return [
              `<div style="font-weight:600;margin-bottom:4px">${params.data.source} → ${params.data.target}</div>`,
              `<div><strong>${params.data.value.toFixed(1)} ${unit}</strong></div>`,
              `<div style="color:#999;font-size:11px">${pct}% of total</div>`,
            ].join("");
          }
          return `<strong>${params.name}</strong>`;
        },
      },
      series: [
        {
          type: "sankey",
          left: 8,
          right: 8,
          top: 8,
          bottom: 8,
          nodeWidth: 26,
          nodeGap: 16,
          nodeAlign: "justify",
          draggable: false,
          layoutIterations: 64,
          label: {
            show: true,
            color: CHART_COLORS.textPrimary(),
            fontSize: 11,
            fontWeight: 500,
            lineHeight: 16,
            formatter: (params: any) => {
              const v = params.value;
              if (typeof v === "number" && v > 0) {
                return `${params.name}\n${v.toFixed(1)} ${unit}`;
              }
              return params.name;
            },
          },
          itemStyle: {
            borderColor: CHART_COLORS.cardBg(),
            borderWidth: 1,
          },
          lineStyle: {
            color: "gradient",
            curveness: 0.45,
            opacity: 0.65,
          },
          edgeLabel: {
            show: true,
            formatter: (params: any) => {
              if (params.data?.value && params.data.value > 0) {
                return `${params.data.value.toFixed(1)}`;
              }
              return "";
            },
            fontSize: 9,
            color: CHART_COLORS.text(),
            backgroundColor: CHART_COLORS.cardBg() + "CC",
            padding: [1, 3],
            borderRadius: 3,
          },
          emphasis: {
            focus: "adjacency",
          },
          data: [
            { name: "Total Usage", itemStyle: { color: NODE_COLORS.total } },
            { name: "Known Devices", itemStyle: { color: NODE_COLORS.known } },
            { name: "Base Load", itemStyle: { color: NODE_COLORS.base } },
            ...deviceNodes,
          ],
          links,
        },
      ],
    };

    instanceRef.current.setOption(option, true);

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [stages, devices, unit, height]);

  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  if (stages.length === 0) return null;

  const overBudget = stages.find((s) => s.id === "over_budget");

  return (
    <div>
      <div ref={chartRef} style={{ width: "100%", height }} />
      {overBudget && overBudget.value > 0 && (
        <div className="mt-2 text-xs text-ha-error font-medium">
          Over budget: {overBudget.value.toFixed(1)} {unit} ({overBudget.percent.toFixed(1)}%)
        </div>
      )}
    </div>
  );
}
