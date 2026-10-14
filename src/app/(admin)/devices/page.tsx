"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Download, Plus, Layers, Search, ChevronDown, SlidersHorizontal, List, LayoutGrid,
  Smartphone, Wifi, ShieldCheck, XCircle, Shirt, MoreVertical, Eye, Power,
  Battery, BatteryLow, BatteryWarning, ArrowUp, ArrowDown, CheckCircle2, AlertCircle,
  RefreshCw, Info, Hash, Cpu, Package, Key, Clipboard, ChevronLeft, ChevronRight, Activity,
} from "lucide-react";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import InputField from "@/components/ui/InputField";
import { useDevices } from "@/lib/hooks";
import { api, downloadExport } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Device } from "@/types";

const C = { blue: "#3B82F6", cyan: "#06B6D4", purple: "#8B5CF6", green: "#10B981", amber: "#F59E0B", pink: "#F43F5E", slate: "#94A3B8" };
const PAGE_SIZE = 10;

interface RegisterResponse { success: boolean; data: { id: string; license?: { licenseKey: string; status: string; expiryDate: string } }; }
interface BulkCreatedDevice { id: string; license: { licenseKey: string; status: string; expiryDate: string }; }
interface BulkResponse { success: boolean; data: { created: number; devices: BulkCreatedDevice[]; range: { first: string; last: string } }; }

// ── device state classification (matches reference semantics) ────
type DState = "online" | "offline" | "inactive" | "notActivated";
function classify(d: Device): DState {
  if (d.licenseStatus !== "active") return "inactive";
  if (!d.isPaired) return "notActivated";
  return (Date.now() - new Date(d.lastSeen).getTime()) / 3600000 < 24 ? "online" : "offline";
}
const STATE_META: Record<DState, { label: string; color: string }> = {
  online: { label: "Online", color: C.green },
  offline: { label: "Offline", color: C.pink },
  inactive: { label: "Inactive", color: C.amber },
  notActivated: { label: "Not Activated", color: C.purple },
};

// ── helpers ──────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 150, H = 50;
  if (data.length < 2) return <div style={{ width: W, height: H }} />;
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * W, H - 5 - ((v - min) / rng) * (H - 10)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const uid = color.replace("#", "");
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <defs><linearGradient id={`ds-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.32" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${W},${H} L0,${H} Z`} fill={`url(#ds-${uid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ icon: Icon, label, value, trend, trendLabel, color, dot, spark }: {
  icon: React.ElementType; label: string; value: string; trend?: number | null; trendLabel: string; color: string; dot?: boolean; spark: number[];
}) {
  const up = (trend ?? 0) >= 0;
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-[10px] mb-3">
            <div className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: 12, background: `${color}22` }}><Icon size={20} style={{ color }} /></div>
            <span className="text-[13px] font-medium flex items-center gap-[6px]" style={{ color: "var(--text-secondary)" }}>
              {dot && <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />}{label}
            </span>
          </div>
          <div className="text-[30px] font-bold leading-none" style={{ color: "var(--text-primary)", letterSpacing: -0.5 }}>{value}</div>
          {trend != null ? (
            <div className="flex items-center gap-[5px] mt-2 text-[12px] font-semibold" style={{ color: up ? C.green : C.pink }}>
              {up ? <ArrowUp size={13} /> : <ArrowDown size={13} />}{Math.abs(trend)}%<span className="font-normal" style={{ color: "var(--text-muted)" }}>{trendLabel}</span>
            </div>
          ) : <div className="mt-2 text-[12px]" style={{ color: "var(--text-muted)" }}>{trendLabel}</div>}
        </div>
        <div className="shrink-0 self-center"><Sparkline data={spark} color={color} /></div>
      </div>
    </div>
  );
}

function Dropdown({ value, options, onChange, width = 150 }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; width?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const current = options.find((o) => o.value === value);
  return (
    <div className="relative" ref={ref} style={{ width }}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 w-full rounded-[12px] text-[13px] font-medium cursor-pointer" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", padding: "11px 14px", color: "var(--text-primary)" }}>
        <span className="flex-1 text-left truncate">{current?.label ?? value}</span><ChevronDown size={15} style={{ color: "var(--text-muted)" }} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-1 rounded-[12px] overflow-hidden z-30 py-1" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", boxShadow: "0 16px 40px rgba(0,0,0,0.28)" }}>
          {options.map((o) => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }} className="flex items-center justify-between w-full text-left px-3 py-[9px] text-[13px] border-none bg-transparent cursor-pointer" style={{ color: o.value === value ? C.cyan : "var(--text-secondary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              {o.label}{o.value === value && <CheckCircle2 size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const AVATAR_GRADS = ["linear-gradient(135deg,#22D3EE,#3B82F6)", "linear-gradient(135deg,#8B5CF6,#EC4899)", "linear-gradient(135deg,#10B981,#06B6D4)", "linear-gradient(135deg,#F59E0B,#F43F5E)", "linear-gradient(135deg,#6366F1,#8B5CF6)"];
function gradFor(id: string) { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % AVATAR_GRADS.length; return AVATAR_GRADS[h]; }
function initials(name: string) { return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(); }

function BatteryPill({ level }: { level: number }) {
  const color = level > 50 ? C.green : level > 20 ? C.amber : C.pink;
  const Icon = level > 50 ? Battery : level > 20 ? BatteryWarning : BatteryLow;
  return (
    <span className="inline-flex items-center gap-[6px] text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
      <Icon size={17} style={{ color }} /><span style={{ color }}>{level}%</span>
    </span>
  );
}

function monthBuckets(dates: (string | undefined)[], months = 8) {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) { const dt = new Date(now.getFullYear(), now.getMonth() - i, 1); keys.push(`${dt.getFullYear()}-${dt.getMonth()}`); }
  const b = Object.fromEntries(keys.map((k) => [k, 0])) as Record<string, number>;
  dates.forEach((s) => { if (!s) return; const dt = new Date(s); const k = `${dt.getFullYear()}-${dt.getMonth()}`; if (k in b) b[k]++; });
  let run = 0; const cum = keys.map((k) => (run += b[k]));
  return { monthly: keys.map((k) => b[k]), cumulative: cum };
}

// ── per-row actions ──────────────────────────────────────────────
function RowActions({ device, onView, onToggle }: { device: Device; onView: () => void; onToggle: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const active = device.licenseStatus === "active";
  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} className="flex items-center justify-center rounded-lg border-none cursor-pointer" style={{ width: 30, height: 30, background: "transparent", color: "var(--text-muted)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
        <MoreVertical size={17} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 rounded-[12px] overflow-hidden z-30 py-1" style={{ width: 170, background: "var(--bg-surface)", border: "1px solid var(--border-clr)", boxShadow: "0 16px 40px rgba(0,0,0,0.28)" }}>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onView(); }} className="flex items-center gap-2 w-full text-left px-3 py-[9px] text-[13px] border-none bg-transparent cursor-pointer" style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}><Eye size={15} /> View details</button>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onToggle(); }} className="flex items-center gap-2 w-full text-left px-3 py-[9px] text-[13px] border-none bg-transparent cursor-pointer" style={{ color: active ? C.pink : C.green }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}><Power size={15} /> {active ? "Deactivate" : "Reactivate"}</button>
        </div>
      )}
    </div>
  );
}

function Check({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onChange(); }} className="flex items-center justify-center rounded-[6px] cursor-pointer shrink-0"
      style={{ width: 18, height: 18, background: checked ? "linear-gradient(135deg,#22D3EE,#3B82F6)" : "var(--bg-input)", border: checked ? "none" : "1px solid var(--border-clr)" }}>
      {checked && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5 L5 9 L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </button>
  );
}

function Donut({ segments, center, label }: { segments: { label: string; value: number; color: string }[]; center: string; label: string }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const R = 62, r = 42, cx = 75, cy = 75; let acc = -90;
  const arc = (val: number) => {
    const a0 = acc, a1 = acc + (val / total) * 360; acc = a1;
    const p = (ang: number, rad: number) => [cx + rad * Math.cos((ang * Math.PI) / 180), cy + rad * Math.sin((ang * Math.PI) / 180)];
    const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R), [x2, y2] = p(a1, r), [x3, y3] = p(a0, r);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 ${large} 0 ${x3},${y3} Z`;
  };
  return (
    <div className="flex items-center gap-4">
      <svg width="150" height="150" viewBox="0 0 150 150" className="shrink-0">
        {segments.map((s, i) => s.value > 0 && <path key={i} d={arc(s.value)} fill={s.color} />)}
        <text x="75" y="72" textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--text-primary)">{center}</text>
        <text x="75" y="90" textAnchor="middle" fontSize="10" fill="var(--text-muted)">{label}</text>
      </svg>
      <div className="flex-1 flex flex-col gap-[9px]">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />{s.label}</span>
            <span style={{ color: "var(--text-muted)" }}>{s.value} <span className="font-semibold" style={{ color: "var(--text-primary)" }}>({Math.round((s.value / total) * 100)}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────
export default function DevicesPage() {
  const router = useRouter();
  const { admin } = useAuth();
  const canRegister = admin?.role === "super_admin";
  const { data, error, isLoading, mutate } = useDevices({ limit: 1000 });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [licenseFilter, setLicenseFilter] = useState("all");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // register modals (preserved behaviour)
  const [showRegister, setShowRegister] = useState(false);
  const [regDeviceId, setRegDeviceId] = useState(""); const [regHwVersion, setRegHwVersion] = useState("HW-2.0");
  const [regLoading, setRegLoading] = useState(false); const [regError, setRegError] = useState(""); const [regResult, setRegResult] = useState<RegisterResponse["data"] | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkCount, setBulkCount] = useState("10"); const [bulkFirmware, setBulkFirmware] = useState("1.0.0"); const [bulkHw, setBulkHw] = useState("HW-2.0");
  const [bulkLoading, setBulkLoading] = useState(false); const [bulkError, setBulkError] = useState(""); const [bulkResult, setBulkResult] = useState<BulkResponse["data"] | null>(null);

  const devices = (data?.items as unknown as Device[]) ?? [];

  const stats = useMemo(() => {
    const counts: Record<DState, number> = { online: 0, offline: 0, inactive: 0, notActivated: 0 };
    devices.forEach((d) => counts[classify(d)]++);
    const total = devices.length;
    const licensed = devices.filter((d) => d.licenseStatus === "active").length;
    const b = monthBuckets(devices.map((d) => d.createdAt), 8);
    const bLic = monthBuckets(devices.filter((d) => d.licenseStatus === "active").map((d) => d.createdAt), 8);
    const bInact = monthBuckets(devices.filter((d) => d.licenseStatus !== "active").map((d) => d.createdAt), 8);
    const newThis = b.monthly[b.monthly.length - 1] || 0, newPrev = b.monthly[b.monthly.length - 2] || 0;
    const totalTrend = newPrev ? Math.round(((newThis - newPrev) / newPrev) * 100) : (newThis ? 100 : 0);
    return {
      total, licensed, counts,
      spTotal: b.cumulative, spLic: bLic.cumulative.length ? bLic.cumulative : b.cumulative, spInact: bInact.monthly, spOnline: b.monthly,
      totalTrend,
      onlineShare: total ? Math.round((counts.online / total) * 100) : 0,
      licensedShare: total ? Math.round((licensed / total) * 100) : 0,
      inactiveShare: total ? Math.round((counts.inactive / total) * 100) : 0,
    };
  }, [devices]);

  const hardwareBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    devices.forEach((d) => { const k = d.hardwareVersion || "Unknown"; m[k] = (m[k] || 0) + 1; });
    const total = devices.length || 1;
    const colors = [C.cyan, C.blue, C.purple, C.green, C.amber];
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([name, count], i) => ({ name, count, pct: Math.round((count / total) * 100), color: colors[i % colors.length] }));
  }, [devices]);

  const recentActivity = useMemo(() => {
    return [...devices]
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
      .slice(0, 6)
      .map((d) => {
        const st = classify(d);
        if (d.batteryLevel <= 20) return { id: d.id, text: `battery low (${d.batteryLevel}%)`, color: C.amber, time: d.lastSeen };
        if (st === "online") return { id: d.id, text: "came online", color: C.green, time: d.lastSeen };
        if (st === "offline") return { id: d.id, text: "went offline", color: C.pink, time: d.lastSeen };
        if (st === "notActivated") return { id: d.id, text: "awaiting pairing", color: C.purple, time: d.lastSeen };
        return { id: d.id, text: "license inactive", color: C.slate, time: d.lastSeen };
      });
  }, [devices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devices.filter((d) => {
      const st = classify(d);
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (userFilter === "assigned" && (!d.userId || d.userName === "Unassigned")) return false;
      if (userFilter === "unassigned" && d.userId && d.userName !== "Unassigned") return false;
      if (licenseFilter !== "all" && d.licenseStatus !== licenseFilter) return false;
      if (q) { const hay = `${d.id} ${d.userName} ${d.licenseKey ?? ""}`.toLowerCase(); if (!hay.includes(q)) return false; }
      return true;
    });
  }, [devices, search, statusFilter, userFilter, licenseFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, statusFilter, userFilter, licenseFilter]);
  const activeFilters = [statusFilter !== "all", userFilter !== "all", licenseFilter !== "all", !!search].filter(Boolean).length;

  const toggleSel = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const pageIds = pageRows.map((d) => d.id);
  const allPageSel = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggleAll = () => setSelected((s) => { const n = new Set(s); if (allPageSel) pageIds.forEach((id) => n.delete(id)); else pageIds.forEach((id) => n.add(id)); return n; });

  const toggleDevice = async (d: Device) => {
    const action = d.licenseStatus === "active" ? "deactivate" : "reactivate";
    try { await api.put(`/admin/devices/${d.id}/${action}`); await mutate(); } catch { /* surfaced by table refresh */ }
  };

  // register handlers
  const resetRegister = () => { setShowRegister(false); setRegDeviceId(""); setRegHwVersion("HW-2.0"); setRegResult(null); setRegError(""); };
  const resetBulk = () => { setShowBulk(false); setBulkCount("10"); setBulkFirmware("1.0.0"); setBulkHw("HW-2.0"); setBulkResult(null); setBulkError(""); };
  const handleRegister = async () => {
    if (!regDeviceId) return; setRegLoading(true); setRegError("");
    try { const resp = (await api.post("/admin/devices/register", { deviceId: regDeviceId, hardwareVersion: regHwVersion })) as RegisterResponse; setRegResult(resp.data); await mutate(); }
    catch (err: unknown) { setRegError(err instanceof Error ? err.message : "Registration failed"); }
    setRegLoading(false);
  };
  const handleBulk = async () => {
    const n = parseInt(bulkCount, 10);
    if (!Number.isFinite(n) || n < 1) { setBulkError("Enter a number between 1 and 500."); return; }
    setBulkLoading(true); setBulkError("");
    try { const resp = (await api.post("/admin/devices/bulk", { numberOfDevices: n, firmware: bulkFirmware, hardwareVersion: bulkHw })) as BulkResponse; setBulkResult(resp.data); await mutate(); }
    catch (err: unknown) { setBulkError(err instanceof Error ? err.message : "Bulk creation failed"); }
    setBulkLoading(false);
  };

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto mb-4" style={{ color: C.pink }} />
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Failed to load devices</p>
        <Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn>
      </div>
    );
  }

  const rangeFrom = filtered.length ? (curPage - 1) * PAGE_SIZE + 1 : 0;
  const rangeTo = Math.min(curPage * PAGE_SIZE, filtered.length);

  const deviceThumb = (
    <span className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,rgba(34,211,238,0.18),rgba(139,92,246,0.18))", border: "1px solid var(--border-clr)" }}>
      <Shirt size={19} style={{ color: C.cyan }} />
    </span>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-bold m-0" style={{ color: "var(--text-primary)" }}>Devices</h1>
          <p className="text-[14px] mt-1" style={{ color: "var(--text-muted)" }}>Manage registered wearable devices, monitor status, and handle device lifecycle</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canRegister && (
            <>
              <button onClick={() => setShowBulk(true)} className="flex items-center gap-2 rounded-[12px] text-[13px] font-semibold cursor-pointer" style={{ padding: "10px 16px", background: "var(--bg-surface)", border: "1px solid var(--border-clr)", color: "var(--text-primary)" }}><Layers size={15} />Bulk Register</button>
              <button onClick={() => setShowRegister(true)} className="flex items-center gap-2 rounded-[12px] text-[13px] font-semibold text-white cursor-pointer border-none" style={{ padding: "10px 18px", background: "linear-gradient(135deg,#22D3EE,#3B82F6)", boxShadow: "0 10px 24px rgba(59,130,246,0.30)" }}><Plus size={15} />Single Register</button>
            </>
          )}
          <button onClick={() => downloadExport("devices")} className="flex items-center gap-2 rounded-[12px] text-[13px] font-semibold cursor-pointer" style={{ padding: "10px 16px", background: "var(--bg-surface)", border: "1px solid var(--border-clr)", color: "var(--text-primary)" }}><Download size={15} />Export CSV</button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard icon={Smartphone} label="Total Devices" value={stats.total.toLocaleString()} color={C.cyan} trend={stats.totalTrend} trendLabel="vs last month" spark={stats.spTotal} />
        <StatCard icon={Wifi} label="Online Devices" value={stats.counts.online.toLocaleString()} color={C.green} dot trend={null} trendLabel={`${stats.onlineShare}% of fleet online`} spark={stats.spOnline} />
        <StatCard icon={ShieldCheck} label="Licensed Devices" value={stats.licensed.toLocaleString()} color={C.purple} trend={null} trendLabel={`${stats.licensedShare}% of fleet licensed`} spark={stats.spLic} />
        <StatCard icon={XCircle} label="Inactive Devices" value={stats.counts.inactive.toLocaleString()} color={C.pink} trend={null} trendLabel={`${stats.inactiveShare}% of fleet`} spark={stats.spInact} />
      </div>

      {/* Main split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: filters + table */}
        <div className="xl:col-span-2">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-[10px] rounded-[12px] flex-1 min-w-[200px]" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", padding: "11px 14px" }}>
              <Search size={17} style={{ color: "var(--text-muted)" }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by device ID, user, or license key..." className="bg-transparent border-none outline-none flex-1 text-[14px] font-sans" style={{ color: "var(--text-primary)" }} />
            </div>
            <Dropdown value={statusFilter} onChange={setStatusFilter} width={140} options={[{ value: "all", label: "All Status" }, { value: "online", label: "Online" }, { value: "offline", label: "Offline" }, { value: "inactive", label: "Inactive" }, { value: "notActivated", label: "Not Activated" }]} />
            <Dropdown value={userFilter} onChange={setUserFilter} width={140} options={[{ value: "all", label: "All Users" }, { value: "assigned", label: "Assigned" }, { value: "unassigned", label: "Unassigned" }]} />
            <Dropdown value={licenseFilter} onChange={setLicenseFilter} width={150} options={[{ value: "all", label: "All Licenses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "expired", label: "Expired" }]} />
            <button onClick={() => { setSearch(""); setStatusFilter("all"); setUserFilter("all"); setLicenseFilter("all"); }} className="flex items-center gap-2 rounded-[12px] text-[13px] font-medium cursor-pointer" style={{ background: "var(--bg-surface)", border: `1px solid ${activeFilters ? C.cyan : "var(--border-clr)"}`, padding: "11px 14px", color: activeFilters ? C.cyan : "var(--text-primary)" }}>
              <SlidersHorizontal size={15} />Filters{activeFilters ? <span className="flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ minWidth: 17, height: 17, background: C.cyan }}>{activeFilters}</span> : null}
            </button>
            <div className="flex rounded-[12px] overflow-hidden" style={{ border: "1px solid var(--border-clr)" }}>
              {([["list", List], ["grid", LayoutGrid]] as const).map(([v, Icon]) => (
                <button key={v} onClick={() => setView(v)} className="flex items-center justify-center cursor-pointer border-none" style={{ width: 42, height: 42, background: view === v ? "linear-gradient(135deg,#22D3EE,#3B82F6)" : "var(--bg-surface)", color: view === v ? "#fff" : "var(--text-muted)" }}><Icon size={17} /></button>
              ))}
            </div>
          </div>

          {view === "list" ? (
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 880 }}>
                  <thead>
                    <tr className="text-[11px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: 0.4, borderBottom: "1px solid var(--border-clr)" }}>
                      <th className="px-4 py-[13px] w-[40px]"><Check checked={allPageSel} onChange={toggleAll} /></th>
                      <th className="text-left font-semibold px-3 py-[13px]">Device ID</th>
                      <th className="text-left font-semibold px-3 py-[13px]">Assigned User</th>
                      <th className="text-left font-semibold px-3 py-[13px]">License Key</th>
                      <th className="text-left font-semibold px-3 py-[13px]">Status</th>
                      <th className="text-left font-semibold px-3 py-[13px]">Battery</th>
                      <th className="text-left font-semibold px-3 py-[13px]">Last Seen</th>
                      <th className="text-left font-semibold px-3 py-[13px]">Paired</th>
                      <th className="text-right font-semibold px-4 py-[13px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && !devices.length && Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--border-clr)" }}><td colSpan={9} className="px-4 py-4"><div className="h-6 rounded animate-pulse" style={{ background: "var(--bg-input)" }} /></td></tr>
                    ))}
                    {pageRows.map((d) => {
                      const st = classify(d); const meta = STATE_META[st]; const sel = selected.has(d.id);
                      return (
                        <tr key={d.id} className="cursor-pointer" onClick={() => router.push(`/devices/${d.id}`)} style={{ borderTop: "1px solid var(--border-clr)", background: sel ? "var(--hover-bg)" : "transparent" }}
                          onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = "var(--hover-bg)"; }} onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = "transparent"; }}>
                          <td className="px-4 py-[12px]"><Check checked={sel} onChange={() => toggleSel(d.id)} /></td>
                          <td className="px-3 py-[12px]">
                            <div className="flex items-center gap-[10px]">
                              {deviceThumb}
                              <div><div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{d.id}</div><div className="text-[11px]" style={{ color: "var(--text-muted)" }}>v{d.firmware}</div></div>
                            </div>
                          </td>
                          <td className="px-3 py-[12px]">
                            {d.userId && d.userName !== "Unassigned" ? (
                              <div className="flex items-center gap-[9px]">
                                <span className="flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ width: 30, height: 30, borderRadius: 9, background: gradFor(d.userId || d.id) }}>{initials(d.userName)}</span>
                                <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{d.userName}</span>
                              </div>
                            ) : <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>Unassigned</span>}
                          </td>
                          <td className="px-3 py-[12px]">{d.licenseKey ? <code className="text-[12px] rounded" style={{ color: C.cyan, background: "rgba(6,182,212,0.14)", padding: "3px 9px" }}>{d.licenseKey}</code> : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                          <td className="px-3 py-[12px]"><span className="inline-flex items-center gap-[6px] text-[13px] font-medium" style={{ color: meta.color }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />{meta.label}</span></td>
                          <td className="px-3 py-[12px]"><BatteryPill level={d.batteryLevel} /></td>
                          <td className="px-3 py-[12px]"><div className="text-[13px]" style={{ color: "var(--text-primary)" }}>{formatRelativeTime(d.lastSeen)}</div><div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{new Date(d.lastSeen).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div></td>
                          <td className="px-3 py-[12px]"><span className="inline-flex items-center rounded-[8px] text-[11px] font-semibold" style={{ padding: "4px 11px", background: d.isPaired ? "rgba(16,185,129,0.14)" : "var(--bg-input)", border: d.isPaired ? "none" : "1px solid var(--border-clr)", color: d.isPaired ? C.green : "var(--text-muted)" }}>{d.isPaired ? "Paired" : "Not Paired"}</span></td>
                          <td className="px-4 py-[12px]"><div className="flex justify-end"><RowActions device={d} onView={() => router.push(`/devices/${d.id}`)} onToggle={() => toggleDevice(d)} /></div></td>
                        </tr>
                      );
                    })}
                    {!isLoading && !pageRows.length && (
                      <tr><td colSpan={9}><div className="flex flex-col items-center justify-center text-center" style={{ padding: "56px 20px", color: "var(--text-muted)" }}><Smartphone size={30} className="mb-2 opacity-60" /><p className="text-[13px] m-0">No devices match your filters</p></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination rangeFrom={rangeFrom} rangeTo={rangeTo} total={filtered.length} noun="devices" curPage={curPage} totalPages={totalPages} setPage={setPage} />
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pageRows.map((d) => {
                  const st = classify(d); const meta = STATE_META[st];
                  return (
                    <div key={d.id} onClick={() => router.push(`/devices/${d.id}`)} className="rounded-2xl p-4 cursor-pointer" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = meta.color)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-clr)")}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-[10px]">{deviceThumb}<div><div className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>{d.id}</div><div className="text-[11px]" style={{ color: "var(--text-muted)" }}>v{d.firmware}</div></div></div>
                        <span className="inline-flex items-center gap-[6px] text-[12px] font-medium" style={{ color: meta.color }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.color }} />{meta.label}</span>
                      </div>
                      <div className="flex items-center justify-between text-[13px] mb-2"><span style={{ color: "var(--text-muted)" }}>User</span><span style={{ color: "var(--text-primary)" }}>{d.userName}</span></div>
                      <div className="flex items-center justify-between text-[13px] mb-2"><span style={{ color: "var(--text-muted)" }}>Battery</span><BatteryPill level={d.batteryLevel} /></div>
                      <div className="flex items-center justify-between text-[13px]"><span style={{ color: "var(--text-muted)" }}>License</span>{d.licenseKey ? <code className="text-[12px]" style={{ color: C.cyan }}>{d.licenseKey}</code> : <span style={{ color: "var(--text-muted)" }}>—</span>}</div>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-2xl mt-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
                <Pagination rangeFrom={rangeFrom} rangeTo={rangeTo} total={filtered.length} noun="devices" curPage={curPage} totalPages={totalPages} setPage={setPage} />
              </div>
            </div>
          )}
        </div>

        {/* Right: insight panels */}
        <div className="flex flex-col gap-5">
          <Panel title="Device Status Distribution">
            <div style={{ padding: "4px 18px 18px" }}>
              <Donut center={stats.total.toLocaleString()} label="Devices" segments={[
                { label: "Online", value: stats.counts.online, color: C.green },
                { label: "Offline", value: stats.counts.offline, color: C.pink },
                { label: "Inactive", value: stats.counts.inactive, color: C.amber },
                { label: "Not Activated", value: stats.counts.notActivated, color: C.purple },
              ]} />
            </div>
          </Panel>

          <Panel title="Hardware Versions" action={<span onClick={() => router.push("/devices")} className="text-[12px] font-semibold cursor-pointer" style={{ color: C.cyan }}>View All</span>}>
            <div className="flex flex-col gap-[14px]" style={{ padding: "4px 18px 18px" }}>
              {hardwareBreakdown.length ? hardwareBreakdown.slice(0, 5).map((h) => (
                <div key={h.name} className="flex items-center gap-3">
                  <span className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 9, background: `${h.color}22` }}><Shirt size={17} style={{ color: h.color }} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-[4px]">
                      <span className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{h.name}</span>
                      <span className="text-[12px] font-semibold" style={{ color: "var(--text-secondary)" }}>{h.pct}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 overflow-hidden rounded-full" style={{ height: 6, background: "var(--bg-input)" }}><div className="h-full rounded-full" style={{ width: `${h.pct}%`, background: h.color }} /></div>
                      <span className="text-[11px] whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{h.count} dev</span>
                    </div>
                  </div>
                </div>
              )) : <Empty text="No devices yet" />}
            </div>
          </Panel>

          <Panel title="Recent Device Activity" action={<span onClick={() => router.push("/devices")} className="text-[12px] font-semibold cursor-pointer" style={{ color: C.cyan }}>View All</span>}>
            <div className="flex flex-col" style={{ padding: "2px 18px 14px" }}>
              {recentActivity.length ? recentActivity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-[9px]" style={{ borderTop: i ? "1px solid var(--border-clr)" : "none" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, boxShadow: `0 0 6px ${a.color}`, flexShrink: 0 }} />
                  <span className="flex-1 text-[13px]" style={{ color: "var(--text-secondary)" }}><span className="font-semibold" style={{ color: "var(--text-primary)" }}>{a.id}</span> {a.text}</span>
                  <span className="text-[11px] whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{formatRelativeTime(a.time)}</span>
                </div>
              )) : <Empty text="No recent activity" />}
            </div>
          </Panel>
        </div>
      </div>

      {/* Single register modal */}
      <Modal open={showRegister} title="Register New Device" onClose={resetRegister}>
        {regResult ? (
          <div className="text-center py-5">
            <div className="inline-flex items-center justify-center mb-4" style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(16,185,129,0.12)" }}><CheckCircle2 size={24} color="#10B981" /></div>
            <h3 className="text-[17px] font-bold mb-2" style={{ color: "var(--text-primary)" }}>Device Registered</h3>
            <p className="text-[13px] mb-3" style={{ color: "var(--text-secondary)" }}><strong style={{ color: "var(--text-primary)" }}>{regResult.id}</strong> has been added.</p>
            {regResult.license && (
              <div className="flex items-center justify-between rounded-[10px] mb-5" style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)", padding: "12px 16px" }}>
                <div className="flex items-center gap-2 text-left"><Key size={14} style={{ color: "#06B6D4" }} /><div><div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Auto-generated License</div><code className="text-sm font-bold" style={{ color: "#06B6D4", letterSpacing: 1 }}>{regResult.license.licenseKey}</code></div></div>
                <button onClick={() => regResult.license && navigator.clipboard?.writeText(regResult.license.licenseKey)} className="bg-transparent border-none cursor-pointer p-1" title="Copy license key"><Clipboard size={16} style={{ color: "var(--text-muted)" }} /></button>
              </div>
            )}
            <Btn onClick={resetRegister}>Done</Btn>
          </div>
        ) : (
          <>
            {regError && <div className="flex items-center gap-2 rounded-[10px] px-[14px] py-[10px] mb-4 text-[13px]" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}><AlertCircle size={14} />{regError}</div>}
            <div className="rounded-[10px] mb-5 text-[13px] flex items-start gap-2" style={{ padding: "12px 14px", background: "rgba(6,182,212,0.15)", color: "var(--text-secondary)" }}><Info size={14} color="#06B6D4" className="shrink-0 mt-[1px]" /><span>A license key is generated automatically when the device is registered. Format: ECG-NNNN or ECG-NNNNN.</span></div>
            <InputField label="Device ID" icon={Hash} value={regDeviceId} onChange={setRegDeviceId} placeholder="e.g. ECG-02032" />
            <InputField label="Hardware Version" icon={Cpu} value={regHwVersion} onChange={setRegHwVersion} placeholder="e.g. HW-2.0" />
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-[6px] uppercase" style={{ color: "var(--text-secondary)", letterSpacing: 0.5 }}>Client</label>
              <div className="flex items-center gap-2 rounded-[10px]" style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)", padding: "10px 14px" }}><Package size={16} style={{ color: "var(--text-muted)" }} /><span className="text-sm" style={{ color: "var(--text-secondary)" }}>CLIENT-001</span></div>
            </div>
            <div className="flex gap-[10px] justify-end mt-2"><Btn onClick={resetRegister} variant="ghost">Cancel</Btn><Btn onClick={handleRegister} disabled={!regDeviceId || regLoading}>{regLoading ? <><RefreshCw size={14} className="animate-spin-slow" />Registering...</> : <><Plus size={14} />Register</>}</Btn></div>
          </>
        )}
      </Modal>

      {/* Bulk create modal */}
      <Modal open={showBulk} title="Bulk Create Devices" onClose={resetBulk}>
        {bulkResult ? (
          <div>
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center mb-3" style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(16,185,129,0.12)" }}><CheckCircle2 size={24} color="#10B981" /></div>
              <h3 className="text-[17px] font-bold mb-1" style={{ color: "var(--text-primary)" }}>{bulkResult.created} Devices Created</h3>
              <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Range: <strong style={{ color: "var(--text-primary)" }}>{bulkResult.range.first}</strong> → <strong style={{ color: "var(--text-primary)" }}>{bulkResult.range.last}</strong></p>
            </div>
            <div className="rounded-[10px] mb-4 overflow-auto" style={{ maxHeight: 260, border: "1px solid var(--border-clr)", background: "var(--bg-input)" }}>
              <table className="w-full text-[12px]">
                <thead><tr style={{ background: "rgba(6,182,212,0.08)" }}><th className="text-left px-3 py-2" style={{ color: "var(--text-muted)" }}>Device ID</th><th className="text-left px-3 py-2" style={{ color: "var(--text-muted)" }}>License Key</th><th className="text-left px-3 py-2" style={{ color: "var(--text-muted)" }}>Expires</th></tr></thead>
                <tbody>{bulkResult.devices.map((d) => (<tr key={d.id} style={{ borderTop: "1px solid var(--border-clr)" }}><td className="px-3 py-2" style={{ color: "var(--text-primary)" }}>{d.id}</td><td className="px-3 py-2"><code style={{ color: "#06B6D4" }}>{d.license.licenseKey}</code></td><td className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>{d.license.expiryDate}</td></tr>))}</tbody>
              </table>
            </div>
            <div className="flex gap-[10px] justify-end">
              <Btn variant="ghost" onClick={() => { const csv = ["deviceId,licenseKey,expiryDate", ...bulkResult.devices.map((d) => `${d.id},${d.license.licenseKey},${d.license.expiryDate}`)].join("\n"); const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `devices_${bulkResult.range.first}_${bulkResult.range.last}.csv`; a.click(); URL.revokeObjectURL(url); }}><Download size={14} />Download CSV</Btn>
              <Btn onClick={resetBulk}>Done</Btn>
            </div>
          </div>
        ) : (
          <>
            {bulkError && <div className="flex items-center gap-2 rounded-[10px] px-[14px] py-[10px] mb-4 text-[13px]" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}><AlertCircle size={14} />{bulkError}</div>}
            <div className="rounded-[10px] mb-5 text-[13px] flex items-start gap-2" style={{ padding: "12px 14px", background: "rgba(6,182,212,0.15)", color: "var(--text-secondary)" }}><Info size={14} color="#06B6D4" className="shrink-0 mt-[1px]" /><span>Creates N devices with sequential IDs, continuing from the last existing number. Each device gets a unique auto-generated license with a 1-year expiry.</span></div>
            <InputField label="Number of Devices (1–500)" icon={Layers} value={bulkCount} onChange={setBulkCount} placeholder="e.g. 20" />
            <InputField label="Firmware" icon={Cpu} value={bulkFirmware} onChange={setBulkFirmware} placeholder="1.0.0" />
            <InputField label="Hardware Version" icon={Cpu} value={bulkHw} onChange={setBulkHw} placeholder="HW-2.0" />
            <div className="flex gap-[10px] justify-end mt-2"><Btn onClick={resetBulk} variant="ghost">Cancel</Btn><Btn onClick={handleBulk} disabled={!bulkCount || bulkLoading}>{bulkLoading ? <><RefreshCw size={14} className="animate-spin-slow" />Creating...</> : <><Layers size={14} />Create {bulkCount} devices</>}</Btn></div>
          </>
        )}
      </Modal>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
      <div className="flex items-center justify-between" style={{ padding: "16px 18px 8px" }}>
        <h3 className="text-[15px] font-semibold m-0" style={{ color: "var(--text-primary)" }}>{title}</h3>{action}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex flex-col items-center justify-center text-center" style={{ padding: "28px 20px", color: "var(--text-muted)" }}><Activity size={24} className="mb-2 opacity-60" /><p className="text-[13px] m-0">{text}</p></div>;
}

function Pagination({ rangeFrom, rangeTo, total, noun, curPage, totalPages, setPage }: { rangeFrom: number; rangeTo: number; total: number; noun: string; curPage: number; totalPages: number; setPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4" style={{ borderTop: "1px solid var(--border-clr)" }}>
      <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>Showing {rangeFrom}–{rangeTo} of {total} {noun}</span>
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
