import React, { useRef, useEffect } from "react";
import * as echarts from "echarts/core";
import { FunnelChart } from "echarts/charts";
import { TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { baseTooltip, baseAnimation } from "../utils/chartConfig";
import { CHART_COLORS } from "../utils/theme";
import type { UsageFunnelStage } from "../types";

echarts.use([FunnelChart, TooltipComponent, LegendComponent, CanvasRenderer]);

interface UsageAttributionFunnelProps {
  stages: UsageFunnelStage[];
  unit?: string;
  height?: number;
}

const STAGE_COLORS: Record<UsageFunnelStage["id"], string> = {
  total: "#546e7a",    // blue-grey 600
  known: "#42a5f5",    // blue 400
  base: "#bdbdbd",     // grey 400
  over_budget: "#ef5350", // red 400
};

export function UsageAttributionFunnel({
  stages,
  unit = "kWh",
  height = 240,
}: UsageAttributionFunnelProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || stages.length === 0) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const totalValue = stages[0]?.value || 1;

    const option: echarts.EChartsCoreOption = {
      ...baseAnimation(),
      tooltip: {
        ...baseTooltip("item"),
        formatter: (params: any) => {
          const s = params;
          return `<div style="font-weight:600;margin-bottom:4px">${s.name}</div>` +
            `<div>${s.marker} <strong>${s.value.toFixed(1)} ${unit}</strong></div>` +
            `<div style="color:#999;font-size:11px">${((s.value / totalValue) * 100).toFixed(1)}% of total</div>`;
        },
      },
      legend: {
        orient: "horizontal",
        bottom: 0,
        textStyle: { color: CHART_COLORS.text(), fontSize: 11 },
        itemWidth: 12,
        itemHeight: 12,
      },
      series: [
        {
          type: "funnel",
          left: "10%",
          top: 8,
          bottom: 32,
          width: "80%",
          sort: "none",
          gap: 4,
          label: {
            show: true,
            position: "inside",
            formatter: (p: any) => {
              const stage = stages.find((s) => s.label === p.name);
              if (!stage) return p.name;
              return `${p.name}\n${stage.value.toFixed(1)} ${unit}`;
            },
            fontSize: 11,
            lineHeight: 16,
            color: "#fff",
            fontWeight: 500,
          },
          labelLine: { show: false },
          itemStyle: {
            borderWidth: 1,
            borderColor: "#fff",
          },
          emphasis: {
            label: { fontSize: 12 },
          },
          data: stages.map((s) => ({
            name: s.label,
            value: s.value,
            itemStyle: { color: STAGE_COLORS[s.id] || CHART_COLORS.primary() },
          })),
        },
      ],
    };

    instanceRef.current.setOption(option, true);

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [stages, unit]);

  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  if (stages.length === 0) return null;

  return <div ref={chartRef} style={{ width: "100%", height }} />;
}
