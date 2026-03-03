import React, { useRef, useEffect } from "react";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent, DataZoomComponent, MarkLineComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { baseTooltip, baseGrid, baseAxisLabel, baseSplitLine, baseAnimation } from "../utils/chartConfig";
import { CHART_COLORS } from "../utils/theme";
import type { DailyConsumption } from "../types";

echarts.use([BarChart, GridComponent, TooltipComponent, DataZoomComponent, MarkLineComponent, CanvasRenderer]);

interface ConsumptionBarProps {
  data: DailyConsumption[];
  unit?: string;
  color?: string;
  height?: number;
  showDataZoom?: boolean;
  onBarClick?: (date: string) => void;
}

export function ConsumptionBar({
  data,
  unit = "kWh",
  color,
  height = 300,
  showDataZoom = true,
  onBarClick,
}: ConsumptionBarProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const barColor = color || CHART_COLORS.primary();
    // Create a faded version for gradient bottom
    const barColorFaded = barColor + "60"; // 38% opacity hex suffix

    const option: echarts.EChartsCoreOption = {
      ...baseAnimation(),
      tooltip: {
        ...baseTooltip("axis"),
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `${p.name}<br/><strong>${p.value.toFixed(2)} ${unit}</strong>`;
        },
      },
      grid: baseGrid(showDataZoom),
      xAxis: {
        type: "category",
        data: data.map((d) => {
          const date = new Date(d.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        axisLabel: baseAxisLabel(),
        axisLine: { lineStyle: { color: CHART_COLORS.grid() } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        axisLabel: baseAxisLabel(),
        splitLine: baseSplitLine(),
      },
      series: [
        {
          type: "bar",
          data: data.map((d) => d.value),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: barColor },
              { offset: 1, color: barColorFaded },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
          barMaxWidth: 28,
          markLine: data.length >= 3 ? {
            data: [{ type: "average", name: "Avg" }],
            lineStyle: { type: "dashed", color: "#bdbdbd", width: 1 },
            label: {
              formatter: (p: any) => `${p.value.toFixed(1)}`,
              position: "insideEndTop",
              fontSize: 10,
              color: "#999",
            },
            symbol: "none",
            silent: true,
          } : undefined,
        },
      ],
      ...(showDataZoom
        ? {
            dataZoom: [
              { type: "inside", start: Math.max(0, 100 - (30 / data.length) * 100), end: 100 },
              { type: "slider", start: Math.max(0, 100 - (30 / data.length) * 100), end: 100, height: 20, bottom: 8 },
            ],
          }
        : {}),
    };

    instanceRef.current.setOption(option, true);

    // Click handler for drill-down
    if (onBarClick) {
      instanceRef.current.off("click");
      instanceRef.current.on("click", (params: any) => {
        if (params.dataIndex != null && data[params.dataIndex]) {
          onBarClick(data[params.dataIndex].date);
        }
      });
    }

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [data, unit, color, showDataZoom, onBarClick]);

  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  return (
    <div
      ref={chartRef}
      style={{ width: "100%", height, cursor: onBarClick ? "pointer" : undefined }}
    />
  );
}
