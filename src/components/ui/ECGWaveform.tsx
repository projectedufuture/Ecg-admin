"use client";

import { useRef, useEffect } from "react";

interface ECGWaveformProps {
  /** Stored ecgValues. A non-zero value = signal present (beat) → synthetic PQRST.
   *  A zero value = no signal → flat line. */
  data: number[];
  /** Heart rate (avgHR) that sets the beat cadence. */
  bpm?: number;
  height?: number;
  color?: string;
  zoom?: number;
}

/* ─────────── Synthetic PQRST generator (from the Wellness Pro monitor) ─────────── */
function gaussian(x: number, amp: number, center: number, width: number) {
  return amp * Math.exp(-((x - center) ** 2) / (2 * width * width));
}
function ecgCycle(t: number) {
  let y = 0;
  y += gaussian(t, 0.12, 0.16, 0.035); // P
  y += gaussian(t, -0.08, 0.28, 0.012); // Q
  y += gaussian(t, 1.0, 0.32, 0.018); // R
  y += gaussian(t, -0.18, 0.36, 0.015); // S
  y += gaussian(t, 0.22, 0.55, 0.055); // T
  y += gaussian(t, 0.03, 0.7, 0.025); // U
  return y;
}
const LUT_SIZE = 1000;
const ecgLUT = new Float64Array(LUT_SIZE);
for (let i = 0; i < LUT_SIZE; i++) ecgLUT[i] = ecgCycle(i / LUT_SIZE);
function lookupECG(t: number) {
  const idx = ((t % 1) + 1) % 1;
  const fi = idx * (LUT_SIZE - 1);
  const lo = Math.floor(fi);
  const hi = Math.min(lo + 1, LUT_SIZE - 1);
  const frac = fi - lo;
  return ecgLUT[lo] * (1 - frac) + ecgLUT[hi] * frac;
}

export default function ECGWaveform({
  data,
  bpm = 72,
  height = 220,
  color = "#00ff88",
  zoom = 1,
}: ECGWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dataRef = useRef(data);
  const bpmRef = useRef(bpm);
  const zoomRef = useRef(zoom);
  dataRef.current = data;
  bpmRef.current = bpm > 0 ? bpm : 72;
  zoomRef.current = zoom;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /* ─────────── State machine + display buffer ─────────── */
    // Hold ~16s of samples so zoom-out can still fill the full width.
    const BUFFER = 3200;
    const BASE_VISIBLE = 800; // samples shown across the width at zoom = 1
    const DISPLAY_RATE = 200;
    const displayBuf = new Float64Array(BUFFER).fill(NaN);
    let sweepPos = 0;
    let readIdx = 0;
    let lastSampleTime = performance.now();

    let waveState: "BASELINE" | "PLAYING" = "BASELINE";
    let cyclePhase = 0;
    let cycleSamplesDone = 0;
    let cycleSamplesTotal = 0;
    let leadNow = false;

    const noise = () => (Math.random() - 0.5) * 0.004;

    const startCycle = () => {
      waveState = "PLAYING";
      cyclePhase = 0;
      cycleSamplesDone = 0;
      const beatPeriodMs = 60000 / Math.max(40, bpmRef.current);
      cycleSamplesTotal = Math.round((beatPeriodMs / 1000) * DISPLAY_RATE);
      cycleSamplesTotal = Math.max(80, Math.min(400, cycleSamplesTotal));
    };

    // The stored ecgValue drives lead/beat state: non-zero => signal present => play
    // the synthetic PQRST; zero => flat line. Cadence set by the recorded bpm.
    const nextWaveformSample = () => {
      const d = dataRef.current;
      const raw = d.length > 0 ? d[readIdx % d.length] : 0;
      readIdx++;
      const leadOn = raw !== 0;
      leadNow = leadOn;

      if (!leadOn) {
        waveState = "BASELINE";
        return 0; // hard flat line
      }
      if (waveState === "PLAYING") {
        cycleSamplesDone++;
        cyclePhase = cycleSamplesDone / cycleSamplesTotal;
        if (cyclePhase >= 1) {
          startCycle(); // free-run: next beat immediately while signal is present
          return lookupECG(0) + noise();
        }
        return lookupECG(cyclePhase) + noise();
      }
      startCycle();
      return lookupECG(0) + noise();
    };

    /* ─────────── Drawing engine ─────────── */
    const draw = (timestamp: number) => {
      const sampleInterval = 1000 / DISPLAY_RATE;
      while (timestamp - lastSampleTime >= sampleInterval) {
        lastSampleTime += sampleInterval;
        displayBuf[sweepPos] = nextWaveformSample();
        sweepPos = (sweepPos + 1) % BUFFER;
      }

      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const dW = canvas.offsetWidth;
      const dH = height;

      ctx.clearRect(0, 0, dW, dH);
      ctx.fillStyle = "#020a05";
      ctx.fillRect(0, 0, dW, dH);

      const PAD = 10;
      const gH = dH - PAD * 2;
      const small = gH / 20;
      const midY = PAD + gH * 0.55;
      const scale = gH * 0.38;

      // Fine grid
      ctx.strokeStyle = "#061508";
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      for (let x = PAD; x <= dW - PAD; x += small) { ctx.moveTo(x, PAD); ctx.lineTo(x, dH - PAD); }
      for (let y = PAD; y <= dH - PAD; y += small) { ctx.moveTo(PAD, y); ctx.lineTo(dW - PAD, y); }
      ctx.stroke();
      // Bold grid
      ctx.strokeStyle = "#0c2812";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (let x = PAD; x <= dW - PAD; x += small * 5) { ctx.moveTo(x, PAD); ctx.lineTo(x, dH - PAD); }
      for (let y = PAD; y <= dH - PAD; y += small * 5) { ctx.moveTo(PAD, y); ctx.lineTo(dW - PAD, y); }
      ctx.stroke();

      // Show a trailing window of samples that always fills the width. Zoom out =>
      // more samples (compressed); zoom in => fewer samples (stretched).
      const visible = Math.max(100, Math.min(BUFFER, Math.round(BASE_VISIBLE / zoomRef.current)));
      const step = (dW - PAD * 2) / visible;

      // Trace — newest sample at the right edge, scrolling left.
      ctx.strokeStyle = leadNow ? color : "#2e6b46";
      ctx.lineWidth = 1.8;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      if (leadNow) { ctx.shadowColor = color; ctx.shadowBlur = 3; }
      ctx.beginPath();
      let drawing = false;
      for (let k = 0; k < visible; k++) {
        const bufIdx = ((sweepPos - visible + k) % BUFFER + BUFFER) % BUFFER;
        const val = displayBuf[bufIdx];
        if (Number.isNaN(val)) { drawing = false; continue; }
        const x = PAD + k * step;
        const y = midY - val * scale;
        if (!drawing) { ctx.moveTo(x, y); drawing = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (!leadNow) {
        ctx.fillStyle = "#4a8a62";
        ctx.font = "12px 'Share Tech Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("NO SIGNAL — flat line", dW / 2, midY - 14);
      }

      // Current-position dot at the right edge (latest sample).
      const cv = displayBuf[(sweepPos - 1 + BUFFER) % BUFFER];
      if (!Number.isNaN(cv)) {
        ctx.fillStyle = leadNow ? color : "#2e6b46";
        ctx.beginPath();
        ctx.arc(PAD + (visible - 1) * step, midY - cv * scale, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [height, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height, borderRadius: 8, background: "#020a05", display: "block" }}
    />
  );
}
