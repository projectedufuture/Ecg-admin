"use client";

interface MiniChartProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

export default function MiniChart({
  data,
  color = "#06B6D4",
  height = 48,
  width = 120,
}: MiniChartProps) {
  if (!data?.length) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const pts = data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 8) - 4}`
    )
    .join(" ");

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
