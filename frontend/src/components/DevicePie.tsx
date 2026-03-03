import React, { useRef, useEffect } from "react";
import * as echarts from "echarts/core";
import { PieChart } from "echarts/charts";
import { TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { baseTooltip, baseAnimation } from "../utils/chartConfig";
import { CHART_COLORS } from "../utils/theme";
import type { DeviceConsumption } from "../types";

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer]);

interface DevicePieProps {
  devices: DeviceConsumption[];
  totalConsumption: number;
  height?: number;
}

export function DevicePie({ devices, totalConsumption, height = 300 }: DevicePieProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const knownTotal = devices.reduce((s, d) => s + d.value, 0);
    const baseLoad = Math.max(0, totalConsumption - knownTotal);

    const pieData = [
      ...devices.map((d) => ({
        name: d.name,
        value: Math.round(d.value * 10) / 10,
        itemStyle: { color: d.color },
      })),
      ...(baseLoad > 0
        ? [{ name: "Base Load", value: Math.round(baseLoad * 10) / 10, itemStyle: { color: "#bdbdbd" } }]
        : []),
    ];

    const option: echarts.EChartsCoreOption = {
      ...baseAnimation(),
      tooltip: {
        ...baseTooltip("item"),
        formatter: "{b}: {c} kWh ({d}%)",
      },
      legend: {
        bottom: 0,
        textStyle: { color: CHART_COLORS.text(), fontSize: 11 },
        itemWidth: 12,
        itemHeight: 12,
      },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          center: ["50%", "45%"],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 2 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: "bold" },
          },
          data: pieData,
        },
      ],
    };

    instanceRef.current.setOption(option, true);

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [devices, totalConsumption]);

  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  return <div ref={chartRef} style={{ width: "100%", height }} />;
}
