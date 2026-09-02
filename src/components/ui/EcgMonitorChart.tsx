"use client";

import { useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// ECG MONITOR CHART
//
// A port of the mobile app's `EcgMonitorChart` / `_EcgChartPainter`
// (widgets/ecg_monitor_chart.dart), so a recording looks the same to an
// administrator as it did to the clinician holding the phone.
//
// Draws the ACTUAL ECG sample series. Nothing here synthesises a waveform:
// no textbook PQRST shape, no beat generator, no interpolation from HR or RR.
// Samples in, trace out. An empty series says so rather than drawing anything.
//
// The geometry below is deliberately identical to the Dart painter - the same
// px-per-mm derivation, the same 86%/7% vertical mapping, the same 0.68-span
// R-peak threshold. Where a number looks arbitrary it is because it matches
// the source, and changing it here would make the two charts disagree.
// ═══════════════════════════════════════════════════════════════════════════

// ── THERE IS NO DEFAULT SAMPLE RATE. ──────────────────────────────────────
// A hard-coded rate is not a harmless default: it IS the horizontal axis.
// Assuming 50 Hz while the device runs at 128 Hz stretches the trace 2.56x,
// so every interval read off the chart is wrong by that factor. The rate
// travels from the device to this component as a required-but-nullable
// value; null means "the device did not say", and null makes the chart say
// so instead of guessing.

/** Standard clinical chart speed, in millimetres per second. */
export const CHART_SPEED_MM_PER_SEC = 25;

/**
 * Below this the 5 mm major boxes stop being readable, so rather than
 * squashing the axis the chart shows a shorter, newer slice of the buffer.
 */
const MIN_PX_PER_MM = 2.2;
const MAX_PX_PER_MM = 8.0;

/** Nominal clinical gain, DISPLAY METADATA ONLY - never a measured calibration. */
export const NOMINAL_GAIN_LABEL = "10 mm/mV";

export type EcgQuality = "unknown" | "poor" | "good";

/** Intervals only. The device's P/Q/R/S/T are amplitudes and cannot place a landmark. */
export interface EcgPqrst {
  prMs: number | null;
  qrsMs: number | null;
  qtMs: number | null;
  qtcMs: number | null;
}

export const chartSpeedLabel = (rate: number | null) =>
  rate !== null && rate > 0 ? `${CHART_SPEED_MM_PER_SEC} mm/s` : "— mm/s (rate not reported)";

export const sampleRateLabel = (rate: number | null) =>
  rate !== null && rate > 0 ? `${rate} Hz (device-reported)` : "Sample rate: not reported";

// Colours lifted from the app's theme so the two traces are the same green on
// the same paper: AppColors.ecg / ecgPaper / ecgGrid / ecgGridMajor.
const COLORS = {
  trace: "#2EE8A0",
  paper: "#07101E",
  grid: "#16294A",
  gridMajor: "#20406E",
  axisText: "#64748B",
  markerR: "#2EE8A0",
  markerQS: "#60A5FA",
  markerPT: "#FACC15",
};

interface Marker {
  index: number;
  label: string;
  color: string;
  above: boolean;
}

/**
 * Threshold + refractory R-peak detection over the visible window.
 *
 * Identical to the Dart `_detectRPeaks`: a peak is a local maximum at or above
 * 68% of the window's span, and the next 250 ms is skipped because no rhythm
 * this device reports has beats closer together than that.
 */
function detectRPeaks(w: number[], rate: number): number[] {
  if (w.length < 5) return [];
  let lo = w[0];
  let hi = w[0];
  for (const v of w) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo;
  if (span <= 0) return [];
  const threshold = lo + span * 0.68;
  const refractory = Math.max(1, Math.round(0.25 * rate));

  const peaks: number[] = [];
  let i = 1;
  while (i < w.length - 1) {
    if (w[i] >= threshold && w[i] >= w[i - 1] && w[i] >= w[i + 1]) {
      peaks.push(i);
      i += refractory;
    } else {
      i += 1;
    }
  }
  return peaks;
}

/**
 * Locate PQRST landmarks IN THE SAMPLES.
 *
 * The device's P/Q/R/S/T fields are amplitudes of an unconfirmed unit, so they
 * cannot say where on the trace a landmark sits - placing the letters from
 * them would put them in arbitrary positions. Only the measured intervals are
 * used, and only to bound the search window around each detected R peak.
 */
function buildMarkers(w: number[], rate: number, pqrst: EcgPqrst | null): Marker[] {
  if (!pqrst) return [];
  const rIdx = detectRPeaks(w, rate);
  if (!rIdx.length) return [];

  const out: Marker[] = [];
  const perMs = rate / 1000;

  const argExtreme = (from: number, to: number, wantMax: boolean): number | null => {
    const a = Math.min(Math.max(from, 0), w.length - 1);
    const b = Math.min(Math.max(to, 0), w.length - 1);
    if (b <= a) return null;
    let best = a;
    for (let i = a; i <= b; i += 1) {
      if (wantMax ? w[i] > w[best] : w[i] < w[best]) best = i;
    }
    return best;
  };

  for (const r of rIdx) {
    out.push({ index: r, label: "R", color: COLORS.markerR, above: true });

    const qrs = pqrst.qrsMs;
    if (qrs !== null && qrs > 0) {
      const half = Math.min(Math.max(Math.round((qrs * perMs) / 2), 1), w.length);
      const q = argExtreme(r - half, r - 1, false);
      if (q !== null) out.push({ index: q, label: "Q", color: COLORS.markerQS, above: false });
      const s = argExtreme(r + 1, r + half, false);
      if (s !== null) out.push({ index: s, label: "S", color: COLORS.markerQS, above: false });
    }

    const pr = pqrst.prMs;
    if (pr !== null && pr > 0) {
      const prS = Math.round(pr * perMs);
      // The P peak lies inside the PR interval, after P onset.
      const p = argExtreme(r - prS, r - Math.round(prS * 0.35), true);
      if (p !== null) out.push({ index: p, label: "P", color: COLORS.markerPT, above: true });
    }

    const qt = pqrst.qtMs;
    if (qt !== null && qt > 0) {
      const qtS = Math.round(qt * perMs);
      const qrsHalf = qrs !== null && qrs > 0 ? Math.round((qrs * perMs) / 2) : 0;
      const t = argExtreme(r + qrsHalf + Math.round(0.06 * rate), r + qtS, true);
      if (t !== null) out.push({ index: t, label: "T", color: COLORS.markerPT, above: true });
    }
  }
  return out;
}

export interface EcgMonitorChartProps {
  /** Oldest → newest, raw ADC counts, ALREADY polarity-corrected by the caller. */
  samples: number[];
  /**
   * The device's declared rate. Required-but-nullable so no caller can forget
   * it and silently get a made-up time base.
   */
  sampleRateHz: number | null;
  pqrst?: EcgPqrst | null;
  leadOn?: boolean;
  quality?: EcgQuality;
  height?: number;
  emptyMessage?: string;
  /**
   * Admin-only affordance the phone does not have: shows a shorter, newer
   * slice of the recording so a clinician can inspect complexes more closely.
   *
   * 1 means "the whole buffer", which is exactly what the phone draws - so at
   * the default this chart is identical to the app's. Zooming only changes HOW
   * MANY samples are visible; it never resamples, interpolates or rescales the
   * time base, so a small box stays a true 40 ms at every zoom level.
   */
  zoom?: number;
}

export default function EcgMonitorChart({
  samples,
  sampleRateHz,
  pqrst = null,
  leadOn = true,
  quality = "unknown",
  height = 220,
  emptyMessage = "No ECG samples were recorded for this session.",
  zoom = 1,
}: EcgMonitorChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !samples.length) return;

    const draw = () => {
      const cssWidth = wrap.clientWidth;
      const cssHeight = height;
      if (cssWidth <= 1) return;

      // Backing store at device pixel ratio, then scale the context, so the
      // 1.7px stroke and the mm grid stay crisp instead of blurring.
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

      // Padding matches the Dart painter exactly.
      const leftPad = 6;
      const rightPad = 6;
      const topPad = 10;
      const bottomPad = 10;
      const plot = {
        left: leftPad,
        top: topPad,
        width: cssWidth - leftPad - rightPad,
        height: cssHeight - topPad - bottomPad,
        get right() {
          return this.left + this.width;
        },
        get bottom() {
          return this.top + this.height;
        },
        get midY() {
          return this.top + this.height / 2;
        },
      };
      if (plot.width <= 1 || plot.height <= 1) return;

      // ── Time base ──────────────────────────────────────────────────────
      // KNOWN RATE: the axis is laid out at a true 25 mm/s, and sample i sits
      // at i / rate seconds - DEVICE sample timing. Arrival timestamps are
      // never consulted; they describe when a batch reached the phone, not
      // when the samples were taken, and would jitter the trace with radio
      // latency.
      //
      // UNKNOWN RATE: there is no honest time base, so the grid is ruled at a
      // fixed pixel pitch and labelled uncalibrated. No mm/s is claimed.
      const rate = sampleRateHz !== null && sampleRateHz > 0 ? sampleRateHz : 0;
      const rateKnown = rate > 0;

      let pxPerMm: number;
      let windowSamples = samples.length;
      if (rateKnown) {
        const bufferSeconds = samples.length / rate;
        pxPerMm = plot.width / (CHART_SPEED_MM_PER_SEC * bufferSeconds);
        if (pxPerMm < MIN_PX_PER_MM) {
          pxPerMm = MIN_PX_PER_MM;
          const windowSeconds = plot.width / (CHART_SPEED_MM_PER_SEC * pxPerMm);
          windowSamples = Math.max(2, Math.floor(windowSeconds * rate));
        }
        pxPerMm = Math.min(Math.max(pxPerMm, MIN_PX_PER_MM), MAX_PX_PER_MM);
      } else {
        pxPerMm = 4.0; // pure ruling; carries no time meaning
      }

      // Zoom narrows the window to the newest samples. Applied AFTER the
      // px/mm derivation so the 25 mm/s scaling is untouched: a zoomed view
      // shows less time at the same calibration, never the same time stretched.
      if (zoom > 1) {
        windowSamples = Math.max(2, Math.floor(windowSamples / zoom));
      }

      const startIdx = Math.max(0, samples.length - windowSamples);
      const win = samples.slice(startIdx);
      if (win.length < 2) return;

      // With fewer samples in the same width, the grid must be re-derived or
      // the boxes would no longer be millimetres.
      if (rateKnown) {
        const visibleSeconds = win.length / rate;
        pxPerMm = Math.min(
          Math.max(plot.width / (CHART_SPEED_MM_PER_SEC * visibleSeconds), MIN_PX_PER_MM),
          MAX_PX_PER_MM
        );
      }

      // ── Grid ───────────────────────────────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.rect(plot.left, plot.top, plot.width, plot.height);
      ctx.clip();

      const line = (x1: number, y1: number, x2: number, y2: number, major: boolean) => {
        ctx.strokeStyle = major ? COLORS.gridMajor : COLORS.grid;
        ctx.lineWidth = major ? 1.0 : 0.6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      };

      let gi = 0;
      for (let x = plot.left; x <= plot.right; x += pxPerMm, gi += 1) {
        line(x, plot.top, x, plot.bottom, gi % 5 === 0);
      }
      // Horizontal ruling is anchored to the centre so the 5 mm boxes stay
      // symmetric regardless of the card height.
      const midY = plot.midY;
      for (let k = 0; ; k += 1) {
        const off = k * pxPerMm;
        if (midY - off < plot.top && midY + off > plot.bottom) break;
        const major = k % 5 === 0;
        if (midY - off >= plot.top) line(plot.left, midY - off, plot.right, midY - off, major);
        if (k !== 0 && midY + off <= plot.bottom) {
          line(plot.left, midY + off, plot.right, midY + off, major);
        }
      }
      ctx.restore();

      // ── Vertical scale ─────────────────────────────────────────────────
      // Auto-scaled to the visible window. Deliberately NOT converted to mV:
      // the device streams uncalibrated ADC counts and no counts-to-mV factor
      // is known for this hardware.
      let minV = win[0];
      let maxV = win[0];
      for (const v of win) {
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
      }
      let span = maxV - minV;
      if (Math.abs(span) < 1e-9) {
        // Perfectly flat window (e.g. leads off) - draw a flat line at
        // mid-height instead of dividing by zero.
        span = 1.0;
        minV -= 0.5;
      }

      const dx = plot.width / (win.length - 1);
      const yFor = (v: number) =>
        plot.bottom - ((v - minV) / span) * plot.height * 0.86 - plot.height * 0.07;

      // Poor quality or leads off → the trace is drawn faded, so it is
      // visibly present but visibly not trustworthy. The samples are never
      // blanked: they are what the device actually recorded.
      const degraded = !leadOn || quality === "poor";

      ctx.save();
      ctx.beginPath();
      ctx.rect(plot.left - 2, plot.top - 2, plot.width + 4, plot.height + 4);
      ctx.clip();

      ctx.beginPath();
      for (let i = 0; i < win.length; i += 1) {
        const px = plot.left + i * dx;
        const py = yFor(win[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = COLORS.trace;
      ctx.globalAlpha = degraded ? 0.42 : 1;
      ctx.lineWidth = 1.7;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.globalAlpha = 1;

      // ── PQRST markers ──────────────────────────────────────────────────
      // Locating them needs the ms→sample conversion, so an unknown rate
      // means no markers - placing them from a guessed rate would put the
      // letters in the wrong places.
      if (!degraded && rateKnown) {
        ctx.font = "700 12px ui-sans-serif, system-ui, sans-serif";
        for (const m of buildMarkers(win, rate, pqrst)) {
          const px = plot.left + m.index * dx;
          const py = yFor(win[m.index]);
          ctx.fillStyle = m.color;
          ctx.beginPath();
          ctx.arc(px, py, 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillText(m.label, px - 3.5, m.above ? py - 18 + 9 : py + 6 + 9);
        }
      }
      ctx.restore();

      ctx.fillStyle = COLORS.axisText;
      ctx.font = "400 9px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(
        rateKnown
          ? `ADC counts (uncalibrated) - ${CHART_SPEED_MM_PER_SEC} mm/s at ${rate}Hz`
          : "ADC counts (uncalibrated) - time base unavailable: device has not reported RATE_HZ",
        plot.left + 2,
        plot.top + 8
      );
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [samples, sampleRateHz, pqrst, leadOn, quality, height, zoom]);

  if (!samples.length) {
    return (
      <div
        ref={wrapRef}
        className="flex flex-col items-center justify-center rounded-[10px] text-center"
        style={{ background: COLORS.paper, height, padding: "0 24px" }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={COLORS.axisText} strokeWidth="2">
          <polyline points="3 17 8 17 10 11 13 20 16 14 21 14" />
        </svg>
        <p className="text-[12px] mt-2" style={{ color: COLORS.axisText }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="rounded-[10px] overflow-hidden" style={{ background: COLORS.paper }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
