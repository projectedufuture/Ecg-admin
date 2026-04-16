"use client";

import { useState, useMemo } from "react";
import { Users, FileText, Radio, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import MetricCard from "@/components/ui/MetricCard";
import { useDashboard } from "@/lib/hooks";
import Btn from "@/components/ui/Btn";

// ── Utility ──────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function niceMax(val: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(val)));
  const norm = val / mag;
  if (norm <= 1.5) return Math.ceil(norm * 10) / 10 * mag;
  if (norm <= 3) return Math.ceil(norm) * mag;
  if (norm <= 7) return Math.ceil(norm) * mag;
  return 10 * mag;
}

// ── Professional chart ───────────────────────────────────────────
function ChartCard({
  data, color, title, icon: Icon,
}: {
  data: number[];
  color: string;
  title: string;
  icon: React.ElementType;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const stats = useMemo(() => {
    const total = data.reduce((a, b) => a + b, 0);
    const avg = Math.round(total / data.length);
    const max = Math.max(...data);
    const min = Math.min(...data);
    const peakIdx = data.indexOf(max);
    const lastTwo = data.slice(-2);
    const mTrend = lastTwo.length === 2 ? Math.round(((lastTwo[1] - lastTwo[0]) / (lastTwo[0] || 1)) * 100) : 0;
    return { total, avg, max, min, peakIdx, mTrend };
  }, [data]);

  // Chart dimensions
  const W = 560, H = 240;
  const padL = 44, padR = 20, padT = 20, padB = 36;
  const cW = W - padL - padR;
  const cH = H - padT - padB;

  const yMax = niceMax(stats.max);
  const gridSteps = 5;

  const pts = data.map((v, i) => ({
    x: padL + (i / (data.length - 1)) * cW,
    y: padT + cH - (v / yMax) * cH,
    v,
  }));

  // Catmull-Rom → Bezier smooth path
  function smooth(points: { x: number; y: number }[]): string {
    if (points.length < 2) return "";
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];
      const t = 0.32;
      d += ` C ${p1.x + (p2.x - p0.x) * t},${p1.y + (p2.y - p0.y) * t} ${p2.x - (p3.x - p1.x) * t},${p2.y - (p3.y - p1.y) * t} ${p2.x},${p2.y}`;
    }
    return d;
  }

  const linePath = smooth(pts);
  const areaPath = `${linePath} L ${pts[pts.length - 1].x},${padT + cH} L ${pts[0].x},${padT + cH} Z`;

  const uid = title.replace(/\s/g, "");

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between"
        style={{ padding: "18px 24px 12px" }}
      >
        <div className="flex items-center gap-[10px]">
          <div
            className="flex items-center justify-center"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${color}18`,
            }}
          >
            <Icon size={17} style={{ color }} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold m-0" style={{ color: "var(--text-primary)" }}>
              {title}
            </h3>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Monthly overview</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-bold leading-none" style={{ color: "var(--text-primary)" }}>
            {stats.total.toLocaleString()}
          </div>
          <div
            className="text-[11px] font-semibold flex items-center justify-end gap-[2px] mt-[2px]"
            style={{ color: stats.mTrend >= 0 ? "#10B981" : "#EF4444" }}
          >
            {stats.mTrend >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
            {Math.abs(stats.mTrend)}% vs prev month
          </div>
        </div>
      </div>

      {/* ── SVG ────────────────────────────────────────────── */}
      <div style={{ padding: "0 24px" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 220, display: "block" }}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            {/* Area gradient */}
            <linearGradient id={`areaG-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="50%" stopColor={color} stopOpacity="0.08" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            {/* Line gradient */}
            <linearGradient id={`lineG-${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity="0.5" />
              <stop offset="30%" stopColor={color} stopOpacity="1" />
              <stop offset="70%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.5" />
            </linearGradient>
            {/* Glow */}
            <filter id={`glow-${uid}`}>
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Dot glow */}
            <radialGradient id={`dotGlow-${uid}`}>
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Horizontal grid */}
          {Array.from({ length: gridSteps + 1 }, (_, i) => {
            const val = (yMax / gridSteps) * i;
            const y = padT + cH - (val / yMax) * cH;
            return (
              <g key={i}>
                <line
                  x1={padL} y1={y} x2={W - padR} y2={y}
                  stroke="var(--border-clr)"
                  strokeWidth="0.8"
                  opacity={i === 0 ? 0.6 : 0.35}
                />
                <text x={padL - 8} y={y + 3.5} textAnchor="end" fontSize="10" fontWeight="500" fill="var(--text-muted)">
                  {Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill={`url(#areaG-${uid})`} />

          {/* Glow line (behind) */}
          <path
            d={linePath} fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round" strokeLinejoin="round" opacity="0.15"
          />

          {/* Main line */}
          <path
            d={linePath} fill="none" stroke={`url(#lineG-${uid})`}
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          />

          {/* Hover crosshair + tooltip */}
          {hover !== null && (() => {
            const p = pts[hover];
            const tipW = 76, tipH = 44;
            let tx = p.x - tipW / 2;
            if (tx < padL) tx = padL;
            if (tx + tipW > W - padR) tx = W - padR - tipW;
            const ty = Math.max(4, p.y - tipH - 14);
            return (
              <g>
                {/* Vertical line */}
                <line x1={p.x} y1={padT} x2={p.x} y2={padT + cH} stroke={color} strokeWidth="1" opacity="0.25" />
                {/* Horizontal line */}
                <line x1={padL} y1={p.y} x2={W - padR} y2={p.y} stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.2" />
                {/* Glow circle */}
                <circle cx={p.x} cy={p.y} r="16" fill={`url(#dotGlow-${uid})`} />
                {/* Tooltip card */}
                <rect x={tx} y={ty} width={tipW} height={tipH} rx="8" fill="var(--bg-elevated)" stroke="var(--border-clr)" strokeWidth="1" />
                <text x={tx + tipW / 2} y={ty + 16} textAnchor="middle" fontSize="10" fontWeight="500" fill="var(--text-muted)">
                  {MONTHS[hover]} 2025
                </text>
                <text x={tx + tipW / 2} y={ty + 33} textAnchor="middle" fontSize="15" fontWeight="700" fill={color}>
                  {p.v}
                </text>
              </g>
            );
          })()}

          {/* Data points */}
          {pts.map((p, i) => (
            <g key={i}>
              <rect
                x={p.x - cW / data.length / 2} y={padT} width={cW / data.length} height={cH + padB}
                fill="transparent" onMouseEnter={() => setHover(i)}
              />
              {/* Outer ring on hover */}
              {hover === i && (
                <circle cx={p.x} cy={p.y} r="7" fill="none" stroke={color} strokeWidth="2" opacity="0.3" />
              )}
              {/* Dot */}
              <circle
                cx={p.x} cy={p.y}
                r={hover === i ? 4.5 : i === stats.peakIdx ? 3.5 : 0}
                fill={hover === i ? color : i === stats.peakIdx ? color : "transparent"}
                stroke={hover === i || i === stats.peakIdx ? "#fff" : "transparent"}
                strokeWidth="2"
                style={{ transition: "all 0.15s ease" }}
              />
            </g>
          ))}

          {/* X-axis labels */}
          {pts.map((p, i) => (
            <text
              key={i} x={p.x} y={H - 8}
              textAnchor="middle" fontSize="10" fontWeight={hover === i ? 600 : 400}
              fill={hover === i ? color : "var(--text-muted)"}
              style={{ transition: "fill 0.15s" }}
            >
              {MONTHS[i]}
            </text>
          ))}
        </svg>
      </div>

      {/* ── Bottom stats row ──────────────────────────────── */}
      <div
        className="grid grid-cols-4"
        style={{ borderTop: "1px solid var(--border-clr)" }}
      >
        {[
          { label: "Lowest", value: stats.min, sub: MONTHS[data.indexOf(stats.min)] },
          { label: "Average", value: stats.avg, sub: "per month" },
          { label: "Highest", value: stats.max, sub: MONTHS[stats.peakIdx] },
          { label: "Current", value: data[data.length - 1], sub: MONTHS[data.length - 1] },
        ].map((s, i) => (
          <div
            key={i}
            className="text-center"
            style={{
              padding: "14px 0",
              borderRight: i < 3 ? "1px solid var(--border-clr)" : "none",
            }}
          >
            <div className="text-[10px] uppercase font-semibold tracking-wide" style={{ color: "var(--text-muted)", letterSpacing: 0.6 }}>
              {s.label}
            </div>
            <div className="text-[17px] font-bold mt-[2px]" style={{ color: "var(--text-primary)" }}>
              {s.value}
            </div>
            <div className="text-[10px] mt-[1px]" style={{ color: "var(--text-muted)" }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data, error, isLoading, mutate } = useDashboard();

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-7">
          <div><h1 className="text-2xl font-bold m-0" style={{ color: "var(--text-primary)" }}>Dashboard</h1></div>
        </div>
        <div className="grid grid-cols-4 gap-[14px] mb-6">
          {[1,2,3,4].map(i => <div key={i} className="h-[130px] rounded-2xl animate-pulse" style={{ background: "var(--bg-surface)" }} />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="h-[340px] rounded-2xl animate-pulse" style={{ background: "var(--bg-surface)" }} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto mb-4" style={{ color: "#EF4444" }} />
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Failed to load dashboard data</p>
        <Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn>
      </div>
    );
  }

  const d = data as Record<string, unknown> | undefined;
  const totalUsers = (d?.totalUsers as number) ?? 0;
  const totalSessions = (d?.totalSessions as number) ?? 0;
  const activeDevices = (d?.activeDevices as number) ?? 0;
  const activeLicenses = (d?.activeLicenses as number) ?? 0;
  const trends = (d?.trends as Record<string, number>) ?? {};
  const regData = [12, 18, 8, 22, 15, 28, 34, 19, 25, 31, 20, 27];
  const sessData = [45, 62, 38, 71, 55, 80, 92, 67, 78, 95, 60, 85];

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold m-0" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>Platform overview and system health</p>
        </div>
        <div className="flex items-center gap-2 px-[14px] py-[6px] rounded-full text-[13px] font-semibold" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>
          <CheckCircle2 size={14} />All Systems Operational
        </div>
      </div>

      <div className="grid grid-cols-4 gap-[14px] mb-6">
        <MetricCard icon={Users} label="Total Users" value={totalUsers} sub="vs last month" trend={trends.usersTrend ?? 0} color="#06B6D4" />
        <MetricCard icon={FileText} label="Sessions" value={totalSessions} sub="vs last month" trend={trends.sessionsTrend ?? 0} color="#10B981" />
        <MetricCard icon={Radio} label="Active Devices" value={activeDevices} color="#8B5CF6" />
        <MetricCard icon={ShieldCheck} label="Active Licenses" value={activeLicenses} color="#F59E0B" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ChartCard data={regData} color="#06B6D4" title="User Registrations" icon={TrendingUp} />
        <ChartCard data={sessData} color="#10B981" title="Sessions Recorded" icon={FileText} />
      </div>
    </div>
  );
}
