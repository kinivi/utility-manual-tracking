import React, { useRef, useEffect, useState } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  LegendComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { baseTooltip, baseAxisLabel, baseSplitLine, baseAnimation } from "../utils/chartConfig";
import { CHART_COLORS } from "../utils/theme";
import { formatCurrency } from "../utils/cost";
import type { MonthlyConsumptionPoint, UtilityType } from "../types";

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, MarkLineComponent, LegendComponent, CanvasRenderer]);

interface MonthlyConsumptionLineProps {
  electricityPoints: MonthlyConsumptionPoint[];
  waterPoints?: MonthlyConsumptionPoint[];
  electricityBudget?: number;
  waterBudget?: number;
  electricityRate?: number;
  currency?: string;
  height?: number;
}

export function MonthlyConsumptionLine({
  electricityPoints,
  waterPoints,
  electricityBudget,
  waterBudget,
  electricityRate,
  currency = "€",
  height = 320,
}: MonthlyConsumptionLineProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const [activeUtility, setActiveUtility] = useState<UtilityType>("electricity");
  const [showCumulative, setShowCumulative] = useState(false);

  const points = activeUtility === "electricity" ? electricityPoints : (waterPoints ?? []);
  const budget = activeUtility === "electricity" ? electricityBudget : waterBudget;
  const unit = activeUtility === "electricity" ? "kWh" : "m³";
  const hasWater = !!(waterPoints && waterPoints.length > 0);

  useEffect(() => {
    if (!chartRef.current || points.length === 0) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const labels = points.map((p) => p.label);
    const values = points.map((p) => p.usage);
    const costs = points.map((p) => p.cost);
    const isEstimated = points.map((p) => p.source === "estimated");
    const isCurrentMonth = points.map((p) => p.monthKey === currentMonthKey);

    const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    const primaryColor = activeUtility === "electricity" ? CHART_COLORS.primary() : "#42a5f5";

    // Cumulative cost running total
    const cumulativeCost = values.reduce((acc: number[], _v, i) => {
      acc.push((i > 0 ? acc[i - 1] : 0) + costs[i]);
      return acc;
    }, []);

    // Mark lines for budget and average
    const markLines: any[] = [];
    if (avg > 0) {
      markLines.push({
        yAxis: +avg.toFixed(1),
        lineStyle: { type: "dotted", color: "#9e9e9e", width: 1 },
        label: { formatter: `avg ${avg.toFixed(0)}`, position: "insideEndTop", fontSize: 10, color: "#9e9e9e" },
      });
    }
    if (budget && budget > 0) {
      markLines.push({
        yAxis: budget,
        lineStyle: { type: "dashed", color: CHART_COLORS.error(), width: 1.5 },
        label: { formatter: `budget ${budget}`, position: "insideEndTop", fontSize: 10, color: CHART_COLORS.error() },
      });
    }

    const series: any[] = [
      // Primary: bars for monthly usage
      {
        name: unit,
        type: "bar",
        yAxisIndex: 0,
        data: values.map((v, i) => ({
          value: v,
          itemStyle: isCurrentMonth[i] ? {
            borderColor: primaryColor,
            borderWidth: 2,
            borderType: "solid",
          } : isEstimated[i] ? {
            borderColor: CHART_COLORS.warning(),
            borderWidth: 2,
            borderType: "dashed",
          } : undefined,
        })),
        barMaxWidth: 36,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: primaryColor },
            { offset: 0.4, color: primaryColor + "CC" },
            { offset: 1, color: primaryColor + "40" },
          ]),
          borderRadius: [5, 5, 0, 0],
        },
        markLine: markLines.length > 0
          ? { data: markLines, silent: true, symbol: "none" }
          : undefined,
      },
    ];

    // Cumulative cost line (optional)
    if (showCumulative && cumulativeCost.length > 0) {
      series.push({
        name: `Cumulative ${currency}`,
        type: "line",
        yAxisIndex: 1,
        data: cumulativeCost,
        smooth: 0.3,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { width: 2, color: CHART_COLORS.accent() },
        itemStyle: { color: CHART_COLORS.accent() },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: CHART_COLORS.accent() + "20" },
            { offset: 1, color: CHART_COLORS.accent() + "05" },
          ]),
        },
      });
    }

    const yAxes: any[] = [
      {
        type: "value",
        axisLabel: { ...baseAxisLabel(), formatter: `{value}` },
        splitLine: baseSplitLine(),
      },
    ];

    if (showCumulative) {
      yAxes.push({
        type: "value",
        axisLabel: { ...baseAxisLabel(), formatter: `${currency}{value}` },
        splitLine: { show: false },
      });
    }

    const option: echarts.EChartsCoreOption = {
      ...baseAnimation(),
      tooltip: {
        ...baseTooltip("axis"),
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          const idx = items[0].dataIndex;
          const p = points[idx];
          let html = `<div style="font-weight:600;margin-bottom:4px">${p.label}</div>`;
          if (isEstimated[idx]) {
            html += `<div style="color:${CHART_COLORS.warning()};font-size:10px;margin-bottom:2px">Estimated</div>`;
          }
          html += `<div>${p.usage.toFixed(1)} ${unit}</div>`;
          html += `<div style="color:#999">${formatCurrency(p.cost, currency)}</div>`;
          if (budget && budget > 0) {
            const delta = p.usage - budget;
            const deltaColor = delta > 0 ? CHART_COLORS.error() : CHART_COLORS.success();
            html += `<div style="color:${deltaColor};font-size:11px">${delta > 0 ? "+" : ""}${delta.toFixed(0)} vs budget</div>`;
          }
          if (avg > 0) {
            const delta = p.usage - avg;
            const deltaColor = delta > 0 ? CHART_COLORS.warning() : CHART_COLORS.success();
            html += `<div style="color:${deltaColor};font-size:11px">${delta > 0 ? "+" : ""}${delta.toFixed(0)} vs avg</div>`;
          }
          if (showCumulative) {
            html += `<div style="margin-top:4px;border-top:1px solid #eee;padding-top:3px;color:${CHART_COLORS.accent()}">${formatCurrency(cumulativeCost[idx], currency)} cumulative</div>`;
          }
          return html;
        },
      },
      legend: showCumulative
        ? {
            data: [unit, `Cumulative ${currency}`],
            bottom: 0,
            textStyle: { color: CHART_COLORS.text(), fontSize: 11 },
            itemWidth: 12,
            itemHeight: 12,
          }
        : undefined,
      grid: { left: 50, right: showCumulative ? 60 : 16, top: 20, bottom: showCumulative ? 32 : 30 },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: { ...baseAxisLabel(), interval: 0, rotate: points.length > 8 ? 30 : 0 },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: CHART_COLORS.grid() } },
      },
      yAxis: yAxes,
      series,
    };

    instanceRef.current.setOption(option, true);

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [points, budget, currency, showCumulative, activeUtility]);

  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  if (electricityPoints.length === 0 && (!waterPoints || waterPoints.length === 0)) return null;

  return (
    <div>
      {/* Controls row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveUtility("electricity")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              activeUtility === "electricity"
                ? "bg-ha-primary text-white"
                : "text-ha-text-secondary hover:text-ha-text hover:bg-gray-100"
            }`}
          >
            Electricity
          </button>
          {hasWater && (
            <button
              onClick={() => setActiveUtility("water")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeUtility === "water"
                  ? "bg-[#42a5f5] text-white"
                  : "text-ha-text-secondary hover:text-ha-text hover:bg-gray-100"
              }`}
            >
              Water
            </button>
          )}
        </div>
        <button
          onClick={() => setShowCumulative((v) => !v)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            showCumulative
              ? "bg-ha-accent/15 text-ha-accent"
              : "text-ha-text-secondary hover:text-ha-text hover:bg-gray-100"
          }`}
        >
          {showCumulative ? "Hide Cumulative" : "Cumulative Cost"}
        </button>
      </div>

      <div ref={chartRef} style={{ width: "100%", height }} />
    </div>
  );
}
