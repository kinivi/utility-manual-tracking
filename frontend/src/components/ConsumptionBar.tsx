import React, { useRef, useEffect } from "react";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent, DataZoomComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { DailyConsumption } from "../types";

echarts.use([BarChart, GridComponent, TooltipComponent, DataZoomComponent, CanvasRenderer]);

interface ConsumptionBarProps {
  data: DailyConsumption[];
  unit?: string;
  color?: string;
  height?: number;
  showDataZoom?: boolean;
}

export function ConsumptionBar({ data, unit = "kWh", color, height = 300, showDataZoom = true }: ConsumptionBarProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const barColor = color || getComputedStyle(document.documentElement).getPropertyValue("--primary-color").trim() || "#03a9f4";

    const option: echarts.EChartsCoreOption = {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `${p.name}<br/>${p.value.toFixed(2)} ${unit}`;
        },
      },
      grid: { left: 50, right: 16, top: 16, bottom: showDataZoom ? 60 : 30 },
      xAxis: {
        type: "category",
        data: data.map((d) => {
          const date = new Date(d.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        axisLabel: { color: "#727272", fontSize: 11 },
        axisLine: { lineStyle: { color: "#e0e0e0" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#727272", fontSize: 11, formatter: `{value}` },
        splitLine: { lineStyle: { color: "#e0e0e0", type: "dashed" } },
      },
      series: [
        {
          type: "bar",
          data: data.map((d) => d.value),
          itemStyle: { color: barColor, borderRadius: [3, 3, 0, 0] },
          barMaxWidth: 20,
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

    instanceRef.current.setOption(option);

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [data, unit, color, showDataZoom]);

  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  return <div ref={chartRef} style={{ width: "100%", height }} />;
}
