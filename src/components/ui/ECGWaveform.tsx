"use client";

import { useRef, useEffect } from "react";

interface ECGWaveformProps {
  data: number[];
  height?: number;
  color?: string;
  zoom?: number;
}

export default function ECGWaveform({
  data,
  height = 160,
  color = "#06B6D4",
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

    const draw = () => {
      const currentZoom = zoomRef.current;
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = height * 2;
      ctx.scale(2, 2);
      const dw = canvas.offsetWidth;

      ctx.clearRect(0, 0, dw, height);

      // Grid — spacing scales with zoom so the grid visually stretches
      const gridSpacing = 20 * currentZoom;
      ctx.strokeStyle = "rgba(6,182,212,0.06)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < dw; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(dw, y);
        ctx.stroke();
      }

      const mid = height / 2;
      const amp = height * 0.35;

      // Main trace — zoom stretches horizontally: each data point spans `currentZoom` pixels
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.lineJoin = "round";
      for (let x = 0; x < dw; x++) {
        const dataIdx = x / currentZoom;
        const idx = (Math.floor(dataIdx) + Math.floor(offRef.current)) % data.length;
        const y = mid - data[idx] * amp;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Glow trace
      ctx.beginPath();
      ctx.strokeStyle = color + "40";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      for (let x = 0; x < dw; x++) {
        const dataIdx = x / currentZoom;
        const idx = (Math.floor(dataIdx) + Math.floor(offRef.current)) % data.length;
        const y = mid - data[idx] * amp;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

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
        background: "rgba(0,0,0,0.3)",
        display: "block",
      }}
    />
  );
}
