import React, { useRef, useEffect } from "react";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent, DataZoomComponent, MarkLineComponent, MarkPointComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { baseTooltip, baseGrid, baseAxisLabel, baseSplitLine, baseAnimation } from "../utils/chartConfig";
import { CHART_COLORS } from "../utils/theme";
import { safeParseDate } from "../utils/dateUtils";
import type { DailyConsumption } from "../types";

echarts.use([BarChart, GridComponent, TooltipComponent, DataZoomComponent, MarkLineComponent, MarkPointComponent, CanvasRenderer]);

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
    const values = data.map((d) => d.value);

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
          const date = safeParseDate(d.date);
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
          data: values,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: barColor },
              { offset: 0.4, color: barColor + "CC" },
              { offset: 1, color: barColor + "40" },
            ]),
            borderRadius: [6, 6, 0, 0],
          },
          barMaxWidth: 28,
          markPoint: data.length >= 5 ? {
            data: [
              { type: "max", symbol: "pin", symbolSize: 28, itemStyle: { color: CHART_COLORS.error() }, label: { formatter: (p: any) => p.value.toFixed(1), fontSize: 9, color: "#fff" } },
              { type: "min", symbol: "pin", symbolSize: 28, symbolRotate: 180, itemStyle: { color: CHART_COLORS.success() }, label: { formatter: (p: any) => p.value.toFixed(1), fontSize: 9, color: "#fff", offset: [0, 6] } },
            ],
            silent: true,
          } : undefined,
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
