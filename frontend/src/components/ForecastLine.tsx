import React, { useRef, useEffect } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent, MarkLineComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { DailyConsumption } from "../types";

echarts.use([LineChart, GridComponent, TooltipComponent, MarkLineComponent, CanvasRenderer]);

interface ForecastLineProps {
  data: DailyConsumption[];
  forecastDays?: number;
  unit?: string;
  height?: number;
}

export function ForecastLine({ data, forecastDays = 14, unit = "kWh", height = 300 }: ForecastLineProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    // Simple linear regression for forecast
    const n = data.length;
    const xData = data.map((_, i) => i);
    const yData = data.map((d) => d.value);

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += xData[i];
      sumY += yData[i];
      sumXY += xData[i] * yData[i];
      sumX2 += xData[i] * xData[i];
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    // Generate forecast dates
    const lastDate = new Date(data[data.length - 1].date);
    const forecastDates: string[] = [];
    for (let i = 1; i <= forecastDays; i++) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i);
      forecastDates.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }

    const allDates = [
      ...data.map((d) => {
        const dt = new Date(d.date);
        return `${dt.getMonth() + 1}/${dt.getDate()}`;
      }),
      ...forecastDates,
    ];

    const forecastValues = Array.from({ length: forecastDays }, (_, i) => {
      return Math.max(0, Math.round((slope * (n + i) + intercept) * 10) / 10);
    });

    // Actual data + nulls for forecast period
    const actualSeries = [...yData, ...Array(forecastDays).fill(null)];
    // Nulls for actual period + forecast values (overlap last actual point)
    const forecastSeries = [...Array(n - 1).fill(null), yData[n - 1], ...forecastValues];

    const avg = yData.reduce((s, v) => s + v, 0) / n;

    const option: echarts.EChartsCoreOption = {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          let html = items[0].name;
          for (const item of items) {
            if (item.value != null) {
              html += `<br/>${item.seriesName}: ${item.value.toFixed(1)} ${unit}`;
            }
          }
          return html;
        },
      },
      grid: { left: 50, right: 16, top: 16, bottom: 30 },
      xAxis: {
        type: "category",
        data: allDates,
        axisLabel: { color: "#727272", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#727272", fontSize: 11 },
        splitLine: { lineStyle: { color: "#e0e0e0", type: "dashed" } },
      },
      series: [
        {
          name: "Actual",
          type: "line",
          data: actualSeries,
          smooth: true,
          symbol: "none",
          lineStyle: { width: 2 },
          itemStyle: { color: "#03a9f4" },
        },
        {
          name: "Forecast",
          type: "line",
          data: forecastSeries,
          smooth: true,
          symbol: "none",
          lineStyle: { width: 2, type: "dashed" },
          itemStyle: { color: "#ff9800" },
          areaStyle: { color: "rgba(255,152,0,0.1)" },
        },
        {
          name: "Average",
          type: "line",
          data: allDates.map(() => Math.round(avg * 10) / 10),
          symbol: "none",
          lineStyle: { width: 1, type: "dotted", color: "#bdbdbd" },
          silent: true,
        },
      ],
    };

    instanceRef.current.setOption(option);

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [data, forecastDays, unit]);

  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  return <div ref={chartRef} style={{ width: "100%", height }} />;
}
