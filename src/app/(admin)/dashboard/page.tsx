"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Smartphone, Activity, Heart, Download, ArrowUp, ArrowDown,
  Clock, Server, BarChart3, Footprints, Bike, Dumbbell, Mountain, Zap, Circle,
  AlertCircle, RefreshCw, ChevronDown, ArrowUpRight,
} from "lucide-react";
import { useDashboard, useSessions, useDevices } from "@/lib/hooks";
import { downloadExport } from "@/lib/api";
import { formatDuration, formatRelativeTime, getInitials } from "@/lib/utils";
import Btn from "@/components/ui/Btn";
import { Session, Device } from "@/types";

// ── palette ──────────────────────────────────────────────────────
const C = {
  cyan: "#06B6D4", blue: "#3B82F6", purple: "#8B5CF6", green: "#10B981",
  amber: "#F59E0B", pink: "#F43F5E", slate: "#94A3B8",
};

// ── small helpers ────────────────────────────────────────────────
function Sparkbars({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 44 }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            width: 5,
            height: `${Math.max(8, (v / max) * 100)}%`,
            borderRadius: 2,
            background: color,
            opacity: 0.35 + 0.65 * (v / max),
          }}
        />
      ))}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 120, H = 44;
  if (data.length < 2) return <div style={{ width: W, height: H }} />;
  const max = Math.max(...data), min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - 4 - ((v - min) / rng) * (H - 8),
  ]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const uid = color.replace("#", "");
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sk-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${W},${H} L0,${H} Z`} fill={`url(#sk-${uid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── stat card ────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, unit, trend, trendLabel, color, spark,
}: {
  icon: React.ElementType; label: string; value: string; unit?: string;
  trend?: number | null; trendLabel?: string; color: string;
  spark: { type: "bar" | "line"; data: number[] };
}) {
  const up = (trend ?? 0) >= 0;
  return (
    <div
      className="rounded-2xl p-5 flex flex-col"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}
    >
      <div className="flex items-start justify-between">
        <div
          className="flex items-center justify-center"
          style={{ width: 46, height: 46, borderRadius: 13, background: `${color}22` }}
        >
          <Icon size={22} style={{ color }} />
        </div>
        <div className="opacity-90">
          {spark.type === "bar"
            ? <Sparkbars data={spark.data} color={color} />
            : <Sparkline data={spark.data} color={color} />}
        </div>
      </div>
      <div className="text-[13px] mt-4" style={{ color: "var(--text-secondary)" }}>{label}</div>
      <div className="flex items-end gap-1 mt-[2px]">
        <span className="text-[30px] font-bold leading-none" style={{ color: "var(--text-primary)", letterSpacing: -0.5 }}>
          {value}
        </span>
        {unit && <span className="text-[14px] font-medium mb-[2px]" style={{ color: "var(--text-muted)" }}>{unit}</span>}
      </div>
      {trend != null && (
        <div className="flex items-center gap-[5px] mt-2 text-[12px] font-semibold" style={{ color: up ? C.green : C.pink }}>
          {up ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
          {Math.abs(trend)}%
          <span className="font-normal" style={{ color: "var(--text-muted)" }}>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

// ── card shell ───────────────────────────────────────────────────
function Card({ title, icon: Icon, iconColor, action, children, className = "" }: {
  title: string; icon: React.ElementType; iconColor: string;
  action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-2xl ${className}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
      <div className="flex items-center justify-between" style={{ padding: "18px 22px 10px" }}>
        <div className="flex items-center gap-[10px]">
          <Icon size={19} style={{ color: iconColor }} />
          <h3 className="text-[16px] font-semibold m-0" style={{ color: "var(--text-primary)" }}>{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-[6px] rounded-[9px] text-[12px] font-medium"
      style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)", padding: "6px 11px", color: "var(--text-secondary)" }}
    >
      {children}<ChevronDown size={13} style={{ color: "var(--text-muted)" }} />
    </div>
  );
}

function ViewAll() {
  return <span className="text-[13px] font-semibold flex items-center gap-[2px] cursor-pointer" style={{ color: C.cyan }}>View All <ArrowUpRight size={14} /></span>;
}

// ── dual-line chart (heart rate) ─────────────────────────────────
function DualLineChart({ labels, avg, max }: { labels: string[]; avg: number[]; max: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560, H = 230, padL = 34, padR = 16, padT = 16, padB = 28;
  const cW = W - padL - padR, cH = H - padT - padB;
  const allVals = [...avg, ...max].filter((v) => v > 0);
  const yMax = Math.max(10, Math.ceil(Math.max(...allVals, 10) / 30) * 30);
  const n = labels.length;
  const xx = (i: number) => padL + (n <= 1 ? cW / 2 : (i / (n - 1)) * cW);
  const yy = (v: number) => padT + cH - (v / yMax) * cH;
  const line = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${xx(i).toFixed(1)},${yy(v).toFixed(1)}`).join(" ");
  const area = (arr: number[]) => `${line(arr)} L${xx(n - 1)},${padT + cH} L${xx(0)},${padT + cH} Z`;

  return (
    <div style={{ padding: "4px 18px 16px" }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 250 }} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="hrAvg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.cyan} stopOpacity="0.30" />
            <stop offset="100%" stopColor={C.cyan} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hrLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={C.cyan} /><stop offset="100%" stopColor={C.purple} />
          </linearGradient>
        </defs>
        {Array.from({ length: 4 }, (_, i) => {
          const v = (yMax / 3) * i, y = yy(v);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--border-clr)" strokeWidth="0.8" opacity={0.5} />
              <text x={padL - 7} y={y + 3.5} textAnchor="end" fontSize="10" fill="var(--text-muted)">{Math.round(v)}</text>
            </g>
          );
        })}
        <path d={area(avg)} fill="url(#hrAvg)" />
        <path d={line(max)} fill="none" stroke={C.purple} strokeWidth="2" strokeDasharray="5 4" opacity={0.85} strokeLinecap="round" />
        <path d={line(avg)} fill="none" stroke="url(#hrLine)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        {hover !== null && (
          <g>
            <line x1={xx(hover)} y1={padT} x2={xx(hover)} y2={padT + cH} stroke={C.cyan} strokeWidth="1" opacity={0.3} />
            <circle cx={xx(hover)} cy={yy(avg[hover])} r="4.5" fill={C.cyan} stroke="#fff" strokeWidth="2" />
            <circle cx={xx(hover)} cy={yy(max[hover])} r="4" fill={C.purple} stroke="#fff" strokeWidth="2" />
            {(() => {
              const tw = 96, th = 46; let tx = xx(hover) - tw / 2;
              tx = Math.max(padL, Math.min(tx, W - padR - tw));
              const ty = Math.max(2, yy(Math.max(avg[hover], max[hover])) - th - 10);
              return (
                <g>
                  <rect x={tx} y={ty} width={tw} height={th} rx="8" fill="var(--bg-elevated)" stroke="var(--border-clr)" />
                  <text x={tx + 10} y={ty + 16} fontSize="10" fill="var(--text-muted)">{labels[hover]}</text>
                  <text x={tx + 10} y={ty + 31} fontSize="12" fontWeight="700" fill={C.cyan}>{max[hover]} bpm max</text>
                  <text x={tx + 10} y={ty + 42} fontSize="10" fill="var(--text-secondary)">{avg[hover]} bpm avg</text>
                </g>
              );
            })()}
          </g>
        )}
        {labels.map((l, i) => (
          <g key={i}>
            <rect x={xx(i) - cW / Math.max(n, 1) / 2} y={padT} width={cW / Math.max(n, 1)} height={cH} fill="transparent" onMouseEnter={() => setHover(i)} />
            {(n <= 8 || i % 2 === 0) && <text x={xx(i)} y={H - 8} textAnchor="middle" fontSize="9.5" fill="var(--text-muted)">{l}</text>}
          </g>
        ))}
      </svg>
      <div className="flex items-center gap-5 justify-center mt-1">
        <span className="flex items-center gap-[6px] text-[12px]" style={{ color: "var(--text-secondary)" }}><span style={{ width: 11, height: 3, borderRadius: 2, background: C.cyan }} />Avg Heart Rate</span>
        <span className="flex items-center gap-[6px] text-[12px]" style={{ color: "var(--text-secondary)" }}><span style={{ width: 11, height: 3, borderRadius: 2, background: C.purple }} />Max Heart Rate</span>
      </div>
    </div>
  );
}

// ── donut ────────────────────────────────────────────────────────
function Donut({ segments, centerValue, centerLabel }: {
  segments: { label: string; value: number; color: string }[]; centerValue: string; centerLabel: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const R = 70, r = 46, cx = 90, cy = 90;
  let acc = -90;
  const arc = (val: number) => {
    const frac = val / total, a0 = acc, a1 = acc + frac * 360; acc = a1;
    const p = (ang: number, rad: number) => [cx + rad * Math.cos((ang * Math.PI) / 180), cy + rad * Math.sin((ang * Math.PI) / 180)];
    const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R), [x2, y2] = p(a1, r), [x3, y3] = p(a0, r);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 ${large} 0 ${x3},${y3} Z`;
  };
  return (
    <div className="flex items-center gap-5" style={{ padding: "6px 22px 20px" }}>
      <svg width="180" height="180" viewBox="0 0 180 180" className="shrink-0">
        {segments.map((s, i) => <path key={i} d={arc(s.value)} fill={s.color} />)}
        <text x="90" y="86" textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--text-primary)">{centerValue}</text>
        <text x="90" y="104" textAnchor="middle" fontSize="11" fill="var(--text-muted)">{centerLabel}</text>
      </svg>
      <div className="flex-1 flex flex-col gap-[10px]">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color }} />{s.label}
            </span>
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── grouped bar chart (user growth) ──────────────────────────────
function GroupedBars({ labels, a, b, aColor, bColor }: {
  labels: string[]; a: number[]; b: number[]; aColor: string; bColor: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...a, ...b);
  const steps = 3;
  return (
    <div style={{ padding: "6px 22px 18px" }}>
      <div className="flex" style={{ height: 210 }}>
        <div className="flex flex-col justify-between pr-2 text-right" style={{ width: 34 }}>
          {Array.from({ length: steps + 1 }, (_, i) => (
            <span key={i} className="text-[10px]" style={{ color: "var(--text-muted)" }}>{Math.round((max / steps) * (steps - i))}</span>
          ))}
        </div>
        <div className="flex-1 flex items-end justify-between gap-2 relative" style={{ borderLeft: "1px solid var(--border-clr)", borderBottom: "1px solid var(--border-clr)" }}>
          {labels.map((l, i) => (
            <div key={i} className="flex-1 flex items-end justify-center gap-[3px] h-full relative" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <div style={{ width: "32%", maxWidth: 14, height: `${(a[i] / max) * 100}%`, background: aColor, borderRadius: "3px 3px 0 0", minHeight: a[i] ? 3 : 0 }} />
              <div style={{ width: "32%", maxWidth: 14, height: `${(b[i] / max) * 100}%`, background: bColor, borderRadius: "3px 3px 0 0", minHeight: b[i] ? 3 : 0 }} />
              {hover === i && (
                <div className="absolute z-10 rounded-[8px] px-2 py-1 text-[11px] whitespace-nowrap"
                  style={{ bottom: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)", background: "var(--bg-elevated)", border: "1px solid var(--border-clr)", color: "var(--text-primary)" }}>
                  <div style={{ color: aColor }}>{a[i]} new users</div>
                  <div style={{ color: bColor }}>{b[i]} sessions</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex" style={{ paddingLeft: 34 }}>
        <div className="flex-1 flex justify-between gap-2">
          {labels.map((l, i) => <span key={i} className="flex-1 text-center text-[10px]" style={{ color: "var(--text-muted)" }}>{l}</span>)}
        </div>
      </div>
    </div>
  );
}

// ── status badge (online/offline/source) ─────────────────────────
function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-[5px] rounded-full text-[11px] font-semibold capitalize"
      style={{ padding: "3px 10px", background: `${color}1f`, color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />{text}
    </span>
  );
}

// normalise dataSource: an ended "live" session is really stored
function sourceOf(s: Session): "live" | "stored" | "mixed" {
  const ended = new Date(s.endTime).getTime() > new Date(s.startTime).getTime();
  return ended && s.dataSource === "live" ? "stored" : s.dataSource;
}
const SRC_META: Record<string, { label: string; color: string }> = {
  live: { label: "Live", color: C.green },
  stored: { label: "Stored", color: C.purple },
  mixed: { label: "Mixed", color: C.cyan },
};

// Real activity types (from session.activityType) → label, color, icon.
const ACT_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  running: { label: "Running", color: C.green, icon: Footprints },
  walking: { label: "Walking", color: C.cyan, icon: Footprints },
  cycling: { label: "Cycling", color: C.purple, icon: Bike },
  training: { label: "Strength", color: C.amber, icon: Dumbbell },
  hiking: { label: "Hiking", color: C.blue, icon: Mountain },
  recovery_walk: { label: "Recovery Walk", color: C.green, icon: Footprints },
  interval_run: { label: "Interval Run", color: C.pink, icon: Zap },
  ecg: { label: "ECG", color: C.blue, icon: Activity },
  other: { label: "Other", color: C.slate, icon: Circle },
};
const actMeta = (k: string) => ACT_META[k] ?? ACT_META.other;

// ── page ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useDashboard();
  const { data: sessData } = useSessions({ limit: 100, sort: "startTime", order: "desc" });
  const { data: devData } = useDevices({ limit: 100, sort: "lastSeen", order: "desc" });

  const d = data as Record<string, unknown> | undefined;
  const sessions = (sessData?.items as unknown as Session[]) ?? [];
  const devices = (devData?.items as unknown as Device[]) ?? [];

  const derived = useMemo(() => {
    const charts = (d?.charts as { labels?: string[]; usersMonthly?: number[]; sessionsMonthly?: number[] }) ?? {};
    const labels = charts.labels?.length ? charts.labels : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const usersMonthly = charts.usersMonthly?.length ? charts.usersMonthly : new Array(12).fill(0);
    const sessionsMonthly = charts.sessionsMonthly?.length ? charts.sessionsMonthly : new Array(12).fill(0);

    const withHR = sessions.filter((s) => s.avgHR > 0);
    const avgHR = withHR.length ? Math.round(withHR.reduce((a, s) => a + s.avgHR, 0) / withHR.length) : 0;
    // real HR trend: recent half vs older half of HR-bearing sessions (newest first)
    const half = Math.floor(withHR.length / 2);
    const recentMean = half ? withHR.slice(0, half).reduce((a, s) => a + s.avgHR, 0) / half : avgHR;
    const olderMean = half ? withHR.slice(half, half * 2).reduce((a, s) => a + s.avgHR, 0) / half : avgHR;
    const hrTrend = olderMean ? Math.round(((recentMean - olderMean) / olderMean) * 100) : 0;

    // HR overview: oldest→newest of last 18 HR sessions
    const hrSessions = [...withHR].slice(0, 18).reverse();
    const hrLabels = hrSessions.map((s) => new Date(s.startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }));
    const hrAvg = hrSessions.map((s) => s.avgHR);
    const hrMax = hrSessions.map((s) => s.maxHR || s.avgHR);
    const hrSpark = withHR.slice(0, 14).reverse().map((s) => s.avgHR);

    // source distribution
    const counts: Record<string, number> = { live: 0, stored: 0, mixed: 0 };
    sessions.forEach((s) => { counts[sourceOf(s)]++; });
    const srcSegments = (["live", "stored", "mixed"] as const)
      .map((k) => ({ label: SRC_META[k].label, value: counts[k], color: SRC_META[k].color }))
      .filter((s) => s.value > 0);

    // real activity distribution (from session.activityType)
    const actCounts: Record<string, number> = {};
    sessions.forEach((s) => { const k = s.activityType || "ecg"; actCounts[k] = (actCounts[k] || 0) + 1; });
    const actTotal = sessions.length || 1;
    const activitySegments = Object.entries(actCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({ key, value, pct: Math.round((value / actTotal) * 100) }));

    // device online/offline
    const onlineDevices = devices.filter((dv) => (Date.now() - new Date(dv.lastSeen).getTime()) / 3600000 < 24).length;

    return {
      labels, usersMonthly, sessionsMonthly, avgHR, hrTrend,
      hrLabels, hrAvg, hrMax, hrSpark, srcSegments, activitySegments, counts,
      onlineDevices, offlineDevices: devices.length - onlineDevices,
    };
  }, [d, sessions, devices]);

  if (isLoading) {
    return (
      <div>
        <div className="h-8 w-48 rounded-lg animate-pulse mb-6" style={{ background: "var(--bg-surface)" }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          {[1,2,3,4].map((i) => <div key={i} className="h-[160px] rounded-2xl animate-pulse" style={{ background: "var(--bg-surface)" }} />)}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="h-[320px] rounded-2xl animate-pulse" style={{ background: "var(--bg-surface)" }} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto mb-4" style={{ color: C.pink }} />
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Failed to load dashboard data</p>
        <Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn>
      </div>
    );
  }

  const totalUsers = (d?.totalUsers as number) ?? 0;
  const totalSessions = (d?.totalSessions as number) ?? 0;
  const activeDevices = (d?.activeDevices as number) ?? 0;
  const totalDevices = (d?.totalDevices as number) ?? 0;
  const trends = (d?.trends as Record<string, number>) ?? {};
  const recentSessions = sessions.slice(0, 5);
  const recentDevices = devices.slice(0, 5);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-bold m-0" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
          <p className="text-[14px] mt-1" style={{ color: "var(--text-muted)" }}>Overview of your wearable wellness platform</p>
        </div>
        <button
          onClick={() => downloadExport("sessions")}
          className="flex items-center gap-2 rounded-[12px] text-[14px] font-semibold text-white cursor-pointer border-none"
          style={{ padding: "11px 18px", background: "linear-gradient(135deg, #22D3EE, #3B82F6)", boxShadow: "0 10px 24px rgba(59,130,246,0.30)" }}
        >
          <Download size={16} />Export Report
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
        <StatCard icon={Users} label="Total Users" value={totalUsers.toLocaleString()} color={C.blue}
          trend={trends.usersTrend ?? 0} trendLabel="vs last week" spark={{ type: "bar", data: derived.usersMonthly }} />
        <StatCard icon={Smartphone} label="Active Devices" value={activeDevices.toLocaleString()} color={C.purple}
          trend={null} trendLabel={`of ${totalDevices} total`} spark={{ type: "bar", data: devices.slice(0, 12).map((x) => x.batteryLevel) }} />
        <StatCard icon={Activity} label="Total Sessions" value={totalSessions.toLocaleString()} color={C.cyan}
          trend={trends.sessionsTrend ?? 0} trendLabel="vs last week" spark={{ type: "bar", data: derived.sessionsMonthly }} />
      </div>
      <div className="flex items-center gap-[6px] mb-5 text-[12px] -mt-1" style={{ color: "var(--text-muted)" }}>
        <Server size={13} style={{ color: C.green }} />
        {activeDevices}/{totalDevices} devices online · {derived.onlineDevices} seen in last 24h
      </div>

      {/* Row 3 — tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        <Card title="Recent Sessions" icon={Clock} iconColor={C.cyan} action={<span onClick={() => router.push("/sessions")}><ViewAll /></span>}>
          <div className="overflow-x-auto" style={{ padding: "4px 10px 14px" }}>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-[11px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: 0.4 }}>
                  <th className="text-left font-semibold px-3 py-2">User</th>
                  <th className="text-left font-semibold px-3 py-2">Source</th>
                  <th className="text-left font-semibold px-3 py-2">Duration</th>
                  <th className="text-left font-semibold px-3 py-2">Heart Rate</th>
                  <th className="text-left font-semibold px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((s) => {
                  const src = sourceOf(s); const meta = SRC_META[src];
                  return (
                    <tr key={s.id} className="cursor-pointer" onClick={() => router.push(`/sessions/${s.id}`)}
                      style={{ borderTop: "1px solid var(--border-clr)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td className="px-3 py-[10px]">
                        <div className="flex items-center gap-[10px]">
                          <span className="flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                            style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#22D3EE,#8B5CF6)" }}>
                            {getInitials(s.userName || "–")}
                          </span>
                          <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{s.userName || "Unknown"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-[10px]"><Badge text={meta.label} color={meta.color} /></td>
                      <td className="px-3 py-[10px] text-[13px]" style={{ color: "var(--text-secondary)" }}>{formatDuration(s.startTime, s.endTime)}</td>
                      <td className="px-3 py-[10px]">
                        <span className="inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: C.pink }}>
                          <Heart size={12} />{s.avgHR || "–"} bpm
                        </span>
                      </td>
                      <td className="px-3 py-[10px] text-[12px]" style={{ color: "var(--text-muted)" }}>
                        {new Date(s.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
                {!recentSessions.length && <tr><td colSpan={5}><Empty text="No sessions yet" /></td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Device Status" icon={Server} iconColor={C.purple} action={<span onClick={() => router.push("/devices")}><ViewAll /></span>}>
          <div className="overflow-x-auto" style={{ padding: "4px 10px 14px" }}>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-[11px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: 0.4 }}>
                  <th className="text-left font-semibold px-3 py-2">Device ID</th>
                  <th className="text-left font-semibold px-3 py-2">User</th>
                  <th className="text-left font-semibold px-3 py-2">Battery</th>
                  <th className="text-left font-semibold px-3 py-2">Status</th>
                  <th className="text-left font-semibold px-3 py-2">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {recentDevices.map((dv) => {
                  const online = (Date.now() - new Date(dv.lastSeen).getTime()) / 3600000 < 24;
                  const b = dv.batteryLevel;
                  const bcolor = b > 50 ? C.green : b > 20 ? C.amber : C.pink;
                  return (
                    <tr key={dv.id} className="cursor-pointer" onClick={() => router.push(`/devices/${dv.id}`)}
                      style={{ borderTop: "1px solid var(--border-clr)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td className="px-3 py-[10px] text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{dv.id}</td>
                      <td className="px-3 py-[10px] text-[13px]" style={{ color: "var(--text-secondary)" }}>{dv.userName}</td>
                      <td className="px-3 py-[10px]">
                        <div className="flex items-center gap-2">
                          <div className="overflow-hidden rounded-[3px]" style={{ width: 42, height: 6, background: "var(--bg-input)" }}>
                            <div className="h-full rounded-[3px]" style={{ width: `${b}%`, background: bcolor }} />
                          </div>
                          <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{b}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-[10px]"><Badge text={online ? "Online" : "Offline"} color={online ? C.green : C.slate} /></td>
                      <td className="px-3 py-[10px] text-[12px]" style={{ color: "var(--text-muted)" }}>{formatRelativeTime(dv.lastSeen)}</td>
                    </tr>
                  );
                })}
                {!recentDevices.length && <tr><td colSpan={5}><Empty text="No devices yet" /></td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="User Growth" icon={BarChart3} iconColor={C.blue} action={
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-[6px] text-[12px]" style={{ color: "var(--text-secondary)" }}><span style={{ width: 9, height: 9, borderRadius: 3, background: C.blue }} />New Users</span>
            <span className="flex items-center gap-[6px] text-[12px]" style={{ color: "var(--text-secondary)" }}><span style={{ width: 9, height: 9, borderRadius: 3, background: C.purple }} />Sessions</span>
          </div>
        }>
          <GroupedBars labels={derived.labels} a={derived.usersMonthly} b={derived.sessionsMonthly} aColor={C.blue} bColor={C.purple} />
        </Card>

        <Card title="Sessions by Activity" icon={Activity} iconColor={C.green} action={<span onClick={() => router.push("/sessions")}><ViewAll /></span>}>
          <div className="flex flex-col gap-[14px]" style={{ padding: "12px 22px 22px" }}>
            {derived.activitySegments.length ? derived.activitySegments.map((s) => {
              const m = actMeta(s.key);
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <span className="flex items-center justify-center shrink-0" style={{ width: 30, height: 30, borderRadius: "50%", background: `${m.color}22` }}>
                    <m.icon size={15} style={{ color: m.color }} />
                  </span>
                  <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)", width: 74 }}>{m.label}</span>
                  <div className="flex-1 overflow-hidden rounded-full" style={{ height: 8, background: "var(--bg-input)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.max(s.pct, 2)}%`, background: m.color }} />
                  </div>
                  <span className="text-[13px] font-semibold text-right" style={{ color: "var(--text-primary)", width: 36 }}>{s.pct}%</span>
                  <span className="text-[13px] text-right" style={{ color: "var(--text-muted)", width: 48 }}>{s.value.toLocaleString()}</span>
                </div>
              );
            }) : <Empty text="No sessions recorded yet" />}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ padding: "48px 20px", color: "var(--text-muted)" }}>
      <Activity size={28} className="mb-2 opacity-60" />
      <p className="text-[13px] m-0">{text}</p>
    </div>
  );
}
