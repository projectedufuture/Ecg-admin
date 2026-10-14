"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ChevronDown, SlidersHorizontal, List, LayoutGrid, Download,
  PlayCircle, CheckCircle2, RefreshCw, XCircle, Heart, Droplets, Thermometer,
  Activity, Footprints, Bike, Dumbbell, Mountain, Zap, Circle, ArrowUp, ArrowDown,
  AlertCircle, ChevronLeft, ChevronRight, Calendar, MoreHorizontal, ArrowDownUp,
} from "lucide-react";
import Btn from "@/components/ui/Btn";
import { useSessions } from "@/lib/hooks";
import { downloadExport } from "@/lib/api";
import { formatDuration } from "@/lib/utils";
import { Session } from "@/types";

const C = { blue: "#3B82F6", cyan: "#06B6D4", purple: "#8B5CF6", green: "#10B981", amber: "#F59E0B", pink: "#F43F5E", slate: "#94A3B8", teal: "#14B8A6" };
const PAGE_SIZE = 10;

// ── activity mapping (real activityType from backend) ────────────
const ACTIVITY: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ecg: { label: "ECG", color: C.cyan, icon: Activity },
  walking: { label: "Walking", color: C.green, icon: Footprints },
  running: { label: "Running", color: C.amber, icon: Footprints },
  cycling: { label: "Cycling", color: C.blue, icon: Bike },
  hiking: { label: "Hiking", color: C.teal, icon: Mountain },
  training: { label: "Training", color: C.purple, icon: Dumbbell },
  recovery_walk: { label: "Recovery Walk", color: C.green, icon: Footprints },
  interval_run: { label: "Interval Run", color: C.pink, icon: Zap },
  other: { label: "Other", color: C.slate, icon: Circle },
};
const actOf = (s: Session) => ACTIVITY[s.activityType || "ecg"] ?? ACTIVITY.ecg;

// ── status derivation ────────────────────────────────────────────
type SStatus = "completed" | "inprogress" | "disconnected";
function statusOf(s: Session): SStatus {
  const ongoing = new Date(s.endTime).getTime() - new Date(s.startTime).getTime() < 1000;
  if (ongoing || s.reportStatus === "generating" || s.reportStatus === "pending") return "inprogress";
  if (s.dataPoints === 0 || s.reportStatus === "failed") return "disconnected";
  return "completed";
}
const STATUS_META: Record<SStatus, { label: string; color: string }> = {
  completed: { label: "Completed", color: C.green },
  inprogress: { label: "In Progress", color: C.purple },
  disconnected: { label: "Disconnected", color: C.pink },
};

// ── sparkbars ────────────────────────────────────────────────────
function Sparkbars({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 42 }}>
      {data.map((v, i) => (
        <div key={i} style={{ width: 5, height: `${Math.max(10, (v / max) * 100)}%`, borderRadius: 2, background: color, opacity: 0.35 + 0.65 * (v / max), transformOrigin: "bottom", animation: `growBar 0.5s ${i * 0.04}s cubic-bezier(0.22,1,0.36,1) both` }} />
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend, color, spark, delay }: {
  icon: React.ElementType; label: string; value: string; trend: number; color: string; spark: number[]; delay: number;
}) {
  const up = trend >= 0;
  return (
    <div className="rounded-2xl p-5 animate-rise" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", animationDelay: `${delay}ms`, transition: "transform 0.18s, box-shadow 0.18s" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 14px 34px ${color}22`; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-[10px] mb-3">
            <div className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: 12, background: `${color}22` }}><Icon size={20} style={{ color }} /></div>
            <span className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
          </div>
          <div className="text-[30px] font-bold leading-none" style={{ color: "var(--text-primary)", letterSpacing: -0.5 }}>{value}</div>
          <div className="flex items-center gap-[5px] mt-2 text-[12px] font-semibold" style={{ color: up ? C.green : C.pink }}>
            {up ? <ArrowUp size={13} /> : <ArrowDown size={13} />}{Math.abs(trend)}%<span className="font-normal" style={{ color: "var(--text-muted)" }}>vs last month</span>
          </div>
        </div>
        <div className="self-center"><Sparkbars data={spark} color={color} /></div>
      </div>
    </div>
  );
}

function Dropdown({ icon: Icon, value, options, onChange, width = 150 }: { icon?: React.ElementType; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; width?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const current = options.find((o) => o.value === value);
  return (
    <div className="relative" ref={ref} style={{ width }}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 w-full rounded-[12px] text-[13px] font-medium cursor-pointer" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", padding: "11px 14px", color: "var(--text-primary)" }}>
        {Icon && <Icon size={15} style={{ color: "var(--text-muted)" }} />}<span className="flex-1 text-left truncate">{current?.label ?? value}</span><ChevronDown size={15} style={{ color: "var(--text-muted)" }} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-1 rounded-[12px] overflow-hidden z-30 py-1 max-h-[280px] overflow-y-auto" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", boxShadow: "0 16px 40px rgba(0,0,0,0.28)" }}>
          {options.map((o) => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }} className="flex items-center justify-between w-full text-left px-3 py-[9px] text-[13px] border-none bg-transparent cursor-pointer" style={{ color: o.value === value ? C.cyan : "var(--text-secondary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <span className="truncate">{o.label}</span>{o.value === value && <CheckCircle2 size={14} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const AVATAR_GRADS = ["linear-gradient(135deg,#22D3EE,#3B82F6)", "linear-gradient(135deg,#8B5CF6,#EC4899)", "linear-gradient(135deg,#10B981,#06B6D4)", "linear-gradient(135deg,#F59E0B,#F43F5E)", "linear-gradient(135deg,#6366F1,#8B5CF6)"];
function gradFor(id: string) { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % AVATAR_GRADS.length; return AVATAR_GRADS[h]; }
function initials(name: string) { return (name || "–").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(); }

function monthBuckets(dates: string[], pred?: (i: number) => boolean) {
  const now = new Date(); const keys: string[] = [];
  for (let i = 7; i >= 0; i--) { const dt = new Date(now.getFullYear(), now.getMonth() - i, 1); keys.push(`${dt.getFullYear()}-${dt.getMonth()}`); }
  const b = Object.fromEntries(keys.map((k) => [k, 0])) as Record<string, number>;
  dates.forEach((s, i) => { if (pred && !pred(i)) return; const dt = new Date(s); const k = `${dt.getFullYear()}-${dt.getMonth()}`; if (k in b) b[k]++; });
  return keys.map((k) => b[k]);
}

function ActivityBadge({ s }: { s: Session }) {
  const a = actOf(s);
  return (
    <span className="inline-flex items-center gap-[6px] rounded-full text-[12px] font-semibold" style={{ padding: "4px 11px", background: `${a.color}1f`, color: a.color }}>
      <a.icon size={13} />{a.label}
    </span>
  );
}

function StatusBadge({ s }: { s: Session }) {
  const st = statusOf(s); const meta = STATUS_META[st];
  return (
    <span className="inline-flex items-center gap-[6px] rounded-full text-[12px] font-semibold" style={{ padding: "4px 11px", background: `${meta.color}1f`, color: meta.color }}>
      <span className="relative flex" style={{ width: 7, height: 7 }}>
        {st === "inprogress" && <span className="absolute inline-flex w-full h-full rounded-full" style={{ background: meta.color, animation: "pulse 1.4s ease-in-out infinite" }} />}
        <span className="relative inline-flex rounded-full" style={{ width: 7, height: 7, background: meta.color }} />
      </span>
      {meta.label}
    </span>
  );
}

export default function SessionsPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSessions({ limit: 1000, sort: "startTime", order: "desc" });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);

  const sessions = (data?.items as unknown as Session[]) ?? [];
  const total = (data?._pagination as { total?: number } | undefined)?.total ?? sessions.length;

  const stats = useMemo(() => {
    const starts = sessions.map((s) => s.startTime);
    const st = sessions.map(statusOf);
    const completed = st.filter((x) => x === "completed").length;
    const inprogress = st.filter((x) => x === "inprogress").length;
    const disconnected = st.filter((x) => x === "disconnected").length;
    const b = monthBuckets(starts);
    const trend = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 100) : (cur ? 100 : 0));
    const spC = monthBuckets(starts, (i) => st[i] === "completed");
    const spP = monthBuckets(starts, (i) => st[i] === "inprogress");
    const spD = monthBuckets(starts, (i) => st[i] === "disconnected");
    return {
      completed, inprogress, disconnected,
      spTotal: b, spC, spP, spD,
      tTotal: trend(b[7], b[6]), tC: trend(spC[7], spC[6]), tP: trend(spP[7], spP[6]), tD: trend(spD[7], spD[6]),
    };
  }, [sessions]);

  const userOptions = useMemo(() => {
    const set = Array.from(new Set(sessions.map((s) => s.userName).filter(Boolean))).slice(0, 40);
    return [{ value: "all", label: "All Users" }, ...set.map((u) => ({ value: u, label: u }))];
  }, [sessions]);
  const deviceOptions = useMemo(() => {
    const set = Array.from(new Set(sessions.map((s) => s.deviceId).filter(Boolean))).slice(0, 40);
    return [{ value: "all", label: "All Devices" }, ...set.map((dv) => ({ value: dv, label: dv }))];
  }, [sessions]);
  const activityOptions = useMemo(() => {
    const set = Array.from(new Set(sessions.map((s) => s.activityType || "ecg")));
    return [{ value: "all", label: "All Activities" }, ...set.map((a) => ({ value: a, label: ACTIVITY[a]?.label ?? a }))];
  }, [sessions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    let rows = sessions.filter((s) => {
      if (statusFilter !== "all" && statusOf(s) !== statusFilter) return false;
      if (activityFilter !== "all" && (s.activityType || "ecg") !== activityFilter) return false;
      if (userFilter !== "all" && s.userName !== userFilter) return false;
      if (deviceFilter !== "all" && s.deviceId !== deviceFilter) return false;
      if (dateFilter !== "all") {
        const age = (now - new Date(s.startTime).getTime()) / 86400000;
        if (dateFilter === "7d" && age > 7) return false;
        if (dateFilter === "30d" && age > 30) return false;
        if (dateFilter === "today" && age > 1) return false;
      }
      if (q) { const hay = `${s.name ?? ""} ${s.id} ${s.userName} ${s.deviceId}`.toLowerCase(); if (!hay.includes(q)) return false; }
      return true;
    });
    const dur = (s: Session) => new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
    rows = [...rows].sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      if (sortBy === "longest") return dur(b) - dur(a);
      if (sortBy === "hr") return (b.avgHR || 0) - (a.avgHR || 0);
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });
    return rows;
  }, [sessions, search, statusFilter, activityFilter, userFilter, deviceFilter, dateFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, statusFilter, activityFilter, userFilter, deviceFilter, dateFilter, sortBy]);
  const activeFilters = [statusFilter, activityFilter, userFilter, deviceFilter, dateFilter].filter((x) => x !== "all").length + (search ? 1 : 0);

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto mb-4" style={{ color: C.pink }} />
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Failed to load sessions</p>
        <Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn>
      </div>
    );
  }

  const rangeFrom = filtered.length ? (curPage - 1) * PAGE_SIZE + 1 : 0;
  const rangeTo = Math.min(curPage * PAGE_SIZE, filtered.length);

  const Metrics = ({ s }: { s: Session }) => (
    <div className="flex items-center gap-[14px] text-[12px]">
      <span className="inline-flex items-center gap-[4px] font-semibold" style={{ color: C.pink }}><Heart size={12} />{s.avgHR || "–"} <span className="font-normal" style={{ color: "var(--text-muted)" }}>bpm</span></span>
      <span className="inline-flex items-center gap-[4px] font-semibold" style={{ color: C.blue }}><Droplets size={12} />{s.avgSpo2 || "–"}<span className="font-normal" style={{ color: "var(--text-muted)" }}>%</span></span>
      <span className="inline-flex items-center gap-[4px] font-semibold" style={{ color: C.amber }}><Thermometer size={12} />{s.avgTemp || "–"}°C</span>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-bold m-0" style={{ color: "var(--text-primary)" }}>Sessions</h1>
          <p className="text-[14px] mt-1" style={{ color: "var(--text-muted)" }}>View and manage all wearable sessions with ECG, heart rate, and vital data</p>
        </div>
        <button onClick={() => downloadExport("sessions")} className="flex items-center gap-2 rounded-[12px] text-[13px] font-semibold text-white cursor-pointer border-none" style={{ padding: "10px 18px", background: "linear-gradient(135deg,#22D3EE,#3B82F6)", boxShadow: "0 10px 24px rgba(59,130,246,0.30)" }}><Download size={15} />Export CSV</button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard icon={PlayCircle} label="Total Sessions" value={total.toLocaleString()} trend={stats.tTotal} color={C.blue} spark={stats.spTotal} delay={0} />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed.toLocaleString()} trend={stats.tC} color={C.green} spark={stats.spC} delay={60} />
        <StatCard icon={RefreshCw} label="In Progress" value={stats.inprogress.toLocaleString()} trend={stats.tP} color={C.purple} spark={stats.spP} delay={120} />
        <StatCard icon={XCircle} label="Disconnected" value={stats.disconnected.toLocaleString()} trend={stats.tD} color={C.pink} spark={stats.spD} delay={180} />
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-[10px] rounded-[12px] flex-1 min-w-[220px]" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", padding: "11px 14px" }}>
          <Search size={17} style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sessions, user, or device..." className="bg-transparent border-none outline-none flex-1 text-[14px] font-sans" style={{ color: "var(--text-primary)" }} />
        </div>
        <Dropdown value={statusFilter} onChange={setStatusFilter} width={140} options={[{ value: "all", label: "All Status" }, { value: "completed", label: "Completed" }, { value: "inprogress", label: "In Progress" }, { value: "disconnected", label: "Disconnected" }]} />
        <Dropdown value={activityFilter} onChange={setActivityFilter} width={150} options={activityOptions} />
        <Dropdown value={userFilter} onChange={setUserFilter} width={140} options={userOptions} />
        <Dropdown value={deviceFilter} onChange={setDeviceFilter} width={150} options={deviceOptions} />
        <Dropdown icon={Calendar} value={dateFilter} onChange={setDateFilter} width={170} options={[{ value: "all", label: "Select Date Range" }, { value: "today", label: "Today" }, { value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }]} />
        <button onClick={() => { setSearch(""); setStatusFilter("all"); setActivityFilter("all"); setUserFilter("all"); setDeviceFilter("all"); setDateFilter("all"); }} className="flex items-center gap-2 rounded-[12px] text-[13px] font-medium cursor-pointer" style={{ background: "var(--bg-surface)", border: `1px solid ${activeFilters ? C.cyan : "var(--border-clr)"}`, padding: "11px 14px", color: activeFilters ? C.cyan : "var(--text-primary)" }}>
          <SlidersHorizontal size={15} />Filters{activeFilters ? <span className="flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ minWidth: 17, height: 17, background: C.cyan }}>{activeFilters}</span> : null}
        </button>
      </div>

      {/* Count + sort + view */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h2 className="text-[18px] font-bold m-0" style={{ color: "var(--text-primary)" }}>Sessions <span style={{ color: "var(--text-muted)" }}>({filtered.length.toLocaleString()})</span></h2>
        <div className="flex items-center gap-3">
          <Dropdown icon={ArrowDownUp} value={sortBy} onChange={setSortBy} width={160} options={[{ value: "newest", label: "Newest First" }, { value: "oldest", label: "Oldest First" }, { value: "longest", label: "Longest" }, { value: "hr", label: "Highest HR" }]} />
          <div className="flex rounded-[12px] overflow-hidden" style={{ border: "1px solid var(--border-clr)" }}>
            {([["list", List], ["grid", LayoutGrid]] as const).map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)} className="flex items-center justify-center cursor-pointer border-none" style={{ width: 42, height: 42, background: view === v ? "linear-gradient(135deg,#22D3EE,#3B82F6)" : "var(--bg-surface)", color: view === v ? "#fff" : "var(--text-muted)" }}><Icon size={17} /></button>
            ))}
          </div>
        </div>
      </div>

      {/* List view */}
      {view === "list" ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 1000 }}>
              <thead>
                <tr className="text-[11px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: 0.4, borderBottom: "1px solid var(--border-clr)" }}>
                  <th className="text-left font-semibold px-5 py-[13px]">Session</th>
                  <th className="text-left font-semibold px-3 py-[13px]">User</th>
                  <th className="text-left font-semibold px-3 py-[13px]">Activity</th>
                  <th className="text-left font-semibold px-3 py-[13px]">Duration</th>
                  <th className="text-left font-semibold px-3 py-[13px]">Metrics</th>
                  <th className="text-left font-semibold px-3 py-[13px]">Device</th>
                  <th className="text-left font-semibold px-3 py-[13px]">Status</th>
                  <th className="text-left font-semibold px-3 py-[13px]">Recorded At</th>
                  <th className="text-right font-semibold px-5 py-[13px]"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && !sessions.length && Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--border-clr)" }}><td colSpan={9} className="px-5 py-4"><div className="h-6 rounded animate-pulse" style={{ background: "var(--bg-input)" }} /></td></tr>
                ))}
                {pageRows.map((s, i) => {
                  const a = actOf(s);
                  return (
                    <tr key={s.id} className="cursor-pointer animate-rise" onClick={() => router.push(`/sessions/${s.id}`)} style={{ borderTop: "1px solid var(--border-clr)", animationDelay: `${i * 35}ms` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td className="px-5 py-[12px]">
                        <div className="flex items-center gap-[11px]">
                          <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 10, background: `${a.color}22` }}><a.icon size={18} style={{ color: a.color }} /></span>
                          <div><div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{s.name || `${a.label} Session`}</div><div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{s.id}</div></div>
                        </div>
                      </td>
                      <td className="px-3 py-[12px]">
                        <div className="flex items-center gap-[9px]">
                          <span className="flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ width: 30, height: 30, borderRadius: 9, background: gradFor(s.userId || s.id) }}>{initials(s.userName)}</span>
                          <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{s.userName || "Unknown"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-[12px]"><ActivityBadge s={s} /></td>
                      <td className="px-3 py-[12px] text-[13px]" style={{ color: "var(--text-secondary)" }}>{formatDuration(s.startTime, s.endTime)}</td>
                      <td className="px-3 py-[12px]"><Metrics s={s} /></td>
                      <td className="px-3 py-[12px]"><code className="text-[12px] rounded" style={{ color: C.cyan, background: "rgba(6,182,212,0.14)", padding: "2px 8px" }}>{s.deviceId}</code></td>
                      <td className="px-3 py-[12px]"><StatusBadge s={s} /></td>
                      <td className="px-3 py-[12px]"><div className="text-[13px]" style={{ color: "var(--text-primary)" }}>{new Date(s.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div><div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{new Date(s.startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</div></td>
                      <td className="px-5 py-[12px]"><div className="flex justify-end"><MoreHorizontal size={18} style={{ color: "var(--text-muted)" }} /></div></td>
                    </tr>
                  );
                })}
                {!isLoading && !pageRows.length && (
                  <tr><td colSpan={9}><div className="flex flex-col items-center justify-center text-center" style={{ padding: "56px 20px", color: "var(--text-muted)" }}><Activity size={30} className="mb-2 opacity-60" /><p className="text-[13px] m-0">No sessions match your filters</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager rangeFrom={rangeFrom} rangeTo={rangeTo} total={filtered.length} curPage={curPage} totalPages={totalPages} setPage={setPage} />
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pageRows.map((s, i) => {
              const a = actOf(s);
              return (
                <div key={s.id} onClick={() => router.push(`/sessions/${s.id}`)} className="rounded-2xl p-4 cursor-pointer animate-rise" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", animationDelay: `${i * 35}ms`, transition: "border-color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = a.color)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-clr)")}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-[10px]"><span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 10, background: `${a.color}22` }}><a.icon size={18} style={{ color: a.color }} /></span><div><div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{s.name || `${a.label} Session`}</div><div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{s.id}</div></div></div>
                    <StatusBadge s={s} />
                  </div>
                  <div className="flex items-center gap-[9px] mb-3"><span className="flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ width: 28, height: 28, borderRadius: 8, background: gradFor(s.userId || s.id) }}>{initials(s.userName)}</span><span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{s.userName}</span><ActivityBadge s={s} /></div>
                  <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--border-clr)" }}><Metrics s={s} /><span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{formatDuration(s.startTime, s.endTime)}</span></div>
                </div>
              );
            })}
          </div>
          <div className="rounded-2xl mt-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}><Pager rangeFrom={rangeFrom} rangeTo={rangeTo} total={filtered.length} curPage={curPage} totalPages={totalPages} setPage={setPage} /></div>
        </div>
      )}
    </div>
  );
}

function Pager({ rangeFrom, rangeTo, total, curPage, totalPages, setPage }: { rangeFrom: number; rangeTo: number; total: number; curPage: number; totalPages: number; setPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4" style={{ borderTop: "1px solid var(--border-clr)" }}>
      <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>Showing {rangeFrom}–{rangeTo} of {total.toLocaleString()} sessions</span>
      <div className="flex items-center gap-[6px]">
        <button onClick={() => setPage(curPage - 1)} disabled={curPage <= 1} className="flex items-center justify-center rounded-[9px] border-none" style={{ width: 34, height: 34, background: "var(--bg-input)", color: "var(--text-secondary)", cursor: curPage <= 1 ? "not-allowed" : "pointer", opacity: curPage <= 1 ? 0.4 : 1 }}><ChevronLeft size={16} /></button>
        {Array.from({ length: totalPages }).map((_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - curPage) <= 1).map((p, idx, arr) => (
          <span key={p} className="flex items-center">
            {idx > 0 && p - arr[idx - 1] > 1 && <span className="px-1 text-[13px]" style={{ color: "var(--text-muted)" }}>…</span>}
            <button onClick={() => setPage(p)} className="rounded-[9px] text-[13px] font-semibold cursor-pointer border-none" style={{ minWidth: 34, height: 34, background: p === curPage ? "linear-gradient(135deg,#22D3EE,#3B82F6)" : "var(--bg-input)", color: p === curPage ? "#fff" : "var(--text-secondary)" }}>{p}</button>
          </span>
        ))}
        <button onClick={() => setPage(curPage + 1)} disabled={curPage >= totalPages} className="flex items-center justify-center rounded-[9px] border-none" style={{ width: 34, height: 34, background: "var(--bg-input)", color: "var(--text-secondary)", cursor: curPage >= totalPages ? "not-allowed" : "pointer", opacity: curPage >= totalPages ? 0.4 : 1 }}><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}
