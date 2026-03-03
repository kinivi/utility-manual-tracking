import React, { useRef, useEffect } from "react";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { baseTooltip, baseAxisLabel, baseSplitLine, baseAnimation } from "../utils/chartConfig";
import type { DeviceTimeSeries } from "../hooks/useDeviceBreakdown";
import type { DailyConsumption } from "../types";

echarts.use([BarChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, MarkLineComponent, CanvasRenderer]);

interface DeviceStackedBarProps {
  devices: DeviceTimeSeries[];
  baseLoad: Map<string, number>;
  totalStats: DailyConsumption[];
  dailyBudget?: number;
  height?: number;
  onBarClick?: (date: string) => void;
}

export function DeviceStackedBar({
  devices,
  baseLoad,
  totalStats,
  dailyBudget,
  height = 320,
  onBarClick,
}: DeviceStackedBarProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  // Sorted date keys from totalStats
  const dates = totalStats.map((d) => d.date);
  const dateLabels = dates.map((d) => {
    const dt = new Date(d);
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  });

  useEffect(() => {
    if (!chartRef.current) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }
    const instance = instanceRef.current;

    const showZoom = dates.length > 30;

    const series = [
      ...devices.map((device) => ({
        name: device.name,
        type: "bar" as const,
        stack: "total",
        data: dates.map((d) => {
          const key = d.slice(0, 10);
          return +(device.data.get(key) ?? 0).toFixed(2);
        }),
        itemStyle: { color: device.color, borderRadius: [0, 0, 0, 0] },
        barMaxWidth: 20,
        emphasis: { focus: "series" as const },
      })),
      {
        name: "Base Load",
        type: "bar" as const,
        stack: "total",
        data: dates.map((d) => {
          const key = d.slice(0, 10);
          return +(baseLoad.get(key) ?? 0).toFixed(2);
        }),
        itemStyle: { color: "#d5d5d5", borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 20,
        emphasis: { focus: "series" as const },
        markLine: dailyBudget && dailyBudget > 0 ? {
          data: [{ yAxis: dailyBudget }],
          lineStyle: { type: "dashed", color: "#ff9800", width: 1.5 },
          label: { formatter: `budget ${dailyBudget.toFixed(1)}`, position: "insideEndTop", fontSize: 10, color: "#ff9800" },
          symbol: "none",
          silent: true,
        } : undefined,
      },
    ];

    instance.setOption({
      ...baseAnimation(),
      tooltip: {
        ...baseTooltip("axis"),
        formatter: (params: any) => {
          if (!Array.isArray(params)) return "";
          let total = 0;
          let html = `<div style="font-weight:600;margin-bottom:4px">${params[0]?.axisValueLabel || ""}</div>`;
          for (const p of params) {
            if (p.value > 0) {
              html += `<div style="display:flex;justify-content:space-between;gap:12px"><span>${p.marker} ${p.seriesName}</span><span style="font-weight:600">${p.value.toFixed(2)} kWh</span></div>`;
              total += p.value;
            }
          }
          html += `<div style="border-top:1px solid #e0e0e0;margin-top:4px;padding-top:4px;font-weight:600">Total: ${total.toFixed(2)} kWh</div>`;
          return html;
        },
      },
      legend: {
        data: [...devices.map((d) => d.name), "Base Load"],
        bottom: showZoom ? 40 : 0,
        textStyle: { color: "#727272", fontSize: 11 },
        itemWidth: 12,
        itemHeight: 12,
      },
      grid: { left: 50, right: 16, top: 16, bottom: showZoom ? 80 : 36 },
      xAxis: {
        type: "category",
        data: dateLabels,
        axisLabel: baseAxisLabel(),
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        axisLabel: baseAxisLabel(),
        splitLine: baseSplitLine(),
      },
      dataZoom: showZoom
        ? [{ type: "slider", bottom: 4, height: 24 }]
        : [],
      series,
    }, true);

    // Click handler
    if (onBarClick) {
      instance.off("click");
      instance.on("click", (params: any) => {
        if (params.dataIndex != null && dates[params.dataIndex]) {
          onBarClick(dates[params.dataIndex]);
        }
      });
    }

    const handleResize = () => instance.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [devices, baseLoad, dates, dateLabels, onBarClick]);

  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  return <div ref={chartRef} style={{ width: "100%", height, cursor: onBarClick ? "pointer" : undefined }} />;
}
