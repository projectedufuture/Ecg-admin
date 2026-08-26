"use client";

import { useMemo, useState } from "react";
import { usePrintMode } from "@/lib/printMode";

/**
 * Responsive SVG line chart for a backend-supplied time series.
 *
 * Follows the hand-rolled SVG approach the Dashboard already uses (no chart
 * library is installed in this project) but scales with its container instead of
 * rendering at a fixed pixel size: the viewBox is fixed and the <svg> is width
 * 100%, so the chart resizes on tablet and narrower without overflowing.
 *
 * It renders nothing when handed an empty series — callers decide what the
 * empty state should say.
 */

interface TrendChartProps {
  /** X value per point. Interpreted as seconds unless `xLabels` is given. */
  x: number[];
  /** Y value per point, in `unit`. */
  y: number[];
  color: string;
  unit: string;
  /** Accessible description of what the line represents. */
  label: string;
  height?: number;
  /**
   * Axis text per point, for series whose x axis is not a duration (e.g. one
   * point per session). Without this, x is formatted as m:ss.
   */
  xLabels?: string[];
  /** What one point is, for the hover readout. Defaults to "intervals". */
  pointNoun?: string;
}

/**
 * Choose a round tick interval covering `span` in roughly `targetSteps` steps.
 * Snapping to 1/2/2.5/5 x 10^k is what keeps the axis labels whole numbers.
 */
function niceInterval(span: number, targetSteps: number): number {
  if (span <= 0) return 1;
  const rough = span / targetSteps;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalised = rough / magnitude;
  const snapped = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10;
  return snapped * magnitude;
}

/**
 * Axis bounds and tick values that are all round numbers.
 *
 * The interval is picked first and the bounds are then snapped outwards to
 * multiples of it, so every label divides evenly — deriving the interval from
 * arbitrary bounds instead is what produces labels like 763 and 888.
 */
function niceAxis(min: number, max: number, targetSteps: number) {
  // Pad a flat series so a constant line does not sit exactly on the axis.
  const lo0 = min === max ? min - Math.max(1, Math.abs(min) * 0.05) : min;
  const hi0 = min === max ? max + Math.max(1, Math.abs(max) * 0.05) : max;

  const interval = niceInterval(hi0 - lo0, targetSteps);
  const lo = Math.floor(lo0 / interval) * interval;
  const hi = Math.ceil(hi0 / interval) * interval;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + interval / 1000; v += interval) ticks.push(v);

  /**
   * Decimals needed for the labels to stay distinct.
   *
   * A sub-unit interval rounded to whole numbers renders as "31, 31, 32, 32, 33"
   * — two identical labels at different heights, which reads as a bug. The
   * decimal count is derived from the interval so temperature (0.5 °C steps) and
   * heart rate (5 BPM steps) are both labelled correctly.
   */
  const decimals = interval >= 1 ? 0 : interval >= 0.1 ? 1 : 2;

  return { lo, hi, ticks, decimals };
}

/** Seconds into the recording, as m:ss. */
function formatOffset(seconds: number): string {
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function TrendChart({
  x,
  y,
  color,
  unit,
  label,
  height = 220,
  xLabels,
  pointNoun = "intervals",
}: TrendChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  // "hover for values" is an instruction that cannot be followed on paper.
  const printing = usePrintMode();

  // Fixed viewBox coordinate space; the rendered size comes from CSS.
  const W = 720;
  const H = height;
  const padL = 52;
  const padR = 16;
  const padT = 16;
  const padB = 34;
  const cW = W - padL - padR;
  const cH = H - padT - padB;

  const geometry = useMemo(() => {
    if (!y.length) return null;

    const { lo, hi, ticks, decimals } = niceAxis(Math.min(...y), Math.max(...y), 4);
    const span = hi - lo || 1;

    const xMin = x[0] ?? 0;
    const xMax = x[x.length - 1] ?? 1;
    const xSpan = xMax - xMin || 1;

    const points = y.map((value, i) => ({
      x: padL + ((x[i] - xMin) / xSpan) * cW,
      y: padT + cH - ((value - lo) / span) * cH,
      value,
      offset: x[i],
    }));

    return { points, lo, hi, ticks, decimals };
  }, [x, y, cH, cW, padL, padT]);

  if (!geometry) return null;

  const { points, lo, hi, ticks, decimals } = geometry;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x},${padT + cH} L ${points[0].x},${padT + cH} Z`;

  const gradientId = `trend-${label.replace(/[^a-zA-Z0-9]/g, "")}`;

  const active = hover !== null ? points[hover] : null;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label} over time, in ${unit}`}
        style={{ display: "block", width: "100%", height }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          // Map the pointer back into viewBox space to find the nearest point.
          const rect = e.currentTarget.getBoundingClientRect();
          const vx = ((e.clientX - rect.left) / rect.width) * W;
          let nearest = 0;
          let best = Infinity;
          for (let i = 0; i < points.length; i += 1) {
            const d = Math.abs(points[i].x - vx);
            if (d < best) {
              best = d;
              nearest = i;
            }
          }
          setHover(nearest);
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid + y labels, at round tick values */}
        {ticks.map((value) => {
          const yPos = padT + cH - ((value - lo) / (hi - lo || 1)) * cH;
          return (
            <g key={value}>
              <line
                x1={padL}
                y1={yPos}
                x2={W - padR}
                y2={yPos}
                stroke="var(--border-clr)"
                strokeWidth="1"
              />
              <text
                x={padL - 8}
                y={yPos + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--text-muted)"
              >
                {value.toFixed(decimals)}
              </text>
            </g>
          );
        })}

        {/* X labels at start / middle / end of the recording */}
        {[0, Math.floor(points.length / 2), points.length - 1]
          .filter((i, idx, arr) => arr.indexOf(i) === idx && points[i])
          .map((i) => (
            <text
              key={i}
              x={points[i].x}
              y={H - 10}
              textAnchor="middle"
              fontSize="11"
              fill="var(--text-muted)"
            >
              {xLabels ? xLabels[i] : formatOffset(points[i].offset)}
            </text>
          ))}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {active && (
          <g>
            <line
              x1={active.x}
              y1={padT}
              x2={active.x}
              y2={padT + cH}
              stroke={color}
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={active.x} cy={active.y} r="4" fill={color} />
          </g>
        )}
      </svg>

      {/* Readout lives outside the SVG so its text is never stretched by
          preserveAspectRatio="none". */}
      <div
        className="text-[11px] mt-1 h-4"
        style={{ color: active ? "var(--text-secondary)" : "var(--text-muted)" }}
      >
        {active
          ? `${
              xLabels ? xLabels[points.indexOf(active)] : formatOffset(active.offset)
            } — ${active.value} ${unit}`
          : `${points.length} ${pointNoun}${printing ? "" : " · hover for values"}`}
      </div>
    </div>
  );
}
