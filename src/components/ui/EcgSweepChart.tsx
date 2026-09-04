"use client";

import { useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// ECG SWEEP CHART - continuous, real-time-paced playback of a stored
// recording, positioned by each sample's own timestamp.
//
// MOTION: new data enters at the RIGHT edge and drifts LEFT, continuously,
// at real-time speed - it never wraps or resets. Positioning is TIME-based
// (each sample's real offset from session start maps directly to an x
// coordinate), not sample-count-based, so a recording with real gaps (lead-
// off, a dropped batch) still paces correctly: the strip keeps moving at the
// true wall-clock rate regardless of how many samples happen to exist in any
// given stretch.
//
// SAMPLE HANDLING is ported from the Wellness Pro monitor's own drawECG():
//   - raw samples only, no PQRST, no beat detection, no landmarks - this
//     draws exactly what was received, nothing more (analysis lives in
//     EcgBeatAnalysis, not here)
//   - the vertical scale centres on the MEDIAN of the real signal and spans
//     the largest absolute deviation from it - more robust to a single
//     motion-artifact spike than a plain min/max would be
//   - ECG:0, this codebase's "not measured" sentinel (lead-off, QUALITY:0,
//     same convention as HR:0/SPO2:0/TEMP:0), is excluded from that scale and
//     drawn through the centreline instead of a real value - so a "no
//     reading" stretch is a calm, visible flat line, never a value forced
//     through a scale meant for the real signal, and never a stop/blank
//     either. A genuine time gap (no sample at all covering some span) gets
//     exactly the same flat-centreline treatment, for the same reason.
// ═══════════════════════════════════════════════════════════════════════════

const CHART_SPEED_MM_PER_SEC = 25;

// A gap this large between two consecutive REAL samples is filled flat
// instead of drawing a diagonal straight through it - the recording has no
// data there, and joining two distant real points would draw a signal that
// was never recorded.
const GAP_BREAK_SEC = 0.3;

const COLORS = {
  trace: "#2EE8A0",
  paper: "#07101E",
  grid: "#16294A",
  gridMajor: "#20406E",
  axisText: "#64748B",
};

export type EcgSweepQuality = "unknown" | "poor" | "good";

export interface EcgSweepChartProps {
  /** The ENTIRE recording's ADC values, oldest -> newest, polarity-corrected. */
  samples: number[];
  /**
   * Each sample's real elapsed-time offset from session start, in seconds.
   * Same length and order as `samples`, non-decreasing.
   */
  offsetsSec: number[];
  /** Current playhead, in session-elapsed seconds. */
  elapsedSec: number;
  /** Width of the visible strip, in seconds - fixed for the component's life. */
  windowSec: number;
  /** Device-reported rate, shown on the axis label only - not used for geometry. */
  sampleRateHz?: number | null;
  leadOn?: boolean;
  quality?: EcgSweepQuality;
  height?: number;
}

/** First index in a non-decreasing array with value >= target. */
function lowerBound(arr: number[], target: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function median(sorted: number[]): number {
  const n = sorted.length;
  if (!n) return 0;
  const m = Math.floor(n / 2);
  return n % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

export default function EcgSweepChart({
  samples,
  offsetsSec,
  elapsedSec,
  windowSec,
  sampleRateHz = null,
  leadOn = true,
  quality = "unknown",
  height = 220,
}: EcgSweepChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !samples.length || !offsetsSec.length) return;

    const draw = () => {
      const cssWidth = wrap.clientWidth;
      const cssHeight = height;
      if (cssWidth <= 1) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.fillStyle = COLORS.paper;
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      const leftPad = 6;
      const rightPad = 6;
      const topPad = 10;
      const bottomPad = 10;
      const plot = {
        left: leftPad,
        top: topPad,
        width: cssWidth - leftPad - rightPad,
        height: cssHeight - topPad - bottomPad,
      };
      const right = plot.left + plot.width;
      const bottom = plot.top + plot.height;
      if (plot.width <= 1 || plot.height <= 1) return;

      // Purely time-based window: [elapsedSec - windowSec, elapsedSec] of
      // real session time. New data always lands at `right`; nothing here
      // depends on sample rate or sample count, so the scale cannot ramp up
      // or rescale, and the strip never wraps - it only ever scrolls.
      const winStart = elapsedSec - windowSec;
      const pxPerMm = plot.width / (CHART_SPEED_MM_PER_SEC * windowSec);
      const xFor = (t: number) => plot.left + ((t - winStart) / windowSec) * plot.width;

      // ── grid ──
      ctx.save();
      ctx.beginPath();
      ctx.rect(plot.left, plot.top, plot.width, plot.height);
      ctx.clip();
      let gi = 0;
      for (let x = plot.left; x <= right; x += pxPerMm, gi += 1) {
        ctx.strokeStyle = gi % 5 === 0 ? COLORS.gridMajor : COLORS.grid;
        ctx.lineWidth = gi % 5 === 0 ? 1.0 : 0.6;
        ctx.beginPath();
        ctx.moveTo(x, plot.top);
        ctx.lineTo(x, bottom);
        ctx.stroke();
      }
      const midY = plot.top + plot.height / 2;
      for (let k = 0; ; k += 1) {
        const off = k * pxPerMm;
        if (midY - off < plot.top && midY + off > bottom) break;
        const major = k % 5 === 0;
        ctx.strokeStyle = major ? COLORS.gridMajor : COLORS.grid;
        ctx.lineWidth = major ? 1.0 : 0.6;
        if (midY - off >= plot.top) {
          ctx.beginPath();
          ctx.moveTo(plot.left, midY - off);
          ctx.lineTo(right, midY - off);
          ctx.stroke();
        }
        if (k !== 0 && midY + off <= bottom) {
          ctx.beginPath();
          ctx.moveTo(plot.left, midY + off);
          ctx.lineTo(right, midY + off);
          ctx.stroke();
        }
      }
      ctx.restore();

      // ── amplitude scale ──
      // Median-centred, spanning the largest absolute deviation from it -
      // the same auto-gain the reference monitor uses, and more robust to a
      // single motion-artifact spike than a plain min/max would be. Fixed
      // across the WHOLE recording, not just what is currently visible, so
      // the gain never jitters as new beats scroll into view.
      //
      // ECG:0 (the "not measured" sentinel) is excluded: every real sample
      // here is POSITIVE (the device's own baseline) and gets negated for
      // polarity by the caller, so real samples are all NEGATIVE while a
      // literal 0 stays 0 - left in, it would sit far outside the real
      // signal's cluster and drag the scale toward it.
      const real: number[] = [];
      for (let i = 0; i < samples.length; i += 1) if (samples[i] !== 0) real.push(samples[i]);
      const scaleSource = real.length ? real : samples;
      const sorted = [...scaleSource].sort((a, b) => a - b);
      const baseline = median(sorted);
      let maxDev = 1;
      for (let i = 0; i < scaleSource.length; i += 1) {
        const d = Math.abs(scaleSource[i] - baseline);
        if (d > maxDev) maxDev = d;
      }
      const midYSignal = plot.top + plot.height * 0.55;
      const scale = (plot.height * 0.42) / maxDev;
      // A "not measured" sample - explicit sentinel or a stretch with no
      // sample at all - is drawn through the centreline: a deliberate, calm
      // "nothing was read here" signal, never a value forced through the
      // real signal's scale and never a stop or blank canvas either.
      const yForSample = (v: number) => (v === 0 ? midYSignal : midYSignal - (v - baseline) * scale);

      // ── trace ──
      // The pen is ALWAYS drawing, all the way to the playhead, whether or
      // not a real sample exists at any given instant.
      const startIdx = lowerBound(offsetsSec, winStart);
      const endIdx = lowerBound(offsetsSec, elapsedSec);
      const windowEnd = Math.min(elapsedSec, winStart + windowSec);
      if (windowEnd > winStart) {
        const degraded = !leadOn || quality === "poor";
        ctx.save();
        ctx.beginPath();
        ctx.rect(plot.left - 2, plot.top - 2, plot.width + 4, plot.height + 4);
        ctx.clip();
        ctx.beginPath();
        let cursorT = winStart;
        ctx.moveTo(xFor(cursorT), midYSignal);
        let lastSample: number | null = null;
        for (let i = startIdx; i < endIdx; i += 1) {
          const t = offsetsSec[i];
          const py = yForSample(samples[i]);
          // No real sample covers [cursorT, t). Step to the centre AT
          // cursorT first, THEN draw flat across to t - two segments, not
          // one - so the fill is a horizontal line, not a diagonal ramp from
          // whatever real value preceded the gap to the centre far away.
          if (t - cursorT > GAP_BREAK_SEC) {
            ctx.lineTo(xFor(cursorT), midYSignal);
            ctx.lineTo(xFor(t), midYSignal);
          }
          ctx.lineTo(xFor(t), py);
          cursorT = t;
          lastSample = samples[i];
        }
        // Nothing real covers the tail of the window either - same two-step
        // fill up to the playhead (or the window's right edge, sooner of the two).
        if (windowEnd - cursorT > 1e-9) {
          ctx.lineTo(xFor(cursorT), midYSignal);
          ctx.lineTo(xFor(windowEnd), midYSignal);
        }
        ctx.strokeStyle = COLORS.trace;
        ctx.globalAlpha = degraded ? 0.42 : 1;
        ctx.lineWidth = 1.7;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();

        // Write head: a dot at the newest point actually on screen, exactly
        // like the reference's own sweep-position marker - only shown while
        // a real sample is actively being received (not during a "no
        // reading" stretch, so it never sits pinned on the centreline).
        if (lastSample !== null && elapsedSec - cursorT <= GAP_BREAK_SEC) {
          ctx.fillStyle = COLORS.trace;
          ctx.globalAlpha = degraded ? 0.42 : 1;
          ctx.beginPath();
          ctx.arc(xFor(cursorT), yForSample(lastSample), 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      ctx.fillStyle = COLORS.axisText;
      ctx.font = "400 9px ui-sans-serif, system-ui, sans-serif";
      const rateLabel = sampleRateHz && sampleRateHz > 0 ? ` at ${sampleRateHz}Hz` : "";
      ctx.fillText(
        `ADC counts (uncalibrated) - ${CHART_SPEED_MM_PER_SEC} mm/s${rateLabel} - ${windowSec}s window`,
        plot.left + 2,
        plot.top + 8
      );
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [samples, offsetsSec, elapsedSec, windowSec, sampleRateHz, leadOn, quality, height]);

  if (!samples.length || !offsetsSec.length) return null;

  return (
    <div ref={wrapRef} className="rounded-[10px] overflow-hidden" style={{ background: COLORS.paper }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
