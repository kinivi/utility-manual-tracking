import React, { useRef, useEffect } from "react";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
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
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          let html = items[0].name;
          let total = 0;
          for (const item of items) {
            html += `<br/>${item.seriesName}: ${item.value.toFixed(1)} L/day`;
            total += item.value;
          }
          html += `<br/><b>Total: ${total.toFixed(1)} L/day</b>`;
          return html;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { color: "#727272" },
      },
      grid: { left: 50, right: 16, top: 16, bottom: 40 },
      xAxis: {
        type: "category",
        data: locations,
        axisLabel: { color: "#727272" },
      },
      yAxis: {
        type: "value",
        name: "L/day",
        axisLabel: { color: "#727272" },
        splitLine: { lineStyle: { color: "#e0e0e0", type: "dashed" } },
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

    instanceRef.current.setOption(option);

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
