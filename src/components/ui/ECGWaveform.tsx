"use client";

import { useRef, useEffect } from "react";

interface ECGWaveformProps {
  data: number[];
  height?: number;
  color?: string;
  zoom?: number;
}

/**
 * Medical-monitor style ECG renderer — ported from the Wellness Pro BLE monitor.
 * Dark canvas, fine + bold ECG grid, green glow trace, and a scrolling sweep head.
 * The trace auto-scales to the data's actual range, so it renders correctly for
 * normalized floats (-1..1) OR raw ADC counts (e.g. 1000–8500).
 */
export default function ECGWaveform({
  data,
  height = 180,
  color = "#00ff88",
  zoom = 1,
}: ECGWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const offRef = useRef(0);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Auto-scale: map the data's actual range onto the canvas so any unit works.
    let min = Infinity;
    let max = -Infinity;
    for (const v of data) {
      if (!Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      min = -1;
      max = 1;
    }
    const range = max - min || 1; // avoid divide-by-zero on a flat trace

    const draw = () => {
      const currentZoom = zoomRef.current;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const dW = canvas.offsetWidth;
      const dH = height;

      // Backdrop
      ctx.clearRect(0, 0, dW, dH);
      ctx.fillStyle = "#020a05";
      ctx.fillRect(0, 0, dW, dH);

      const PAD = 10;
      const gW = dW - PAD * 2;
      const gH = dH - PAD * 2;
      const midY = PAD + gH * 0.55;
      const small = gH / 20;

      // Fine grid
      ctx.strokeStyle = "#061508";
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      for (let x = PAD; x <= dW - PAD; x += small) {
        ctx.moveTo(x, PAD);
        ctx.lineTo(x, dH - PAD);
      }
      for (let y = PAD; y <= dH - PAD; y += small) {
        ctx.moveTo(PAD, y);
        ctx.lineTo(dW - PAD, y);
      }
      ctx.stroke();

      // Bold grid (every 5th line)
      ctx.strokeStyle = "#0c2812";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (let x = PAD; x <= dW - PAD; x += small * 5) {
        ctx.moveTo(x, PAD);
        ctx.lineTo(x, dH - PAD);
      }
      for (let y = PAD; y <= dH - PAD; y += small * 5) {
        ctx.moveTo(PAD, y);
        ctx.lineTo(dW - PAD, y);
      }
      ctx.stroke();

      // Empty-data guard
      if (data.length === 0) {
        ctx.fillStyle = "#4a8a62";
        ctx.font = "13px 'Share Tech Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("NO ECG DATA", dW / 2, midY);
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const amp = gH * 0.38;
      // A flat signal (all samples equal, e.g. leads off / zero) draws a straight
      // centered line — just like the firmware's "flat line" state. Otherwise the
      // waveform is centered on midY and scaled to fill ~76% of the grid height.
      const flat = max === min;
      const scaleY = (v: number) =>
        flat ? midY : midY - (((v - min) / range) - 0.5) * 2 * amp;

      // Main green trace — zoom stretches horizontally; offRef scrolls it like a monitor.
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 3;
      for (let x = PAD; x <= dW - PAD; x++) {
        const dataIdx = (x - PAD) / currentZoom;
        const idx = (Math.floor(dataIdx) + Math.floor(offRef.current)) % data.length;
        const y = scaleY(data[idx]);
        x === PAD ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Glowing sweep head at the right edge (latest sample)
      const headX = dW - PAD;
      const headIdx =
        (Math.floor((headX - PAD) / currentZoom) + Math.floor(offRef.current)) % data.length;
      const headY = scaleY(data[headIdx]);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(headX, headY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Scroll speed stays consistent regardless of zoom
      offRef.current += 0.8;
      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animRef.current);
  }, [data, height, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height,
        borderRadius: 8,
        background: "#020a05",
        display: "block",
      }}
    />
  );
}
