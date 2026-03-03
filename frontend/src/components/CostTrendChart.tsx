import React, { useRef, useEffect } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { baseTooltip, baseAxisLabel, baseSplitLine, baseAnimation } from "../utils/chartConfig";
import { CHART_COLORS } from "../utils/theme";
import { formatCurrency } from "../utils/cost";
import type { MonthlyConsumptionPoint } from "../types";

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

interface CostTrendChartProps {
  electricityPoints: MonthlyConsumptionPoint[];
  waterPoints?: MonthlyConsumptionPoint[];
  electricityRate: number;
  waterRate: number;
  currency: string;
  height?: number;
}

export function CostTrendChart({
  electricityPoints,
  waterPoints,
  electricityRate,
  waterRate,
  currency,
  height = 280,
}: CostTrendChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  const labels = electricityPoints.map((p) => p.label);
  const elecCosts = electricityPoints.map((p) => p.cost);

  // Align water costs to electricity months (fill missing months with 0)
  const waterCostMap = new Map<string, number>();
  if (waterPoints) {
    for (const p of waterPoints) {
      waterCostMap.set(p.monthKey, p.cost);
    }
  }
  const waterCosts = electricityPoints.map((p) => waterCostMap.get(p.monthKey) ?? 0);
  const totalCosts = elecCosts.map((e, i) => +(e + waterCosts[i]).toFixed(2));

  // Effective rate per kWh
  const effectiveRate = electricityPoints.map((p) =>
    p.usage > 0 ? +(p.cost / p.usage).toFixed(3) : 0
  );

  // Summary stats
  const trailing3 = totalCosts.slice(-3);
  const monthlyAvg = trailing3.length > 0
    ? +(trailing3.reduce((s, v) => s + v, 0) / trailing3.length).toFixed(2)
    : 0;
  const annualProjection = +(monthlyAvg * 12).toFixed(0);
  const latestRate = effectiveRate.length > 0 ? effectiveRate[effectiveRate.length - 1] : 0;

  useEffect(() => {
    if (!chartRef.current || electricityPoints.length === 0) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const primaryColor = CHART_COLORS.primary();
    const waterColor = "#42a5f5";

    const option: echarts.EChartsCoreOption = {
      ...baseAnimation(),
      tooltip: {
        ...baseTooltip("axis"),
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          const idx = items[0].dataIndex;
          let html = `<div style="font-weight:600;margin-bottom:4px">${labels[idx]}</div>`;
          for (const item of items) {
            if (item.seriesName === `${currency}/kWh`) {
              html += `<div>${item.marker} Rate: ${item.value.toFixed(3)} ${currency}/kWh</div>`;
            } else {
              html += `<div>${item.marker} ${item.seriesName}: ${formatCurrency(item.value, currency)}</div>`;
            }
          }
          html += `<div style="margin-top:3px;border-top:1px solid #eee;padding-top:3px;font-weight:500">Total: ${formatCurrency(totalCosts[idx], currency)}</div>`;
          return html;
        },
      },
      legend: {
        data: ["Electricity", "Water", `${currency}/kWh`],
        bottom: 0,
        textStyle: { color: CHART_COLORS.text(), fontSize: 11 },
        itemWidth: 12,
        itemHeight: 12,
      },
      grid: { left: 50, right: 55, top: 16, bottom: 32 },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: { ...baseAxisLabel(), interval: 0, rotate: labels.length > 8 ? 30 : 0 },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: CHART_COLORS.grid() } },
      },
      yAxis: [
        {
          type: "value",
          axisLabel: { ...baseAxisLabel(), formatter: `${currency}{value}` },
          splitLine: baseSplitLine(),
        },
        {
          type: "value",
          axisLabel: { ...baseAxisLabel(), formatter: "{value}" },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "Electricity",
          type: "bar",
          stack: "cost",
          data: elecCosts,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: primaryColor },
              { offset: 1, color: primaryColor + "70" },
            ]),
          },
          barMaxWidth: 32,
        },
        {
          name: "Water",
          type: "bar",
          stack: "cost",
          data: waterCosts,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: waterColor },
              { offset: 1, color: waterColor + "70" },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
          barMaxWidth: 32,
        },
        {
          name: `${currency}/kWh`,
          type: "line",
          yAxisIndex: 1,
          data: effectiveRate,
          smooth: 0.3,
          symbol: "circle",
          symbolSize: 5,
          lineStyle: { width: 1.5, color: "#7e57c2" },
          itemStyle: { color: "#7e57c2" },
        },
      ],
    };

    instanceRef.current.setOption(option, true);

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [electricityPoints, waterPoints, currency]);

  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  if (electricityPoints.length === 0) return null;

  return (
    <div>
      <div ref={chartRef} style={{ width: "100%", height }} />

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-ha-divider">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-ha-text-secondary font-medium">Monthly Avg</div>
          <div className="text-lg font-bold tabular-nums text-ha-text">{formatCurrency(monthlyAvg, currency)}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-ha-text-secondary font-medium">Annual Projection</div>
          <div className="text-lg font-bold tabular-nums text-ha-accent">{formatCurrency(annualProjection, currency)}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-ha-text-secondary font-medium">Effective Rate</div>
          <div className="text-lg font-bold tabular-nums text-ha-text">{latestRate.toFixed(3)} {currency}/kWh</div>
        </div>
      </div>
    </div>
  );
}
