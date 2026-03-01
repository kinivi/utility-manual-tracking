import React, { useRef, useEffect } from "react";
import * as echarts from "echarts/core";
import { HeatmapChart } from "echarts/charts";
import { GridComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([HeatmapChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

interface HeatmapGridProps {
  data: { dayOfWeek: number; hour: number; value: number }[];
  height?: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

export function HeatmapGrid({ data, height = 280 }: HeatmapGridProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const values = data.map((d) => d.value);
    const maxVal = Math.max(...values, 0.1);

    // ECharts heatmap data: [xIndex, yIndex, value]
    const heatmapData = data.map((d) => [d.hour, d.dayOfWeek, d.value]);

    const option: echarts.EChartsCoreOption = {
      tooltip: {
        formatter: (params: any) => {
          const [hour, day, value] = params.data;
          return `${DAYS[day]} ${HOURS[hour]}<br/>${value.toFixed(2)} kWh`;
        },
      },
      grid: { left: 50, right: 60, top: 10, bottom: 30 },
      xAxis: {
        type: "category",
        data: HOURS,
        axisLabel: { color: "#727272", fontSize: 10, interval: 2 },
        splitArea: { show: true },
      },
      yAxis: {
        type: "category",
        data: DAYS,
        axisLabel: { color: "#727272", fontSize: 11 },
      },
      visualMap: {
        min: 0,
        max: maxVal,
        calculable: false,
        orient: "vertical",
        right: 0,
        top: "center",
        inRange: {
          color: ["#e3f2fd", "#42a5f5", "#1565c0", "#0d47a1"],
        },
        textStyle: { color: "#727272", fontSize: 10 },
      },
      series: [
        {
          type: "heatmap",
          data: heatmapData,
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.3)" },
          },
        },
      ],
    };

    instanceRef.current.setOption(option);

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [data]);

  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  return <div ref={chartRef} style={{ width: "100%", height }} />;
}
