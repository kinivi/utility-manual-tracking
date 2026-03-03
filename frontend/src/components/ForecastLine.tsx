import React, { useRef, useEffect } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent, MarkLineComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { baseTooltip, baseGrid, baseAxisLabel, baseSplitLine, baseAnimation } from "../utils/chartConfig";
import { CHART_COLORS } from "../utils/theme";
import { safeParseDate } from "../utils/dateUtils";
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

    const lastDate = safeParseDate(data[data.length - 1].date);
    const forecastDates: string[] = [];
    for (let i = 1; i <= forecastDays; i++) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i);
      forecastDates.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }

    const allDates = [
      ...data.map((d) => {
        const dt = safeParseDate(d.date);
        return `${dt.getMonth() + 1}/${dt.getDate()}`;
      }),
      ...forecastDates,
    ];

    // Compute forecast values and confidence band (±15%)
    const forecastValues = Array.from({ length: forecastDays }, (_, i) => {
      return Math.max(0, Math.round((slope * (n + i) + intercept) * 10) / 10);
    });
    const bandMargin = 0.15; // ±15%
    const upperBand = forecastValues.map((v) => Math.round(v * (1 + bandMargin) * 10) / 10);
    const lowerBand = forecastValues.map((v) => Math.max(0, Math.round(v * (1 - bandMargin) * 10) / 10));

    const actualSeries = [...yData, ...Array(forecastDays).fill(null)];
    const forecastSeries = [...Array(n - 1).fill(null), yData[n - 1], ...forecastValues];
    const upperSeries = [...Array(n - 1).fill(null), yData[n - 1], ...upperBand];
    const lowerSeries = [...Array(n - 1).fill(null), yData[n - 1], ...lowerBand];
    const avg = yData.reduce((s, v) => s + v, 0) / n;

    const option: echarts.EChartsCoreOption = {
      ...baseAnimation(),
      tooltip: {
        ...baseTooltip("axis"),
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          let html = `<div style="font-weight:600;margin-bottom:4px">${items[0].name}</div>`;
          for (const item of items) {
            if (item.value != null) {
              html += `<div>${item.marker} ${item.seriesName}: <strong>${item.value.toFixed(1)} ${unit}</strong></div>`;
            }
          }
          return html;
        },
      },
      grid: baseGrid(),
      xAxis: {
        type: "category",
        data: allDates,
        axisLabel: baseAxisLabel(),
      },
      yAxis: {
        type: "value",
        axisLabel: baseAxisLabel(),
        splitLine: baseSplitLine(),
      },
      series: [
        {
          name: "Actual",
          type: "line",
          data: actualSeries,
          smooth: true,
          symbol: "none",
          lineStyle: { width: 2.5 },
          itemStyle: { color: CHART_COLORS.primary() },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: CHART_COLORS.primary() + "20" },
              { offset: 1, color: CHART_COLORS.primary() + "02" },
            ]),
          },
        },
        // Confidence band: upper bound (invisible line, stack base)
        {
          name: "Lower",
          type: "line",
          data: lowerSeries,
          smooth: true,
          symbol: "none",
          lineStyle: { width: 0 },
          stack: "confidence",
          silent: true,
        },
        // Confidence band: fill between lower and upper
        {
          name: "Confidence",
          type: "line",
          data: upperSeries.map((v, i) => v != null && lowerSeries[i] != null ? +(v - lowerSeries[i]).toFixed(1) : null),
          smooth: true,
          symbol: "none",
          lineStyle: { width: 0 },
          stack: "confidence",
          areaStyle: { color: "rgba(255,152,0,0.08)" },
          silent: true,
        },
        {
          name: "Forecast",
          type: "line",
          data: forecastSeries,
          smooth: true,
          symbol: "none",
          lineStyle: { width: 2, type: "dashed" },
          itemStyle: { color: CHART_COLORS.accent() },
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

    instanceRef.current.setOption(option, true);

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
