import React from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
  showArea?: boolean;
}

export function Sparkline({
  data,
  width = 80,
  height = 28,
  color = "currentColor",
  className = "opacity-70",
  showArea = true,
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 1;

  const coords = data.map((v, i) => ({
    x: (i / (data.length - 1)) * (width - padding * 2) + padding,
    y: height - padding - ((v - min) / range) * (height - padding * 2),
  }));

  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");

  // Area fill polygon: line points + bottom-right + bottom-left
  const areaPoints = showArea
    ? `${linePoints} ${width - padding},${height - padding} ${padding},${height - padding}`
    : "";

  return (
    <svg width={width} height={height} className={className}>
      {showArea && (
        <polygon
          points={areaPoints}
          fill={color}
          opacity="0.15"
        />
      )}
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
