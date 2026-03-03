import React, { useRef, useEffect } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { baseTooltip, baseGrid, baseAxisLabel, baseSplitLine, baseAnimation } from "../utils/chartConfig";
import { CHART_COLORS } from "../utils/theme";
import { formatCurrency } from "../utils/cost";
import type { DailyConsumption } from "../types";

echarts.use([LineChart, GridComponent, TooltipComponent, MarkLineComponent, CanvasRenderer]);

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface MonthlyTrendLineProps {
  data: DailyConsumption[];
  budget?: number;
  rate?: number;
  currency?: string;
  height?: number;
}

export function MonthlyTrendLine({
  data,
  budget,
  rate = 0,
  currency = "€",
  height = 260,
}: MonthlyTrendLineProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const labels = data.map((d) => {
      const dt = new Date(d.date);
      return `${MONTH_LABELS[dt.getMonth()]} ${String(dt.getFullYear()).slice(2)}`;
    });
    const values = data.map((d) => Math.round(d.value * 10) / 10);
    const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;

    // Highlight current month with a different symbol
    const isCurrentMonth = data.map((d) => d.date.slice(0, 7) === currentMonthKey);

    const primaryColor = CHART_COLORS.primary();
    const markLines: any[] = [];

    if (avg > 0) {
      markLines.push({
        yAxis: Math.round(avg * 10) / 10,
        lineStyle: { type: "dotted", color: "#bdbdbd", width: 1 },
        label: { formatter: `avg ${avg.toFixed(0)}`, position: "insideEndTop", fontSize: 10, color: "#999" },
      });
    }

    if (budget && budget > 0) {
      markLines.push({
        yAxis: budget,
        lineStyle: { type: "dashed", color: CHART_COLORS.warning(), width: 1.5 },
        label: { formatter: `budget ${budget}`, position: "insideEndTop", fontSize: 10, color: CHART_COLORS.warning() },
      });
    }

    const option: echarts.EChartsCoreOption = {
      ...baseAnimation(),
      tooltip: {
        ...baseTooltip("axis"),
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const idx = p.dataIndex;
          const val = values[idx];
          let html = `<div style="font-weight:600;margin-bottom:4px">${labels[idx]}</div>`;
          html += `<div>${p.marker} <strong>${val} kWh</strong></div>`;
          if (rate > 0) {
            html += `<div style="color:#999;font-size:11px">${formatCurrency(val * rate, currency)}</div>`;
          }
          if (budget && budget > 0) {
            const delta = val - budget;
            const deltaColor = delta > 0 ? CHART_COLORS.error() : CHART_COLORS.success();
            html += `<div style="color:${deltaColor};font-size:11px">${delta > 0 ? "+" : ""}${delta.toFixed(0)} vs budget</div>`;
          }
          return html;
        },
      },
      grid: { left: 50, right: 16, top: 20, bottom: 30 },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: { ...baseAxisLabel(), interval: 0, rotate: data.length > 8 ? 30 : 0 },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: CHART_COLORS.grid() } },
      },
      yAxis: {
        type: "value",
        axisLabel: baseAxisLabel(),
        splitLine: baseSplitLine(),
      },
      series: [
        {
          type: "line",
          data: values,
          smooth: 0.3,
          symbol: (value: number, params: any) =>
            isCurrentMonth[params.dataIndex] ? "circle" : "emptyCircle",
          symbolSize: (value: number, params: any) =>
            isCurrentMonth[params.dataIndex] ? 8 : 4,
          lineStyle: { width: 2.5, color: primaryColor },
          itemStyle: { color: primaryColor },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: primaryColor + "30" },
              { offset: 1, color: primaryColor + "05" },
            ]),
          },
          markLine: markLines.length > 0
            ? { data: markLines, silent: true, symbol: "none" }
            : undefined,
        },
      ],
    };

    instanceRef.current.setOption(option);

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [data, budget, rate, currency]);

  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  if (data.length === 0) return null;

  return <div ref={chartRef} style={{ width: "100%", height }} />;
}
