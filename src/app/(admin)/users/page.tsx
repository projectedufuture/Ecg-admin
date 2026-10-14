"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Download, Upload, AlertCircle, RefreshCw, UserPlus, User as UserIcon,
  Mail, Radio, CheckCircle2, Info, Clipboard, Search, ChevronDown,
  SlidersHorizontal, Calendar, MapPin, Users as UsersIcon, UserCheck,
  UserX, UserPlus2, MoreVertical, Eye, Ban, ArrowUp, ArrowDown, X,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import InputField from "@/components/ui/InputField";
import { useUsers, useDevices } from "@/lib/hooks";
import { api, downloadExport } from "@/lib/api";
import { User } from "@/types";

const C = { blue: "#3B82F6", cyan: "#06B6D4", purple: "#8B5CF6", green: "#10B981", amber: "#F59E0B", pink: "#F43F5E", slate: "#94A3B8" };
const PAGE_SIZE = 10;

interface CreateUserResponse {
  success: boolean;
  data: {
    id: string; name: string; email: string; deviceId: string | null;
    mustChangePassword: boolean;
    assignedDevice: { id: string; firmware: string; licenseKey: string | null } | null;
    emailSent: boolean;
  };
  debug?: { tempPassword?: string; emailError?: string };
}

// ── mini area sparkline ──────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 150, H = 50;
  if (data.length < 2) return <div style={{ width: W, height: H }} />;
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * W, H - 5 - ((v - min) / rng) * (H - 10)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const uid = color.replace("#", "");
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`us-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${W},${H} L0,${H} Z`} fill={`url(#us-${uid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ icon: Icon, label, value, trend, trendLabel, color, spark }: {
  icon: React.ElementType; label: string; value: string; trend?: number | null;
  trendLabel: string; color: string; spark: number[];
}) {
  const up = (trend ?? 0) >= 0;
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-[10px] mb-3">
            <div className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: 12, background: `${color}22` }}>
              <Icon size={20} style={{ color }} />
            </div>
            <span className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
          </div>
          <div className="text-[30px] font-bold leading-none" style={{ color: "var(--text-primary)", letterSpacing: -0.5 }}>{value}</div>
          {trend != null ? (
            <div className="flex items-center gap-[5px] mt-2 text-[12px] font-semibold" style={{ color: up ? C.green : C.pink }}>
              {up ? <ArrowUp size={13} /> : <ArrowDown size={13} />}{Math.abs(trend)}%
              <span className="font-normal" style={{ color: "var(--text-muted)" }}>{trendLabel}</span>
            </div>
          ) : (
            <div className="mt-2 text-[12px]" style={{ color: "var(--text-muted)" }}>{trendLabel}</div>
          )}
        </div>
        <div className="shrink-0 self-center"><Sparkline data={spark} color={color} /></div>
      </div>
    </div>
  );
}

// ── dropdown ─────────────────────────────────────────────────────
function Dropdown({ icon: Icon, value, options, onChange, width = 160 }: {
  icon?: React.ElementType; value: string; options: { value: string; label: string }[];
  onChange: (v: string) => void; width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const current = options.find((o) => o.value === value);
  return (
    <div className="relative" ref={ref} style={{ width }}>
      <button onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full rounded-[12px] text-[13px] font-medium cursor-pointer"
        style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)", padding: "11px 14px", color: "var(--text-primary)" }}>
        {Icon && <Icon size={16} style={{ color: "var(--text-muted)" }} />}
        <span className="flex-1 text-left truncate">{current?.label ?? value}</span>
        <ChevronDown size={15} style={{ color: "var(--text-muted)" }} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-1 rounded-[12px] overflow-hidden z-30 py-1"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", boxShadow: "0 16px 40px rgba(0,0,0,0.28)" }}>
          {options.map((o) => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              className="flex items-center justify-between w-full text-left px-3 py-[9px] text-[13px] border-none bg-transparent cursor-pointer"
              style={{ color: o.value === value ? C.cyan : "var(--text-secondary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              {o.label}{o.value === value && <CheckCircle2 size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── per-row actions ──────────────────────────────────────────────
function RowActions({ user, onView, onToggle }: { user: User; onView: () => void; onToggle: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const active = user.status === "active";
  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="flex items-center justify-center rounded-lg border-none cursor-pointer"
        style={{ width: 30, height: 30, background: "transparent", color: "var(--text-muted)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
        <MoreVertical size={17} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 rounded-[12px] overflow-hidden z-30 py-1" style={{ width: 170, background: "var(--bg-surface)", border: "1px solid var(--border-clr)", boxShadow: "0 16px 40px rgba(0,0,0,0.28)" }}>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onView(); }}
            className="flex items-center gap-2 w-full text-left px-3 py-[9px] text-[13px] border-none bg-transparent cursor-pointer" style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <Eye size={15} /> View details
          </button>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onToggle(); }}
            className="flex items-center gap-2 w-full text-left px-3 py-[9px] text-[13px] border-none bg-transparent cursor-pointer" style={{ color: active ? C.pink : C.green }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            {active ? <Ban size={15} /> : <CheckCircle2 size={15} />} {active ? "Deactivate" : "Reactivate"}
          </button>
        </div>
      )}
    </div>
  );
}

const AVATAR_GRADS = [
  "linear-gradient(135deg,#22D3EE,#3B82F6)", "linear-gradient(135deg,#8B5CF6,#EC4899)",
  "linear-gradient(135deg,#10B981,#06B6D4)", "linear-gradient(135deg,#F59E0B,#F43F5E)",
  "linear-gradient(135deg,#6366F1,#8B5CF6)",
];
function gradFor(id: string) { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % AVATAR_GRADS.length; return AVATAR_GRADS[h]; }
function initials(name: string) { return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(); }
const fmtDate = (s: string) => new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const fmtTime = (s: string) => new Date(s).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

function monthBuckets(users: User[], months = 8) {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) { const dt = new Date(now.getFullYear(), now.getMonth() - i, 1); keys.push(`${dt.getFullYear()}-${dt.getMonth()}`); }
  const base = () => Object.fromEntries(keys.map((k) => [k, 0])) as Record<string, number>;
  const all = base(), active = base(), inactive = base();
  users.forEach((u) => {
    const dt = new Date(u.registeredDate); const k = `${dt.getFullYear()}-${dt.getMonth()}`;
    if (k in all) { all[k]++; (u.status === "active" ? active : inactive)[k]++; }
  });
  // cumulative total
  let run = 0; const cumulative = keys.map((k) => (run += all[k]));
  return { keys, all: keys.map((k) => all[k]), active: keys.map((k) => active[k]), inactive: keys.map((k) => inactive[k]), cumulative };
}

export default function UsersPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useUsers({ limit: 1000 });
  const { data: devicesData } = useDevices({ limit: 200 });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cDeviceId, setCDeviceId] = useState("");
  const [cLoading, setCLoading] = useState(false);
  const [cError, setCError] = useState("");
  const [cResult, setCResult] = useState<CreateUserResponse | null>(null);

  const users = (data?.items as unknown as User[]) ?? [];

  const stats = useMemo(() => {
    const now = new Date();
    const inMonth = (s: string, off = 0) => {
      const d = new Date(s); const t = new Date(now.getFullYear(), now.getMonth() - off, 1);
      return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth();
    };
    const total = users.length;
    const active = users.filter((u) => u.status === "active").length;
    const inactive = total - active;
    const newThis = users.filter((u) => inMonth(u.registeredDate)).length;
    const newPrev = users.filter((u) => inMonth(u.registeredDate, 1)).length;
    const newTrend = newPrev ? Math.round(((newThis - newPrev) / newPrev) * 100) : (newThis ? 100 : 0);
    const totalTrend = total - newThis > 0 ? Math.round((newThis / (total - newThis)) * 100) : 0;
    const b = monthBuckets(users);
    return {
      total, active, inactive, newThis, newTrend, totalTrend,
      spTotal: b.cumulative, spActive: b.active, spInactive: b.inactive, spNew: b.all,
      activeShare: total ? Math.round((active / total) * 100) : 0,
      inactiveShare: total ? Math.round((inactive / total) * 100) : 0,
    };
  }, [users]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (deviceFilter === "assigned" && !u.deviceId) return false;
      if (deviceFilter === "unassigned" && u.deviceId) return false;
      if (dateFilter !== "all") {
        const age = (now - new Date(u.registeredDate).getTime()) / 86400000;
        if (dateFilter === "7d" && age > 7) return false;
        if (dateFilter === "30d" && age > 30) return false;
        if (dateFilter === "month") {
          const d = new Date(u.registeredDate); const t = new Date();
          if (d.getMonth() !== t.getMonth() || d.getFullYear() !== t.getFullYear()) return false;
        }
      }
      if (q) {
        const hay = `${u.name} ${u.email} ${u.deviceId ?? ""} ${u.lastLocation?.address ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, search, statusFilter, deviceFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, statusFilter, deviceFilter, dateFilter]);

  const activeFilters = [statusFilter !== "all", deviceFilter !== "all", dateFilter !== "all", !!search].filter(Boolean).length;

  const allDevices = (devicesData?.items as unknown as Array<{ id: string; userId: string | null }>) ?? [];
  const unassignedDevices = allDevices.filter((dv) => !dv.userId);

  const resetCreate = () => { setShowCreate(false); setCName(""); setCEmail(""); setCDeviceId(""); setCError(""); setCResult(null); };

  const handleCreate = async () => {
    if (!cName || !cEmail) return;
    setCLoading(true); setCError("");
    try {
      const body: { name: string; email: string; deviceId?: string } = { name: cName, email: cEmail };
      if (cDeviceId.trim()) body.deviceId = cDeviceId.trim();
      const resp = (await api.post("/admin/users", body)) as CreateUserResponse;
      setCResult(resp); await mutate();
    } catch (err: unknown) {
      setCError(err instanceof Error ? err.message : "Failed to create user");
    }
    setCLoading(false);
  };

  const toggleUser = async (u: User) => {
    const action = u.status === "active" ? "deactivate" : "reactivate";
    try { await api.put(`/admin/users/${u.id}/${action}`); await mutate(); }
    catch (err: unknown) { setNotice(err instanceof Error ? err.message : "Action failed"); }
  };

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto mb-4" style={{ color: C.pink }} />
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Failed to load users</p>
        <Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn>
      </div>
    );
  }

  const rangeFrom = filtered.length ? (curPage - 1) * PAGE_SIZE + 1 : 0;
  const rangeTo = Math.min(curPage * PAGE_SIZE, filtered.length);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-bold m-0" style={{ color: "var(--text-primary)" }}>Users</h1>
          <p className="text-[14px] mt-1" style={{ color: "var(--text-muted)" }}>Manage end-consumer accounts · email onboarding</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setNotice("Bulk user import isn't available on the backend yet.")}
            className="flex items-center gap-2 rounded-[12px] text-[13px] font-semibold cursor-pointer"
            style={{ padding: "10px 16px", background: "var(--bg-surface)", border: "1px solid var(--border-clr)", color: "var(--text-primary)" }}>
            <Upload size={15} />Import Users
          </button>
          <button onClick={() => downloadExport("users")}
            className="flex items-center gap-2 rounded-[12px] text-[13px] font-semibold cursor-pointer"
            style={{ padding: "10px 16px", background: "var(--bg-surface)", border: "1px solid var(--border-clr)", color: "var(--text-primary)" }}>
            <Download size={15} />Export CSV
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-[12px] text-[13px] font-semibold text-white cursor-pointer border-none"
            style={{ padding: "10px 18px", background: "linear-gradient(135deg,#22D3EE,#3B82F6)", boxShadow: "0 10px 24px rgba(59,130,246,0.30)" }}>
            <UserPlus size={15} />Create User
          </button>
        </div>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-2 rounded-[12px] px-4 py-3 mb-4 text-[13px]"
          style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)", color: "var(--text-secondary)" }}>
          <span className="flex items-center gap-2"><Info size={15} style={{ color: C.cyan }} />{notice}</span>
          <button onClick={() => setNotice("")} className="bg-transparent border-none cursor-pointer" style={{ color: "var(--text-muted)" }}><X size={15} /></button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard icon={UsersIcon} label="Total Users" value={stats.total.toLocaleString()} color={C.blue} trend={stats.totalTrend} trendLabel="vs last month" spark={stats.spTotal} />
        <StatCard icon={UserCheck} label="Active Users" value={stats.active.toLocaleString()} color={C.purple} trend={null} trendLabel={`${stats.activeShare}% of all users`} spark={stats.spActive} />
        <StatCard icon={UserX} label="Inactive Users" value={stats.inactive.toLocaleString()} color={C.pink} trend={null} trendLabel={`${stats.inactiveShare}% of all users`} spark={stats.spInactive} />
        <StatCard icon={UserPlus2} label="New This Month" value={stats.newThis.toLocaleString()} color={C.green} trend={stats.newTrend} trendLabel="vs last month" spark={stats.spNew} />
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-[10px] rounded-[12px] flex-1 min-w-[240px]" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", padding: "11px 14px" }}>
          <Search size={17} style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users by name, email, device, or location..."
            className="bg-transparent border-none outline-none flex-1 text-[14px] font-sans" style={{ color: "var(--text-primary)" }} />
        </div>
        <Dropdown value={statusFilter} onChange={setStatusFilter} width={150}
          options={[{ value: "all", label: "All Status" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
        <Dropdown value={deviceFilter} onChange={setDeviceFilter} width={160}
          options={[{ value: "all", label: "All Devices" }, { value: "assigned", label: "Has Device" }, { value: "unassigned", label: "No Device" }]} />
        <Dropdown icon={Calendar} value={dateFilter} onChange={setDateFilter} width={180}
          options={[{ value: "all", label: "Select Date Range" }, { value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }, { value: "month", label: "This month" }]} />
        <button onClick={() => { setSearch(""); setStatusFilter("all"); setDeviceFilter("all"); setDateFilter("all"); }}
          className="flex items-center gap-2 rounded-[12px] text-[13px] font-medium cursor-pointer"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", padding: "11px 16px", color: "var(--text-primary)" }}>
          <SlidersHorizontal size={15} style={{ color: "var(--text-muted)" }} />
          Filters{activeFilters ? <span className="flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ minWidth: 17, height: 17, background: C.cyan }}>{activeFilters}</span> : null}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 960 }}>
            <thead>
              <tr className="text-[11px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: 0.5, borderBottom: "1px solid var(--border-clr)" }}>
                <th className="text-left font-semibold px-5 py-[14px]">User</th>
                <th className="text-left font-semibold px-4 py-[14px]">Email</th>
                <th className="text-left font-semibold px-4 py-[14px]">Registered</th>
                <th className="text-left font-semibold px-4 py-[14px]">Last Active</th>
                <th className="text-left font-semibold px-4 py-[14px]">Sessions</th>
                <th className="text-left font-semibold px-4 py-[14px]">Device</th>
                <th className="text-left font-semibold px-4 py-[14px]">Location</th>
                <th className="text-left font-semibold px-4 py-[14px]">Status</th>
                <th className="text-right font-semibold px-5 py-[14px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && !users.length && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border-clr)" }}>
                  <td colSpan={9} className="px-5 py-4"><div className="h-6 rounded animate-pulse" style={{ background: "var(--bg-input)" }} /></td>
                </tr>
              ))}
              {pageRows.map((u) => {
                const active = u.status === "active";
                const loc = u.lastLocation;
                const ageDays = (Date.now() - new Date(u.lastActive).getTime()) / 86400000;
                const dotColor = !active ? C.slate : ageDays < 7 ? C.green : ageDays < 30 ? C.amber : C.pink;
                return (
                  <tr key={u.id} className="cursor-pointer" onClick={() => router.push(`/users/${u.id}`)}
                    style={{ borderTop: "1px solid var(--border-clr)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td className="px-5 py-[13px]">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center text-[12px] font-bold text-white shrink-0" style={{ width: 34, height: 34, borderRadius: 10, background: gradFor(u.id) }}>{initials(u.name)}</span>
                        <span className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-[13px] text-[13px]" style={{ color: "var(--text-secondary)" }}>{u.email}</td>
                    <td className="px-4 py-[13px]">
                      <div className="text-[13px]" style={{ color: "var(--text-primary)" }}>{fmtDate(u.registeredDate)}</div>
                      <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{fmtTime(u.registeredDate)}</div>
                    </td>
                    <td className="px-4 py-[13px]">
                      <div className="flex items-center gap-[7px]">
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
                        <div>
                          <div className="text-[13px]" style={{ color: "var(--text-primary)" }}>{fmtDate(u.lastActive)}</div>
                          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{fmtTime(u.lastActive)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-[13px] text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>{u.sessions}</td>
                    <td className="px-4 py-[13px]">
                      {u.deviceId
                        ? <code className="text-[12px] rounded" style={{ color: C.cyan, background: "rgba(6,182,212,0.14)", padding: "2px 8px" }}>{u.deviceId}</code>
                        : <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td className="px-4 py-[13px]">
                      {!active ? (
                        <span className="inline-flex items-center rounded-[8px] text-[11px] font-semibold" style={{ padding: "3px 10px", background: "var(--bg-input)", border: "1px solid var(--border-clr)", color: "var(--text-muted)" }}>Not Activated</span>
                      ) : loc && loc.lat != null && loc.lng != null ? (
                        <a href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[13px]" style={{ color: "var(--text-secondary)", textDecoration: "none" }} title={`${loc.lat}, ${loc.lng}`}>
                          <MapPin size={13} style={{ color: C.cyan }} />{loc.address || `${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}`}
                        </a>
                      ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td className="px-4 py-[13px]">
                      <span className="inline-flex items-center gap-[5px] rounded-full text-[11px] font-semibold" style={{ padding: "4px 11px", background: active ? "rgba(16,185,129,0.14)" : "rgba(244,63,94,0.14)", color: active ? C.green : C.pink }}>
                        {active ? <CheckCircle2 size={12} /> : <Ban size={12} />}{active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-[13px]">
                      <div className="flex justify-end">
                        <RowActions user={u} onView={() => router.push(`/users/${u.id}`)} onToggle={() => toggleUser(u)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && !pageRows.length && (
                <tr><td colSpan={9}>
                  <div className="flex flex-col items-center justify-center text-center" style={{ padding: "56px 20px", color: "var(--text-muted)" }}>
                    <UsersIcon size={30} className="mb-2 opacity-60" />
                    <p className="text-[13px] m-0">No users match your filters</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4" style={{ borderTop: "1px solid var(--border-clr)" }}>
          <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            Showing {rangeFrom}–{rangeTo} of {filtered.length} users
          </span>
          <div className="flex items-center gap-[6px]">
            <PageBtn disabled={curPage <= 1} onClick={() => setPage(curPage - 1)}><ChevronLeft size={16} /></PageBtn>
            {Array.from({ length: totalPages }).map((_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - curPage) <= 1).map((p, idx, arr) => (
              <span key={p} className="flex items-center">
                {idx > 0 && p - arr[idx - 1] > 1 && <span className="px-1 text-[13px]" style={{ color: "var(--text-muted)" }}>…</span>}
                <button onClick={() => setPage(p)} className="rounded-[9px] text-[13px] font-semibold cursor-pointer border-none"
                  style={{ minWidth: 34, height: 34, background: p === curPage ? "linear-gradient(135deg,#22D3EE,#3B82F6)" : "var(--bg-input)", color: p === curPage ? "#fff" : "var(--text-secondary)" }}>{p}</button>
              </span>
            ))}
            <PageBtn disabled={curPage >= totalPages} onClick={() => setPage(curPage + 1)}><ChevronRight size={16} /></PageBtn>
          </div>
        </div>
      </div>

      {/* Create User modal (unchanged behaviour) */}
      <Modal open={showCreate} title="Create New User" onClose={resetCreate}>
        {cResult ? (
          <div>
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center mb-3" style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(16,185,129,0.12)" }}>
                <CheckCircle2 size={24} color="#10B981" />
              </div>
              <h3 className="text-[17px] font-bold mb-1" style={{ color: "var(--text-primary)" }}>User Created</h3>
              <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                <strong style={{ color: "var(--text-primary)" }}>{cResult.data.name}</strong> ({cResult.data.email})
              </p>
            </div>
            <div className="rounded-[10px] mb-4 p-3" style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)" }}>
              <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Summary</div>
              <div className="text-[13px] space-y-1" style={{ color: "var(--text-secondary)" }}>
                <div><strong style={{ color: "var(--text-primary)" }}>User ID:</strong> <code style={{ color: "#06B6D4" }}>{cResult.data.id}</code></div>
                {cResult.data.assignedDevice && (
                  <>
                    <div><strong style={{ color: "var(--text-primary)" }}>Device:</strong> <code style={{ color: "#06B6D4" }}>{cResult.data.assignedDevice.id}</code></div>
                    {cResult.data.assignedDevice.licenseKey && (
                      <div><strong style={{ color: "var(--text-primary)" }}>License Key:</strong> <code style={{ color: "#06B6D4" }}>{cResult.data.assignedDevice.licenseKey}</code></div>
                    )}
                  </>
                )}
                <div><strong style={{ color: "var(--text-primary)" }}>Credentials email:</strong> {cResult.data.emailSent ? <span style={{ color: "#10B981" }}>sent ✓</span> : <span style={{ color: "#F59E0B" }}>not sent</span>}</div>
                <div><strong style={{ color: "var(--text-primary)" }}>First login:</strong> <span style={{ color: "#F59E0B" }}>user must change password</span></div>
              </div>
            </div>
            {cResult.debug?.tempPassword && (
              <div className="rounded-[10px] mb-4 p-3" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
                <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "#F59E0B" }}>Temporary password (dev-only)</div>
                <div className="flex items-center justify-between">
                  <code className="text-sm font-bold" style={{ color: "var(--text-primary)", letterSpacing: 1 }}>{cResult.debug.tempPassword}</code>
                  <button onClick={() => cResult.debug?.tempPassword && navigator.clipboard?.writeText(cResult.debug.tempPassword)} className="bg-transparent border-none cursor-pointer p-1" title="Copy"><Clipboard size={16} style={{ color: "var(--text-muted)" }} /></button>
                </div>
                {cResult.debug.emailError && <div className="text-[11px] mt-2" style={{ color: "#EF4444" }}>Email error: {cResult.debug.emailError}</div>}
              </div>
            )}
            <div className="flex gap-[10px] justify-end">
              <Btn variant="ghost" onClick={() => { setCResult(null); setCName(""); setCEmail(""); setCDeviceId(""); }}>Create Another</Btn>
              <Btn onClick={resetCreate}>Done</Btn>
            </div>
          </div>
        ) : (
          <>
            {cError && (
              <div className="flex items-center gap-2 rounded-[10px] px-[14px] py-[10px] mb-4 text-[13px]" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}>
                <AlertCircle size={14} />{cError}
              </div>
            )}
            <div className="rounded-[10px] mb-5 text-[13px] flex items-start gap-2" style={{ padding: "12px 14px", background: "rgba(6,182,212,0.15)", color: "var(--text-secondary)" }}>
              <Info size={14} color="#06B6D4" className="shrink-0 mt-[1px]" />
              <span>A random password is generated and emailed to the user along with their credentials and (if assigned) device + license key. The user will be required to change their password on first login.</span>
            </div>
            <InputField label="Name" icon={UserIcon} value={cName} onChange={setCName} placeholder="e.g. Arjun Reddy" />
            <InputField label="Email" icon={Mail} value={cEmail} onChange={setCEmail} placeholder="user@example.com" />
            <InputField label="Assign Device (optional)" icon={Radio} value={cDeviceId} onChange={setCDeviceId} placeholder="ECG-NNNNN — leave empty to create without device" />
            {unassignedDevices.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs font-semibold mb-[6px] uppercase" style={{ color: "var(--text-secondary)", letterSpacing: 0.5 }}>Unassigned Devices</label>
                <div className="flex flex-wrap gap-[6px]">
                  {unassignedDevices.slice(0, 10).map((dv) => (
                    <button key={dv.id} onClick={() => setCDeviceId(dv.id)} className="rounded-lg text-xs font-medium font-sans"
                      style={{ background: cDeviceId === dv.id ? "rgba(6,182,212,0.15)" : "var(--bg-input)", border: cDeviceId === dv.id ? "1px solid rgba(6,182,212,0.38)" : "1px solid var(--border-clr)", padding: "6px 12px", color: cDeviceId === dv.id ? "#06B6D4" : "var(--text-secondary)", cursor: "pointer" }}>
                      {dv.id}
                    </button>
                  ))}
                  {unassignedDevices.length > 10 && <span className="text-xs" style={{ color: "var(--text-muted)" }}>+{unassignedDevices.length - 10} more</span>}
                </div>
              </div>
            )}
            <div className="flex gap-[10px] justify-end mt-2">
              <Btn onClick={resetCreate} variant="ghost">Cancel</Btn>
              <Btn onClick={handleCreate} disabled={!cName || !cEmail || cLoading}>
                {cLoading ? <><RefreshCw size={14} className="animate-spin-slow" />Creating...</> : <><UserPlus size={14} />Create User</>}
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function PageBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex items-center justify-center rounded-[9px] border-none"
      style={{ width: 34, height: 34, background: "var(--bg-input)", color: "var(--text-secondary)", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1 }}>
      {children}
    </button>
  );
}
