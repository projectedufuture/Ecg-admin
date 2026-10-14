"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, ChevronRight, ChevronLeft, Heart, Droplets, Thermometer, Flame,
  MapPin, Gauge, Clock, Activity, Footprints, Bike, Dumbbell, Mountain, Zap, Circle,
  Play, Pause, Maximize2, Edit3, Download, MoreHorizontal, FileText, Calendar,
  Smartphone, AlertCircle, RefreshCw, ArrowUp, ArrowDown, Minus, X,
} from "lucide-react";
import EcgMonitorChart, { type EcgQuality, type EcgPqrst } from "@/components/ui/EcgMonitorChart";
import Btn from "@/components/ui/Btn";
import { useSessionDetail } from "@/lib/hooks";
import { downloadExport } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { formatDuration } from "@/lib/utils";

const C = { blue: "#3B82F6", cyan: "#06B6D4", purple: "#8B5CF6", green: "#10B981", amber: "#F59E0B", pink: "#F43F5E", slate: "#94A3B8", teal: "#14B8A6" };
const REPLAY_TICK_MS = 40;
const CHART_MAX_POINTS = 1500;
const FALLBACK_PACE_HZ = 130;

const ACTIVITY: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ecg: { label: "ECG", color: C.cyan, icon: Activity }, walking: { label: "Walking", color: C.green, icon: Footprints },
  running: { label: "Running", color: C.amber, icon: Footprints }, cycling: { label: "Cycling", color: C.blue, icon: Bike },
  hiking: { label: "Hiking", color: C.teal, icon: Mountain }, training: { label: "Training", color: C.purple, icon: Dumbbell },
  recovery_walk: { label: "Recovery Walk", color: C.green, icon: Footprints }, interval_run: { label: "Interval Run", color: C.pink, icon: Zap },
  other: { label: "Other", color: C.slate, icon: Circle },
};

function downsampleTo(src: number[], target: number): number[] {
  if (src.length <= target) return src;
  const step = src.length / target;
  return Array.from({ length: target }, (_, i) => src[Math.floor(i * step)]);
}
function pickN(src: number[], n: number): number[] {
  if (src.length === 0) return [];
  if (src.length <= n) return src;
  const step = src.length / n;
  return Array.from({ length: n }, (_, i) => src[Math.floor(i * step)]);
}
const fmtMMSS = (sec: number) => { if (!Number.isFinite(sec)) return "0:00"; const s = Math.max(0, Math.floor(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const fmtPace = (secPerKm: number | null) => { if (!secPerKm || secPerKm <= 0) return "—"; return `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, "0")}`; };

// ── leaflet loader (CDN, once) ───────────────────────────────────
let leafletPromise: Promise<unknown> | null = null;
function loadLeaflet(): Promise<unknown> {
  if (typeof window === "undefined") return Promise.reject();
  const w = window as unknown as { L?: unknown };
  if (w.L) return Promise.resolve(w.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.onload = () => resolve((window as unknown as { L: unknown }).L);
    js.onerror = () => reject(new Error("leaflet failed"));
    document.body.appendChild(js);
  });
  return leafletPromise;
}

type Pt = { latitude: number; longitude: number; speed?: number | null };

// Palette mirrored from the Flutter app (app_colors.dart), per theme.
const MAP_COLORS = {
  dark: { route: "#13C4B0", start: "#3EDA80", end: "#FF5C7A" },
  light: { route: "#0E9C8B", start: "#1F8A4C", end: "#C4384A" },
};

// Haversine distance in metres (to decide "moved" vs GPS jitter, like the app).
function metres(a: [number, number], b: [number, number]): number {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (b[0] - a[0]) * toR, dLng = (b[1] - a[1]) * toR;
  const la1 = a[0] * toR, la2 = b[0] * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Circular badge marker (30x30, white 2px border, centred white icon) — the app's `_marker`.
function badge(fill: string, icon: "start" | "end" | "pin"): string {
  const svg =
    icon === "start"
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.3" fill="#fff" stroke="none"/></svg>`
      : icon === "end"
        ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M6 3a1 1 0 0 1 1 1v1h9.2a.8.8 0 0 1 .64 1.28L15 9l1.84 2.72A.8.8 0 0 1 16.2 13H7v8H5V4a1 1 0 0 1 1-1z"/></svg>`
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a7 7 0 0 0-7 7c0 4.6 7 13 7 13s7-8.4 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>`;
  return `<div style="width:30px;height:30px;border-radius:50%;background:${fill};border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.35)">${svg}</div>`;
}

function SessionMap({ points, start, end }: { points: Pt[]; start?: { lat: number | null; lng: number | null } | null; end?: { lat: number | null; lng: number | null } | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [failed, setFailed] = useState(false);
  const col = MAP_COLORS[theme === "light" ? "light" : "dark"];

  // Prefer the recorded routePoints (start = first, end = last — exactly as the app).
  // Fall back to start/end location only when there aren't ≥2 route points.
  const coords = useMemo(() => {
    const pts = points.filter((p) => p.latitude != null && p.longitude != null).map((p) => [p.latitude, p.longitude] as [number, number]);
    if (pts.length) return pts;
    const s: [number, number][] = [];
    if (start?.lat != null && start?.lng != null) s.push([start.lat, start.lng]);
    if (end?.lat != null && end?.lng != null) s.push([end.lat, end.lng]);
    return s;
  }, [points, start, end]);

  useEffect(() => {
    if (!coords.length) return;
    let map: { remove: () => void; invalidateSize?: () => void } | null = null;
    let cancelled = false;
    const onResize = () => { if (map && map.invalidateSize) map.invalidateSize(); };

    loadLeaflet().then((Lraw) => {
      if (cancelled || !ref.current) return;
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const L = Lraw as any;
      map = L.map(ref.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, minZoom: 3, attribution: "© OpenStreetMap" }).addTo(map);

      // "Moved" = the route spans more than ~20 m from its first point (app's _computeMoved).
      const moved = coords.length > 1 && coords.some((c) => metres(coords[0], c) > 20);

      if (moved) {
        // White casing (7px @ 50%) underneath + teal route (5px) on top — the app's borderColor/color.
        L.polyline(coords, { color: "#ffffff", weight: 7, opacity: 0.5, lineJoin: "round", lineCap: "round" }).addTo(map);
        const line = L.polyline(coords, { color: col.route, weight: 5, opacity: 1, lineJoin: "round", lineCap: "round" }).addTo(map);
        (map as any).fitBounds(line.getBounds(), { padding: [36, 36], animate: false });
        // Smooth draw-in animation of the route.
        const el = line.getElement && line.getElement();
        if (el && typeof el.getTotalLength === "function") {
          const len = el.getTotalLength();
          el.style.transition = "none";
          el.style.strokeDasharray = `${len}`;
          el.style.strokeDashoffset = `${len}`;
          void el.getBoundingClientRect();
          requestAnimationFrame(() => { el.style.transition = "stroke-dashoffset 1.1s ease-out"; el.style.strokeDashoffset = "0"; });
        }
        L.marker(coords[0], { icon: L.divIcon({ html: badge(col.start, "start"), className: "", iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(map);
        L.marker(coords[coords.length - 1], { icon: L.divIcon({ html: badge(col.end, "end"), className: "", iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(map);
      } else {
        // Single place / jitter → centre on the one point at a fixed zoom with a teal pin.
        (map as any).setView(coords[0], 15.5);
        L.marker(coords[0], { icon: L.divIcon({ html: badge(col.route, "pin"), className: "", iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(map);
      }
      setTimeout(onResize, 250);
      window.addEventListener("resize", onResize);
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }).catch(() => setFailed(true));

    return () => { cancelled = true; window.removeEventListener("resize", onResize); if (map) map.remove(); };
  }, [coords, theme, col.route, col.start, col.end]);

  if (!coords.length) {
    // The app's empty state: rounded card, muted map icon, "No location recorded".
    return (
      <div className="flex flex-col items-center justify-center" style={{ height: 320, borderRadius: 16, background: "var(--bg-input)", border: "1px solid var(--border-clr)", color: "var(--text-muted)" }}>
        <MapPin size={30} className="mb-2 opacity-60" />
        <p className="text-[13px] m-0">No location recorded</p>
      </div>
    );
  }
  if (failed) {
    // Offline fallback: schematic route (map tiles unavailable), same colors.
    const xs = coords.map((c) => c[1]), ys = coords.map((c) => c[0]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const nx = (v: number) => 30 + ((v - minX) / (maxX - minX || 1)) * 440;
    const ny = (v: number) => 290 - ((v - minY) / (maxY - minY || 1)) * 260;
    const d = coords.map((c, i) => `${i ? "L" : "M"}${nx(c[1]).toFixed(1)},${ny(c[0]).toFixed(1)}`).join(" ");
    return (
      <svg viewBox="0 0 500 320" className="w-full" style={{ height: 320, borderRadius: 16, background: "var(--bg-input)" }}>
        {Array.from({ length: 10 }).map((_, i) => <line key={`h${i}`} x1="0" y1={i * 32} x2="500" y2={i * 32} stroke="var(--border-clr)" strokeWidth="0.6" opacity="0.5" />)}
        {Array.from({ length: 16 }).map((_, i) => <line key={`v${i}`} x1={i * 32} y1="0" x2={i * 32} y2="320" stroke="var(--border-clr)" strokeWidth="0.6" opacity="0.5" />)}
        <path d={d} fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <path d={d} fill="none" stroke={col.route} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={nx(coords[0][1])} cy={ny(coords[0][0])} r="8" fill={col.start} stroke="#fff" strokeWidth="2" />
        {coords.length > 1 && <circle cx={nx(coords[coords.length - 1][1])} cy={ny(coords[coords.length - 1][0])} r="8" fill={col.end} stroke="#fff" strokeWidth="2" />}
        <text x="16" y="306" fontSize="10" fill="var(--text-muted)">Offline — schematic route (map tiles unavailable)</text>
      </svg>
    );
  }
  return <div ref={ref} className="w-full" style={{ height: 320, borderRadius: 16, overflow: "hidden", zIndex: 0 }} />;
}

// ── time-based area chart ────────────────────────────────────────
function AreaChart({ data, color, durationSec, yMin, yMax, unit, tooltip = false, height = 170 }: {
  data: number[]; color: string; durationSec: number; yMin?: number; yMax?: number; unit?: string; tooltip?: boolean; height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560, H = 190, padL = 32, padR = 14, padT = 14, padB = 26;
  const cW = W - padL - padR, cH = H - padT - padB;
  if (data.length < 2) return <div className="flex items-center justify-center" style={{ height, color: "var(--text-muted)", fontSize: 12 }}>No data recorded</div>;
  const dMin = yMin ?? Math.min(...data), dMax = yMax ?? Math.max(...data);
  const rng = dMax - dMin || 1;
  const n = data.length;
  const xx = (i: number) => padL + (i / (n - 1)) * cW;
  const yy = (v: number) => padT + cH - ((v - dMin) / rng) * cH;
  const line = data.map((v, i) => `${i ? "L" : "M"}${xx(i).toFixed(1)},${yy(v).toFixed(1)}`).join(" ");
  const area = `${line} L${xx(n - 1)},${padT + cH} L${xx(0)},${padT + cH} Z`;
  const uid = color.replace("#", "");
  const ticks = 6;
  const atSec = (i: number) => (durationSec * i) / (n - 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      <defs><linearGradient id={`ac-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.32" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {Array.from({ length: 4 }, (_, i) => { const v = dMin + (rng / 3) * i, y = yy(v); return (<g key={i}><line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--border-clr)" strokeWidth="0.7" opacity="0.5" /><text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill="var(--text-muted)">{Math.round(v)}</text></g>); })}
      <path d={area} fill={`url(#ac-${uid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {tooltip && hover !== null && (
        <g>
          <line x1={xx(hover)} y1={padT} x2={xx(hover)} y2={padT + cH} stroke={color} strokeWidth="1" opacity="0.35" strokeDasharray="3 3" />
          <circle cx={xx(hover)} cy={yy(data[hover])} r="4.5" fill={color} stroke="#fff" strokeWidth="2" />
          {(() => { const tw = 70, th = 34; let tx = xx(hover) - tw / 2; tx = Math.max(padL, Math.min(tx, W - padR - tw)); const ty = Math.max(2, yy(data[hover]) - th - 8); return (<g><rect x={tx} y={ty} width={tw} height={th} rx="7" fill="var(--bg-elevated)" stroke="var(--border-clr)" /><text x={tx + tw / 2} y={ty + 14} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{Math.round(atSec(hover))}s</text><text x={tx + tw / 2} y={ty + 27} textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>{Math.round(data[hover])}{unit}</text></g>); })()}
        </g>
      )}
      {Array.from({ length: ticks + 1 }, (_, i) => { const x = padL + (cW / ticks) * i; return <text key={i} x={x} y={H - 7} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{Math.round((durationSec / ticks) * i)}s</text>; })}
      {tooltip && data.map((_, i) => <rect key={i} x={xx(i) - cW / n / 2} y={padT} width={cW / n} height={cH} fill="transparent" onMouseEnter={() => setHover(i)} />)}
    </svg>
  );
}

function BarsChart({ data, color, durationSec }: { data: number[]; color: string; durationSec: number }) {
  if (data.length < 1 || Math.max(...data) <= 0) return <div className="flex items-center justify-center" style={{ height: 170, color: "var(--text-muted)", fontSize: 12 }}>No activity data</div>;
  const max = Math.max(...data);
  const ticks = 6;
  return (
    <div>
      <div className="flex items-end gap-[2px]" style={{ height: 150 }}>
        {data.map((v, i) => <div key={i} className="flex-1" style={{ height: `${Math.max(2, (v / max) * 100)}%`, background: `linear-gradient(to top, ${color}, ${color}aa)`, borderRadius: "2px 2px 0 0", transformOrigin: "bottom", animation: `growBar 0.5s ${i * 0.01}s ease both` }} />)}
      </div>
      <div className="flex justify-between mt-1">{Array.from({ length: ticks + 1 }, (_, i) => <span key={i} className="text-[9px]" style={{ color: "var(--text-muted)" }}>{Math.round((durationSec / ticks) * i)}s</span>)}</div>
    </div>
  );
}

function MiniSpark({ data, color }: { data: number[]; color: string }) {
  const W = 110, H = 40;
  if (data.length < 2) return <svg width={W} height={H}><line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke={color} strokeWidth="2" opacity="0.35" /></svg>;
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * W, H - 4 - ((v - min) / rng) * (H - 8)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const uid = color.replace("#", "");
  return (<svg width={W} height={H}><defs><linearGradient id={`ms-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs><path d={`${d} L${W},${H} L0,${H} Z`} fill={`url(#ms-${uid})`} /><path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>);
}

function MetricCard({ icon: Icon, label, value, color, sub, subColor, subIcon: SubIcon, spark }: {
  icon: React.ElementType; label: string; value: string; color: string; sub: string; subColor: string; subIcon?: React.ElementType; spark: number[];
}) {
  return (
    <div className="rounded-2xl p-4 animate-rise" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2"><span className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 10, background: `${color}22` }}><Icon size={17} style={{ color }} /></span><span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{label}</span></div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-[22px] font-bold leading-none" style={{ color: "var(--text-primary)" }}>{value}</div>
          <div className="flex items-center gap-[4px] mt-[6px] text-[11px] font-semibold" style={{ color: subColor }}>{SubIcon && <SubIcon size={12} />}{sub}</div>
        </div>
        <div className="opacity-90"><MiniSpark data={spark} color={color} /></div>
      </div>
    </div>
  );
}

function trendOf(series: number[]): { pct: number; dir: "up" | "down" | "flat" } {
  const v = series.filter((x) => x > 0);
  if (v.length < 4) return { pct: 0, dir: "flat" };
  const h = Math.floor(v.length / 3);
  const first = v.slice(0, h).reduce((a, b) => a + b, 0) / h;
  const last = v.slice(-h).reduce((a, b) => a + b, 0) / h;
  const pct = first ? Math.round(((last - first) / first) * 100) : 0;
  return { pct: Math.abs(pct), dir: pct > 1 ? "up" : pct < -1 ? "down" : "flat" };
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const { data, error, isLoading, mutate } = useSessionDetail(sessionId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [windowSec, setWindowSec] = useState(5);
  const [expanded, setExpanded] = useState(false);

  const session = data as Record<string, unknown> | undefined;

  // ── ECG samples (negated polarity, like the phone) ──
  const ecg = useMemo(() => {
    const empty = { full: [] as number[], chartSamples: [] as number[], offsetsSec: [] as number[], sampleRateHz: null as number | null, leadOn: true, quality: "unknown" as EcgQuality, pqrst: null as EcgPqrst | null, totalSamples: 0 };
    if (!session) return empty;
    const block = session.ecg as { sampleRateHz?: number | null; leadOn?: boolean; quality?: EcgQuality; pqrst?: EcgPqrst | null; totalSamples?: number } | undefined;
    const readings = session.readings as { ecgValue?: number; timestamp?: string }[] | undefined;
    const ecgValues = session.ecgValues as number[] | undefined;
    const rawFull = ecgValues && ecgValues.length ? ecgValues : readings && readings.length ? readings.map((r) => r.ecgValue ?? 0) : [];
    const full = rawFull.map((v) => -v);
    const startMs = Date.parse((session.startTime as string) || "");
    const fallbackRate = block?.sampleRateHz && block.sampleRateHz > 0 ? block.sampleRateHz : 128;
    const offsetsSec = readings && readings.length === full.length && Number.isFinite(startMs)
      ? readings.map((r, i) => { const t = Date.parse(r.timestamp || ""); return Number.isFinite(t) ? Math.max(0, (t - startMs) / 1000) : i / fallbackRate; })
      : full.map((_, i) => i / fallbackRate);
    return { full, chartSamples: downsampleTo(full, CHART_MAX_POINTS), offsetsSec, sampleRateHz: block?.sampleRateHz ?? null, leadOn: block?.leadOn ?? true, quality: block?.quality ?? "unknown", pqrst: block?.pqrst ?? null, totalSamples: block?.totalSamples ?? full.length };
  }, [session]);

  const sessionDurationSec = session ? Math.max(0, (Date.parse((session.endTime as string) || "") - Date.parse((session.startTime as string) || "")) / 1000) : 0;
  const totalSamples = ecg.full.length;
  const lastOffset = totalSamples > 0 ? ecg.offsetsSec[totalSamples - 1] : 0;
  const effectiveDurationSec = Math.max(sessionDurationSec, lastOffset, 0.001);

  const chartSamples = ecg.chartSamples;
  const totalChartSamples = chartSamples.length;
  const canPlay = totalChartSamples > 1 && effectiveDurationSec > 0;
  const paceCountPerSecond = effectiveDurationSec > 0 ? totalChartSamples / effectiveDurationSec : FALLBACK_PACE_HZ;

  const [playing, setPlaying] = useState(true);
  const [revealCount, setRevealCount] = useState(0);
  const playRunRef = useRef<{ at: number; from: number } | null>(null);

  useEffect(() => { setRevealCount(0); setPlaying(true); playRunRef.current = { at: performance.now(), from: 0 }; }, [sessionId, totalChartSamples]);
  useEffect(() => {
    if (!playing || !canPlay) return;
    if (!playRunRef.current) playRunRef.current = { at: performance.now(), from: 0 };
    const id = window.setInterval(() => {
      const run = playRunRef.current; if (!run) return;
      const elapsed = (performance.now() - run.at) / 1000;
      const next = Math.max(0, Math.min(totalChartSamples, run.from + Math.round(elapsed * paceCountPerSecond)));
      setRevealCount(next);
      if (next >= totalChartSamples) setPlaying(false);
    }, REPLAY_TICK_MS);
    return () => window.clearInterval(id);
  }, [playing, canPlay, totalChartSamples, paceCountPerSecond]);

  const playbackDone = canPlay && revealCount >= totalChartSamples;
  const togglePlayback = () => { if (!canPlay) return; if (playing) { playRunRef.current = null; setPlaying(false); return; } const from = revealCount >= totalChartSamples ? 0 : revealCount; setRevealCount(from); playRunRef.current = { at: performance.now(), from }; setPlaying(true); };
  const scrubTo = (count: number) => { if (!canPlay) return; playRunRef.current = null; setPlaying(false); setRevealCount(Math.max(0, Math.min(totalChartSamples, count))); };

  const replayWindowSamples = (() => { const total = totalChartSamples; let target = effectiveDurationSec <= 0 ? (total < 400 ? total : 400) : Math.round((total / effectiveDurationSec) * windowSec); if (target > total) target = total; if (target < 2) target = total < 2 ? total : 2; return target; })();
  const showingReplay = canPlay && (playing || (revealCount > 0 && revealCount < totalChartSamples));
  const visibleSamples = (() => { if (!showingReplay) return chartSamples; const end = Math.min(Math.max(revealCount, 2), totalChartSamples); const windowSize = Math.min(Math.max(replayWindowSamples, 2), totalChartSamples); if (end >= windowSize) return chartSamples.slice(end - windowSize, end); return [...new Array<number>(windowSize - end).fill(chartSamples[0]), ...chartSamples.slice(0, end)]; })();
  const replayElapsedSec = paceCountPerSecond > 0 ? (showingReplay ? revealCount : totalChartSamples) / paceCountPerSecond : 0;

  // ── derived series ──
  const hrSeries = useMemo(() => pickN((session?.hrValues as number[] | undefined ?? []).filter((v) => v > 0), 60), [session]);
  const spo2Series = useMemo(() => pickN((session?.spo2Values as number[] | undefined ?? []).filter((v) => v > 0), 60), [session]);
  const tempSeries = useMemo(() => pickN((session?.temperatureValues as number[] | undefined ?? []).filter((v) => v > 0), 60), [session]);
  const speedSeries = useMemo(() => pickN((session?.routePoints as Pt[] | undefined ?? []).map((p) => (p.speed ?? 0) * 3.6).filter((v) => v >= 0), 40), [session]);

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-[180px] rounded-2xl animate-pulse" style={{ background: "var(--bg-surface)" }} />)}</div>;
  if (error || !session) return (<div className="text-center py-20"><AlertCircle size={48} className="mx-auto mb-4" style={{ color: C.pink }} /><p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Failed to load session</p><Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn></div>);

  const act = ACTIVITY[(session.activityType as string) || "ecg"] ?? ACTIVITY.ecg;
  const hasEnded = new Date(session.endTime as string).getTime() > new Date(session.startTime as string).getTime();
  const statusLabel = hasEnded ? "Completed" : "In Progress";
  const statusColor = hasEnded ? C.green : C.purple;
  const loc = session.location as { lat: number | null; lng: number | null; address: string | null } | null;
  const routePoints = (session.routePoints as Pt[] | undefined) ?? [];
  const distanceKm = ((session.distanceMeters as number) || 0) / 1000;
  const calories = (session.calories as number) || 0;
  const pace = session.averagePaceSecPerKm as number | null;
  const avgTemp = Number(session.avgTemp) || 0;

  const hrT = trendOf(hrSeries), spo2T = trendOf(spo2Series);
  const tempDir = (() => { const t = trendOf(tempSeries); return t.dir === "flat" ? { label: "Stable", color: C.slate, icon: Minus } : t.dir === "up" ? { label: "Rising", color: C.amber, icon: ArrowUp } : { label: "Falling", color: C.cyan, icon: ArrowDown }; })();

  const meta = [
    { icon: Calendar, main: new Date(session.startTime as string).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }), sub: new Date(session.startTime as string).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) },
    { icon: act.icon, main: act.label, sub: "Activity Type" },
    { icon: Clock, main: formatDuration(session.startTime as string, session.endTime as string), sub: "Duration" },
    { icon: Smartphone, main: session.deviceId as string, sub: "Device" },
    { icon: MapPin, main: loc?.address || (loc?.lat != null ? `${loc.lat.toFixed(3)}, ${loc.lng}` : "—"), sub: "Location" },
  ];

  const detailRows: [string, React.ReactNode][] = [
    ["Session ID", <code key="id" style={{ color: C.cyan }}>{session.id as string}</code>],
    ["User", <span key="u">{session.userName as string}</span>],
    ["Activity Type", act.label],
    ["Start Time", new Date(session.startTime as string).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })],
    ["End Time", new Date(session.endTime as string).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })],
    ["Duration", formatDuration(session.startTime as string, session.endTime as string)],
    ["Device", session.deviceId as string],
    ["Location", loc?.address || "—"],
    ["Distance", distanceKm > 0 ? `${distanceKm.toFixed(2)} km` : "—"],
    ["Calories", calories > 0 ? `${calories} kcal` : "—"],
  ];

  return (
    <div style={{ position: "relative" }}>
      {/* Breadcrumb + prev/next */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[14px]">
          <button onClick={() => router.push("/sessions")} className="flex items-center justify-center rounded-lg border-none cursor-pointer" style={{ width: 34, height: 34, background: "var(--bg-surface)", border: "1px solid var(--border-clr)", color: "var(--text-secondary)" }}><ArrowLeft size={17} /></button>
          <span onClick={() => router.push("/sessions")} className="cursor-pointer" style={{ color: "var(--text-muted)" }}>Sessions</span>
          <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>Session Details</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/sessions")} className="flex items-center gap-[6px] rounded-[10px] text-[13px] font-medium cursor-pointer" style={{ padding: "8px 13px", background: "var(--bg-surface)", border: "1px solid var(--border-clr)", color: "var(--text-secondary)" }}><ChevronLeft size={15} />Previous</button>
          <button onClick={() => router.push("/sessions")} className="flex items-center gap-[6px] rounded-[10px] text-[13px] font-medium cursor-pointer" style={{ padding: "8px 13px", background: "var(--bg-surface)", border: "1px solid var(--border-clr)", color: "var(--text-secondary)" }}>Next<ChevronRight size={15} /></button>
        </div>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 13, background: `${act.color}22` }}><act.icon size={24} style={{ color: act.color }} /></span>
          <h1 className="text-[26px] font-bold m-0" style={{ color: "var(--text-primary)" }}>{(session.name as string) || `${act.label} Session`}</h1>
          <span className="inline-flex items-center gap-[6px] rounded-full text-[12px] font-semibold" style={{ padding: "5px 12px", background: `${statusColor}1f`, color: statusColor }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor }} />{statusLabel}</span>
        </div>
        <div className="flex items-center gap-2 relative">
          <button onClick={() => setNotice("Editing session metadata isn't available on the backend yet.")} className="flex items-center gap-2 rounded-[11px] text-[13px] font-semibold cursor-pointer" style={{ padding: "9px 15px", background: "var(--bg-surface)", border: "1px solid var(--border-clr)", color: "var(--text-primary)" }}><Edit3 size={15} />Edit Session</button>
          <button onClick={() => downloadExport("sessions")} className="flex items-center gap-2 rounded-[11px] text-[13px] font-semibold text-white cursor-pointer border-none" style={{ padding: "9px 16px", background: "linear-gradient(135deg,#22D3EE,#3B82F6)" }}><Download size={15} />Download Report</button>
          <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center justify-center rounded-[11px] border-none cursor-pointer" style={{ width: 40, height: 40, background: "var(--bg-surface)", border: "1px solid var(--border-clr)", color: "var(--text-muted)" }}><MoreHorizontal size={18} /></button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 rounded-[12px] overflow-hidden z-30 py-1" style={{ width: 190, background: "var(--bg-surface)", border: "1px solid var(--border-clr)", boxShadow: "0 16px 40px rgba(0,0,0,0.28)" }}>
              <button onClick={() => { setMenuOpen(false); downloadExport("sessions"); }} className="flex items-center gap-2 w-full text-left px-3 py-[9px] text-[13px] border-none bg-transparent cursor-pointer" style={{ color: "var(--text-secondary)" }}><FileText size={15} />Export CSV</button>
              <button onClick={() => { setMenuOpen(false); router.push(`/reports/ecg-rr/${session.userId}/${session.id}`); }} className="flex items-center gap-2 w-full text-left px-3 py-[9px] text-[13px] border-none bg-transparent cursor-pointer" style={{ color: "var(--text-secondary)" }}><Activity size={15} />Clinical reports</button>
            </div>
          )}
        </div>
      </div>

      {notice && (<div className="flex items-center justify-between gap-2 rounded-[12px] px-4 py-3 mb-4 text-[13px]" style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)", color: "var(--text-secondary)" }}><span>{notice}</span><button onClick={() => setNotice("")} className="bg-transparent border-none cursor-pointer" style={{ color: "var(--text-muted)" }}><X size={15} /></button></div>)}

      {/* Meta strip */}
      <div className="rounded-2xl p-4 mb-5 flex items-center gap-5 flex-wrap" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
        <div className="flex items-center gap-[10px]">
          <span className="flex items-center justify-center text-[13px] font-bold text-white" style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg,#22D3EE,#8B5CF6)" }}>{(session.userName as string || "–").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</span>
          <div><div className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>{session.userName as string}</div><div className="text-[12px]" style={{ color: "var(--text-muted)" }}>{session.userEmail as string}</div></div>
        </div>
        {meta.map((m, i) => (
          <div key={i} className="flex items-center gap-[10px]" style={{ borderLeft: "1px solid var(--border-clr)", paddingLeft: 20 }}>
            <m.icon size={18} style={{ color: C.cyan }} />
            <div><div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{m.main}</div><div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{m.sub}</div></div>
          </div>
        ))}
      </div>

      {/* 6 metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <MetricCard icon={Heart} label="Avg. Heart Rate" value={`${session.avgHR} bpm`} color={C.pink} spark={hrSeries} sub={hrT.dir === "flat" ? "Stable" : `${hrT.pct}% ${hrT.dir === "up" ? "higher" : "lower"}`} subColor={hrT.dir === "up" ? C.pink : hrT.dir === "down" ? C.green : C.slate} subIcon={hrT.dir === "up" ? ArrowUp : hrT.dir === "down" ? ArrowDown : Minus} />
        <MetricCard icon={Droplets} label="Avg. SpO₂" value={`${session.avgSpo2}%`} color={C.blue} spark={spo2Series} sub={spo2T.dir === "flat" ? "Stable" : `${spo2T.pct}% ${spo2T.dir === "up" ? "higher" : "lower"}`} subColor={spo2T.dir === "up" ? C.green : spo2T.dir === "down" ? C.amber : C.slate} subIcon={spo2T.dir === "up" ? ArrowUp : spo2T.dir === "down" ? ArrowDown : Minus} />
        <MetricCard icon={Thermometer} label="Avg. Temperature" value={`${avgTemp.toFixed(1)}°C`} color={C.purple} spark={tempSeries} sub={tempDir.label} subColor={tempDir.color} subIcon={tempDir.icon} />
        <MetricCard icon={Flame} label="Calories Burned" value={calories > 0 ? `${calories} kcal` : "—"} color={C.amber} spark={calories > 0 ? [0, calories * 0.3, calories * 0.6, calories] : []} sub={calories > 0 ? "Workout" : "—"} subColor="var(--text-muted)" />
        <MetricCard icon={MapPin} label="Distance" value={distanceKm > 0 ? `${distanceKm.toFixed(2)} km` : "—"} color={C.teal} spark={distanceKm > 0 ? [0, distanceKm * 0.4, distanceKm * 0.7, distanceKm] : []} sub="—" subColor="var(--text-muted)" />
        <MetricCard icon={Gauge} label="Avg. Pace" value={pace ? `${fmtPace(pace)} /km` : "—"} color={C.green} spark={speedSeries} sub="—" subColor="var(--text-muted)" />
      </div>

      {/* ECG + HR */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-[10px]"><span className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(244,63,94,0.18)" }}><Heart size={18} style={{ color: C.pink }} /></span><div><h3 className="text-[15px] font-semibold m-0" style={{ color: "var(--text-primary)" }}>ECG Waveform</h3><p className="text-[12px] m-0" style={{ color: "var(--text-muted)" }}>Real-time ECG signal recorded during the session</p></div></div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-[9px] overflow-hidden" style={{ border: "1px solid var(--border-clr)" }}>{[1, 5, 10].map((w) => <button key={w} onClick={() => setWindowSec(w)} className="text-[12px] font-semibold cursor-pointer border-none" style={{ padding: "6px 11px", background: windowSec === w ? "linear-gradient(135deg,#22D3EE,#3B82F6)" : "var(--bg-input)", color: windowSec === w ? "#fff" : "var(--text-muted)" }}>{w}s</button>)}</div>
              <button onClick={() => setExpanded((e) => !e)} className="flex items-center justify-center rounded-[9px] border-none cursor-pointer" style={{ width: 34, height: 34, background: "var(--bg-input)", color: "var(--text-muted)" }}><Maximize2 size={15} /></button>
            </div>
          </div>
          <EcgMonitorChart samples={visibleSamples} sampleRateHz={ecg.sampleRateHz} pqrst={null} leadOn={ecg.leadOn} quality={ecg.quality} height={expanded ? 320 : 210} />
          {canPlay && (
            <>
              <div className="flex items-center gap-3 mt-3">
                <Btn variant="ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={togglePlayback}>{playing ? <Pause size={12} /> : <Play size={12} />}{playing ? "Pause" : playbackDone ? "Replay" : "Play"}</Btn>
                <input type="range" min={0} max={totalChartSamples} value={showingReplay ? revealCount : totalChartSamples} onChange={(e) => scrubTo(Number(e.target.value))} className="flex-1 cursor-pointer" style={{ accentColor: C.cyan, height: 4 }} />
                <span className="text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>{fmtMMSS(replayElapsedSec)} / {fmtMMSS(effectiveDurationSec)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between mt-2 text-[11px]"><span style={{ color: "var(--text-muted)" }}>{ecg.totalSamples.toLocaleString()} samples</span><span style={{ color: C.cyan, fontWeight: 600 }}>Wellness monitoring — Not for clinical diagnosis</span></div>
        </div>

        <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-[10px]"><span className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(244,63,94,0.18)" }}><Heart size={18} style={{ color: C.pink }} /></span><div><h3 className="text-[15px] font-semibold m-0" style={{ color: "var(--text-primary)" }}>Heart Rate</h3><p className="text-[12px] m-0" style={{ color: "var(--text-muted)" }}>Heart rate throughout the session</p></div></div>
            <div className="flex items-center gap-5 text-right"><div><div className="text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>Avg</div><div className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>{session.avgHR as number} bpm</div></div><div><div className="text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>Max</div><div className="text-[15px] font-bold" style={{ color: C.pink }}>{session.maxHR as number} bpm</div></div></div>
          </div>
          <AreaChart data={hrSeries} color={C.pink} durationSec={effectiveDurationSec} unit=" bpm" tooltip height={210} />
        </div>
      </div>

      {/* SpO2 + Temp + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-[10px]"><span className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(59,130,246,0.18)" }}><Droplets size={17} style={{ color: C.blue }} /></span><div><h3 className="text-[14px] font-semibold m-0" style={{ color: "var(--text-primary)" }}>SpO₂</h3><p className="text-[11px] m-0" style={{ color: "var(--text-muted)" }}>Blood oxygen saturation levels</p></div></div>
            <div className="flex gap-4 text-right"><div><div className="text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>Avg</div><div className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>{session.avgSpo2 as number}%</div></div><div><div className="text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>Min</div><div className="text-[14px] font-bold" style={{ color: C.blue }}>{session.minSpo2 as number}%</div></div></div>
          </div>
          <AreaChart data={spo2Series} color={C.blue} durationSec={effectiveDurationSec} yMin={Math.max(80, Math.min(...(spo2Series.length ? spo2Series : [95])) - 4)} yMax={100} height={150} />
        </div>
        <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-[10px]"><span className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(245,158,11,0.18)" }}><Thermometer size={17} style={{ color: C.amber }} /></span><div><h3 className="text-[14px] font-semibold m-0" style={{ color: "var(--text-primary)" }}>Skin Temperature</h3><p className="text-[11px] m-0" style={{ color: "var(--text-muted)" }}>Skin surface temperature (°C)</p></div></div>
            <div className="flex gap-4 text-right"><div><div className="text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>Avg</div><div className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>{avgTemp.toFixed(1)}°C</div></div><div><div className="text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>Min</div><div className="text-[14px] font-bold" style={{ color: C.amber }}>{tempSeries.length ? Math.min(...tempSeries).toFixed(1) : "—"}°C</div></div></div>
          </div>
          <AreaChart data={tempSeries} color={C.amber} durationSec={effectiveDurationSec} height={150} />
        </div>
        <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-[10px]"><span className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(16,185,129,0.18)" }}><Activity size={17} style={{ color: C.green }} /></span><div><h3 className="text-[14px] font-semibold m-0" style={{ color: "var(--text-primary)" }}>Activity</h3><p className="text-[11px] m-0" style={{ color: "var(--text-muted)" }}>Pace and movement intensity</p></div></div>
            <div className="flex gap-4 text-right"><div><div className="text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>Avg Pace</div><div className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>{pace ? `${fmtPace(pace)}/km` : "—"}</div></div><div><div className="text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>Steps</div><div className="text-[14px] font-bold" style={{ color: C.green }}>—</div></div></div>
          </div>
          <BarsChart data={speedSeries.length ? speedSeries : pickN(hrSeries, 40)} color={C.purple} durationSec={effectiveDurationSec} />
        </div>
      </div>

      {/* Map + details */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <div className="flex items-center gap-[10px]"><span className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(6,182,212,0.18)" }}><MapPin size={18} style={{ color: C.cyan }} /></span><div><h3 className="text-[15px] font-semibold m-0" style={{ color: "var(--text-primary)" }}>Session Map</h3><p className="text-[12px] m-0" style={{ color: "var(--text-muted)" }}>Route tracked during the session</p></div></div>
            <div className="flex items-center gap-4"><span className="flex items-center gap-[6px] text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}><Clock size={14} style={{ color: C.cyan }} />{distanceKm > 0 ? `${distanceKm.toFixed(2)} km` : "—"}</span><span className="flex items-center gap-[6px] text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}><MapPin size={14} style={{ color: C.amber }} />{formatDuration(session.startTime as string, session.endTime as string)}</span></div>
          </div>
          <SessionMap points={routePoints} start={loc} end={session.endLocation as { lat: number | null; lng: number | null } | null} />
        </div>

        <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-[10px]"><span className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(139,92,246,0.18)" }}><FileText size={18} style={{ color: C.purple }} /></span><div><h3 className="text-[15px] font-semibold m-0" style={{ color: "var(--text-primary)" }}>Session Details</h3><p className="text-[12px] m-0" style={{ color: "var(--text-muted)" }}>Complete information about this session</p></div></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            {detailRows.map(([k, v], i) => (
              <div key={i} className="flex items-center justify-between py-[9px] text-[13px]" style={{ borderBottom: "1px solid var(--border-clr)" }}>
                <span style={{ color: "var(--text-muted)" }}>{k}</span>
                <span className="font-medium text-right" style={{ color: "var(--text-primary)" }}>{v}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-[9px] text-[13px] sm:col-span-2">
              <span style={{ color: "var(--text-muted)" }}>Status</span>
              <span className="inline-flex items-center gap-[6px] rounded-full text-[12px] font-semibold" style={{ padding: "4px 11px", background: `${statusColor}1f`, color: statusColor }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor }} />{statusLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
