import React, { useRef, useEffect, useState } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
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

echarts.use([LineChart, GridComponent, TooltipComponent, MarkLineComponent, LegendComponent, CanvasRenderer]);

interface MonthlyConsumptionLineProps {
  electricityPoints: MonthlyConsumptionPoint[];
  waterPoints?: MonthlyConsumptionPoint[];
  electricityBudget?: number;
  waterBudget?: number;
  currency?: string;
  height?: number;
}

export function MonthlyConsumptionLine({
  electricityPoints,
  waterPoints,
  electricityBudget,
  waterBudget,
  currency = "€",
  height = 280,
}: MonthlyConsumptionLineProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const [activeUtility, setActiveUtility] = useState<UtilityType>("electricity");
  const [showCost, setShowCost] = useState(false);

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

    const markLines: any[] = [];
    if (avg > 0) {
      markLines.push({
        yAxis: +avg.toFixed(1),
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

    const series: any[] = [
      {
        name: unit,
        type: "line",
        yAxisIndex: 0,
        data: values,
        smooth: 0.3,
        symbol: (_v: number, params: any) => {
          if (isEstimated[params.dataIndex]) return "diamond";
          return isCurrentMonth[params.dataIndex] ? "circle" : "emptyCircle";
        },
        symbolSize: (_v: number, params: any) =>
          isCurrentMonth[params.dataIndex] ? 8 : 4,
        lineStyle: {
          width: 2.5,
          color: primaryColor,
          type: isEstimated.some(Boolean) ? "dashed" : "solid",
        },
        itemStyle: {
          color: primaryColor,
          borderWidth: (params: any) => isEstimated[params?.dataIndex] ? 2 : 0,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: primaryColor + "25" },
            { offset: 1, color: primaryColor + "05" },
          ]),
        },
        markLine: markLines.length > 0
          ? { data: markLines, silent: true, symbol: "none" }
          : undefined,
      },
    ];

    if (showCost) {
      series.push({
        name: currency,
        type: "line",
        yAxisIndex: 1,
        data: costs,
        smooth: 0.3,
        symbol: "none",
        lineStyle: { width: 1.5, color: CHART_COLORS.accent(), type: "dashed" },
        itemStyle: { color: CHART_COLORS.accent() },
      });
    }

    const yAxes: any[] = [
      {
        type: "value",
        axisLabel: { ...baseAxisLabel(), formatter: `{value}` },
        splitLine: baseSplitLine(),
      },
    ];

    if (showCost) {
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
          let html = `<div style="font-weight:600;margin-bottom:4px">${labels[idx]}</div>`;
          if (isEstimated[idx]) {
            html += `<div style="color:${CHART_COLORS.warning()};font-size:10px;margin-bottom:2px">Estimated</div>`;
          }
          for (const item of items) {
            if (item.value != null) {
              const isUsage = item.seriesIndex === 0;
              const u = isUsage ? unit : "";
              html += `<div>${item.marker} <strong>${item.value.toFixed(isUsage ? 1 : 2)}${u ? " " + u : ""}</strong></div>`;
            }
          }
          if (!showCost && costs[idx] > 0) {
            html += `<div style="color:#999;font-size:11px">${formatCurrency(costs[idx], currency)}</div>`;
          }
          if (budget && budget > 0) {
            const delta = values[idx] - budget;
            const deltaColor = delta > 0 ? CHART_COLORS.error() : CHART_COLORS.success();
            html += `<div style="color:${deltaColor};font-size:11px">${delta > 0 ? "+" : ""}${delta.toFixed(0)} vs budget</div>`;
          }
          return html;
        },
      },
      legend: showCost
        ? {
            data: [unit, currency],
            bottom: 0,
            textStyle: { color: CHART_COLORS.text(), fontSize: 11 },
            itemWidth: 12,
            itemHeight: 12,
          }
        : undefined,
      grid: { left: 50, right: showCost ? 60 : 16, top: 20, bottom: showCost ? 32 : 30 },
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
  }, [points, budget, currency, showCost, activeUtility]);

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
          onClick={() => setShowCost((v) => !v)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            showCost
              ? "bg-ha-accent/15 text-ha-accent"
              : "text-ha-text-secondary hover:text-ha-text hover:bg-gray-100"
          }`}
        >
          {showCost ? "Hide Cost" : "Show Cost"}
        </button>
      </div>

      <div ref={chartRef} style={{ width: "100%", height }} />
    </div>
  );
}
