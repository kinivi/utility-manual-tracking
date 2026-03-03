import React, { useRef, useEffect } from "react";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { baseTooltip, baseAxisLabel, baseSplitLine, baseAnimation } from "../utils/chartConfig";
import { CHART_COLORS } from "../utils/theme";
import type { WaterMeterData } from "../types";

echarts.use([BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

interface WaterBreakdownProps {
  meters: WaterMeterData[];
  height?: number;
}

export function WaterBreakdown({ meters, height = 300 }: WaterBreakdownProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || meters.length === 0) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const locations = ["Kitchen", "Bathroom"];
    const coldData = locations.map((loc) => {
      const m = meters.find((m) => m.location === loc.toLowerCase() && m.temp === "cold");
      return m?.dailyUsage || 0;
    });
    const hotData = locations.map((loc) => {
      const m = meters.find((m) => m.location === loc.toLowerCase() && m.temp === "hot");
      return m?.dailyUsage || 0;
    });

    const option: echarts.EChartsCoreOption = {
      ...baseAnimation(),
      tooltip: {
        ...baseTooltip("axis"),
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          let html = `<div style="font-weight:600;margin-bottom:4px">${items[0].name}</div>`;
          let total = 0;
          for (const item of items) {
            html += `<div>${item.marker} ${item.seriesName}: <strong>${item.value.toFixed(1)} L/day</strong></div>`;
            total += item.value;
          }
          html += `<div style="border-top:1px solid #e0e0e0;margin-top:4px;padding-top:4px;font-weight:600">Total: ${total.toFixed(1)} L/day</div>`;
          return html;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { color: CHART_COLORS.text(), fontSize: 11 },
        itemWidth: 12,
        itemHeight: 12,
      },
      grid: { left: 50, right: 16, top: 16, bottom: 40 },
      xAxis: {
        type: "category",
        data: locations,
        axisLabel: baseAxisLabel(),
      },
      yAxis: {
        type: "value",
        name: "L/day",
        axisLabel: baseAxisLabel(),
        splitLine: baseSplitLine(),
      },
      series: [
        {
          name: "Cold",
          type: "bar",
          stack: "total",
          data: coldData,
          itemStyle: { color: "#42a5f5", borderRadius: [0, 0, 0, 0] },
          barMaxWidth: 60,
        },
        {
          name: "Hot",
          type: "bar",
          stack: "total",
          data: hotData,
          itemStyle: { color: "#ef5350", borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 60,
        },
      ],
    };

    instanceRef.current.setOption(option, true);

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [meters]);

  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  return <div ref={chartRef} style={{ width: "100%", height }} />;
}
