"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ChevronDown, SlidersHorizontal, Download, Upload, Plus, Box, ShieldCheck,
  XCircle, Clock, Shirt, MoreVertical, Power, Clipboard, ArrowUp, ArrowDown,
  AlertCircle, RefreshCw, Info, X, Calendar, CheckCircle2, ChevronLeft, ChevronRight,
} from "lucide-react";
import Btn from "@/components/ui/Btn";
import { useLicenses } from "@/lib/hooks";
import { api, downloadExport } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { License } from "@/types";

const C = { blue: "#3B82F6", cyan: "#06B6D4", purple: "#8B5CF6", green: "#10B981", amber: "#F59E0B", pink: "#F43F5E", slate: "#94A3B8" };
const PAGE_SIZE = 8;

const STATUS_META: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: C.green },
  expired: { label: "Expired", color: C.amber },
  inactive: { label: "Inactive", color: C.pink },
};

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
      <defs><linearGradient id={`ls-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.32" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${W},${H} L0,${H} Z`} fill={`url(#ls-${uid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
        <div className="self-center"><Sparkline data={spark} color={color} /></div>
      </div>
    </div>
  );
}

function Dropdown({ icon: Icon, value, options, onChange, width = 160 }: { icon?: React.ElementType; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; width?: number }) {
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

function Check({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onChange(); }} className="flex items-center justify-center rounded-[6px] cursor-pointer shrink-0"
      style={{ width: 18, height: 18, background: checked ? "linear-gradient(135deg,#22D3EE,#3B82F6)" : "var(--bg-input)", border: checked ? "none" : "1px solid var(--border-clr)" }}>
      {checked && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5 L5 9 L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </button>
  );
}

function RowMenu({ license, onCopy, onToggle }: { license: License; onCopy: () => void; onToggle: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const active = license.status === "active";
  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} className="flex items-center justify-center rounded-lg border-none cursor-pointer" style={{ width: 30, height: 30, background: "transparent", color: "var(--text-muted)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}><MoreVertical size={17} /></button>
      {open && (
        <div className="absolute right-0 mt-1 rounded-[12px] overflow-hidden z-30 py-1" style={{ width: 170, background: "var(--bg-surface)", border: "1px solid var(--border-clr)", boxShadow: "0 16px 40px rgba(0,0,0,0.28)" }}>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onCopy(); }} className="flex items-center gap-2 w-full text-left px-3 py-[9px] text-[13px] border-none bg-transparent cursor-pointer" style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}><Clipboard size={15} /> Copy key</button>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onToggle(); }} className="flex items-center gap-2 w-full text-left px-3 py-[9px] text-[13px] border-none bg-transparent cursor-pointer" style={{ color: active ? C.pink : C.green }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}><Power size={15} /> {active ? "Deactivate" : "Activate"}</button>
        </div>
      )}
    </div>
  );
}

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");
const fmtTime = (s?: string) => (s ? new Date(s).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "");

function monthBuckets(dates: string[], pred?: (i: number) => boolean) {
  const now = new Date(); const keys: string[] = [];
  for (let i = 7; i >= 0; i--) { const dt = new Date(now.getFullYear(), now.getMonth() - i, 1); keys.push(`${dt.getFullYear()}-${dt.getMonth()}`); }
  const b = Object.fromEntries(keys.map((k) => [k, 0])) as Record<string, number>;
  dates.forEach((s, i) => { if (pred && !pred(i)) return; if (!s) return; const dt = new Date(s); const k = `${dt.getFullYear()}-${dt.getMonth()}`; if (k in b) b[k]++; });
  let run = 0; return { monthly: keys.map((k) => b[k]), cumulative: keys.map((k) => (run += b[k])) };
}

export default function LicensesPage() {
  const router = useRouter();
  const { admin } = useAuth();
  const canManage = admin?.role === "super_admin";
  const { data, error, isLoading, mutate } = useLicenses({ limit: 1000 });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const licenses = (data?.items as unknown as License[]) ?? [];
  const total = (data?._pagination as { total?: number } | undefined)?.total ?? licenses.length;

  const stats = useMemo(() => {
    const created = licenses.map((l) => l.createdAt || l.activationDate);
    const st = licenses.map((l) => l.status);
    const active = st.filter((x) => x === "active").length;
    const inactive = st.filter((x) => x === "inactive").length;
    const expired = st.filter((x) => x === "expired").length;
    const b = monthBuckets(created);
    const bA = monthBuckets(created, (i) => st[i] === "active");
    const bI = monthBuckets(created, (i) => st[i] === "inactive");
    const bE = monthBuckets(created, (i) => st[i] === "expired");
    const trend = (m: number[]) => (m[6] ? Math.round(((m[7] - m[6]) / m[6]) * 100) : (m[7] ? 100 : 0));
    return {
      active, inactive, expired,
      spTotal: b.cumulative, spA: bA.cumulative, spI: bI.monthly, spE: bE.monthly,
      tTotal: trend(b.monthly), tA: trend(bA.monthly), tI: trend(bI.monthly), tE: trend(bE.monthly),
    };
  }, [licenses]);

  const deviceOptions = useMemo(() => {
    const set = Array.from(new Set(licenses.map((l) => l.deviceId).filter(Boolean))).slice(0, 40);
    return [{ value: "all", label: "All Devices" }, ...set.map((dv) => ({ value: dv, label: dv }))];
  }, [licenses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    return licenses.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (deviceFilter !== "all" && l.deviceId !== deviceFilter) return false;
      if (dateFilter !== "all") {
        const age = (now - new Date(l.createdAt || l.activationDate).getTime()) / 86400000;
        if (dateFilter === "7d" && age > 7) return false;
        if (dateFilter === "30d" && age > 30) return false;
        if (dateFilter === "expiringSoon") { const days = (new Date(l.expiryDate).getTime() - now) / 86400000; if (!(days >= 0 && days <= 30)) return false; }
      }
      if (q) { const hay = `${l.id} ${l.licenseKey} ${l.deviceId} ${l.clientId}`.toLowerCase(); if (!hay.includes(q)) return false; }
      return true;
    });
  }, [licenses, search, statusFilter, deviceFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, statusFilter, deviceFilter, dateFilter]);
  const activeFilters = [statusFilter, deviceFilter, dateFilter].filter((x) => x !== "all").length + (search ? 1 : 0);

  const pageIds = pageRows.map((l) => l.id);
  const allSel = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggleSel = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((s) => { const n = new Set(s); if (allSel) pageIds.forEach((id) => n.delete(id)); else pageIds.forEach((id) => n.add(id)); return n; });

  const toggleLicense = async (l: License) => {
    if (!canManage) { setNotice("Only super admins can change license status."); return; }
    const action = l.status === "active" ? "deactivate" : "activate";
    try { await api.put(`/admin/licenses/${l.id}/${action}`); await mutate(); }
    catch (err: unknown) { setNotice(err instanceof Error ? err.message : "Action failed"); }
  };

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto mb-4" style={{ color: C.pink }} />
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Failed to load licenses</p>
        <Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn>
      </div>
    );
  }

  const rangeFrom = filtered.length ? (curPage - 1) * PAGE_SIZE + 1 : 0;
  const rangeTo = Math.min(curPage * PAGE_SIZE, filtered.length);

  const deviceThumb = (
    <span className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,rgba(34,211,238,0.18),rgba(139,92,246,0.18))", border: "1px solid var(--border-clr)" }}>
      <Shirt size={16} style={{ color: C.cyan }} />
    </span>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-bold m-0" style={{ color: "var(--text-primary)" }}>Licenses</h1>
          <p className="text-[14px] mt-1" style={{ color: "var(--text-muted)" }}>Manage device licenses, view activation status, and control access</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setNotice("Licenses are issued automatically — bulk import isn't available on the backend.")} className="flex items-center gap-2 rounded-[12px] text-[13px] font-semibold cursor-pointer" style={{ padding: "10px 16px", background: "var(--bg-surface)", border: "1px solid var(--border-clr)", color: "var(--text-primary)" }}><Upload size={15} />Import</button>
          <button onClick={() => downloadExport("licenses")} className="flex items-center gap-2 rounded-[12px] text-[13px] font-semibold cursor-pointer" style={{ padding: "10px 16px", background: "var(--bg-surface)", border: "1px solid var(--border-clr)", color: "var(--text-primary)" }}><Download size={15} />Export CSV</button>
          <button onClick={() => setNotice("Licenses are auto-generated when you register a device. Go to Devices → Single or Bulk Register.")} className="flex items-center gap-2 rounded-[12px] text-[13px] font-semibold text-white cursor-pointer border-none" style={{ padding: "10px 18px", background: "linear-gradient(135deg,#22D3EE,#3B82F6)", boxShadow: "0 10px 24px rgba(59,130,246,0.30)" }}><Plus size={15} />Create License</button>
        </div>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-2 rounded-[12px] px-4 py-3 mb-4 text-[13px]" style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)", color: "var(--text-secondary)" }}>
          <span className="flex items-center gap-2"><Info size={15} style={{ color: C.cyan }} />{notice}</span>
          <button onClick={() => setNotice("")} className="bg-transparent border-none cursor-pointer" style={{ color: "var(--text-muted)" }}><X size={15} /></button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard icon={Box} label="Total Licenses" value={total.toLocaleString()} trend={stats.tTotal} color={C.blue} spark={stats.spTotal} delay={0} />
        <StatCard icon={ShieldCheck} label="Active Licenses" value={stats.active.toLocaleString()} trend={stats.tA} color={C.green} spark={stats.spA} delay={60} />
        <StatCard icon={XCircle} label="Inactive Licenses" value={stats.inactive.toLocaleString()} trend={stats.tI} color={C.pink} spark={stats.spI} delay={120} />
        <StatCard icon={Clock} label="Expired Licenses" value={stats.expired.toLocaleString()} trend={stats.tE} color={C.amber} spark={stats.spE} delay={180} />
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-[10px] rounded-[12px] flex-1 min-w-[240px]" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", padding: "11px 14px" }}>
          <Search size={17} style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by license ID, key, device, or user..." className="bg-transparent border-none outline-none flex-1 text-[14px] font-sans" style={{ color: "var(--text-primary)" }} />
        </div>
        <Dropdown value={statusFilter} onChange={setStatusFilter} width={150} options={[{ value: "all", label: "All Status" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "expired", label: "Expired" }]} />
        <Dropdown value={deviceFilter} onChange={setDeviceFilter} width={160} options={deviceOptions} />
        <Dropdown icon={Calendar} value={dateFilter} onChange={setDateFilter} width={180} options={[{ value: "all", label: "Select Date Range" }, { value: "7d", label: "Created last 7 days" }, { value: "30d", label: "Created last 30 days" }, { value: "expiringSoon", label: "Expiring ≤ 30 days" }]} />
        <button onClick={() => { setSearch(""); setStatusFilter("all"); setDeviceFilter("all"); setDateFilter("all"); }} className="flex items-center gap-2 rounded-[12px] text-[13px] font-medium cursor-pointer" style={{ background: "var(--bg-surface)", border: `1px solid ${activeFilters ? C.cyan : "var(--border-clr)"}`, padding: "11px 16px", color: activeFilters ? C.cyan : "var(--text-primary)" }}>
          <SlidersHorizontal size={15} />Filters{activeFilters ? <span className="flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ minWidth: 17, height: 17, background: C.cyan }}>{activeFilters}</span> : null}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 980 }}>
            <thead>
              <tr className="text-[11px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: 0.5, borderBottom: "1px solid var(--border-clr)" }}>
                <th className="px-5 py-[14px] w-[40px]"><Check checked={allSel} onChange={toggleAll} /></th>
                <th className="text-left font-semibold px-3 py-[14px]">License ID</th>
                <th className="text-left font-semibold px-3 py-[14px]">License Key</th>
                <th className="text-left font-semibold px-3 py-[14px]">Device</th>
                <th className="text-left font-semibold px-3 py-[14px]">Created Date</th>
                <th className="text-left font-semibold px-3 py-[14px]">Status</th>
                <th className="text-left font-semibold px-3 py-[14px]">Expiry Date</th>
                <th className="text-left font-semibold px-5 py-[14px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && !licenses.length && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border-clr)" }}><td colSpan={8} className="px-5 py-4"><div className="h-6 rounded animate-pulse" style={{ background: "var(--bg-input)" }} /></td></tr>
              ))}
              {pageRows.map((l, i) => {
                const meta = STATUS_META[l.status] ?? STATUS_META.inactive;
                const active = l.status === "active";
                const now = Date.now();
                const daysLeft = Math.ceil((new Date(l.expiryDate).getTime() - now) / 86400000);
                const isExpired = l.status === "expired" || daysLeft < 0;
                const sel = selected.has(l.id);
                return (
                  <tr key={l.id} className="animate-rise" style={{ borderTop: "1px solid var(--border-clr)", background: sel ? "var(--hover-bg)" : "transparent", animationDelay: `${i * 30}ms` }}
                    onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = "var(--hover-bg)"; }} onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = "transparent"; }}>
                    <td className="px-5 py-[13px]"><Check checked={sel} onChange={() => toggleSel(l.id)} /></td>
                    <td className="px-3 py-[13px] text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{l.id}</td>
                    <td className="px-3 py-[13px]"><code className="text-[12px] rounded tracking-wider" style={{ color: C.cyan, background: "rgba(6,182,212,0.14)", padding: "3px 9px" }}>{l.licenseKey}</code></td>
                    <td className="px-3 py-[13px]"><div className="flex items-center gap-[9px]">{deviceThumb}<span className="text-[13px]" style={{ color: "var(--text-primary)" }}>{l.deviceId || "—"}</span></div></td>
                    <td className="px-3 py-[13px]"><div className="text-[13px]" style={{ color: "var(--text-primary)" }}>{fmtDate(l.createdAt || l.activationDate)}</div><div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{fmtTime(l.createdAt || l.activationDate)}</div></td>
                    <td className="px-3 py-[13px]">
                      <span className="inline-flex items-center gap-[6px] rounded-full text-[12px] font-semibold" style={{ padding: "4px 11px", background: `${meta.color}1f`, color: meta.color }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />{meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-[13px]">
                      <div className="text-[13px]" style={{ color: "var(--text-primary)" }}>{fmtDate(l.expiryDate)}</div>
                      <div className="text-[11px]" style={{ color: isExpired ? C.pink : "var(--text-muted)" }}>{isExpired ? "(Expired)" : `(${daysLeft} days)`}</div>
                    </td>
                    <td className="px-5 py-[13px]">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleLicense(l)} className="flex items-center gap-[6px] rounded-[9px] text-[12px] font-semibold cursor-pointer" style={{ padding: "7px 13px", background: active ? "rgba(244,63,94,0.12)" : "rgba(16,185,129,0.12)", border: `1px solid ${active ? "rgba(244,63,94,0.3)" : "rgba(16,185,129,0.3)"}`, color: active ? C.pink : C.green }}>
                          <Power size={13} />{active ? "Deactivate" : "Activate"}
                        </button>
                        <RowMenu license={l} onCopy={() => navigator.clipboard?.writeText(l.licenseKey)} onToggle={() => toggleLicense(l)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && !pageRows.length && (
                <tr><td colSpan={8}><div className="flex flex-col items-center justify-center text-center" style={{ padding: "56px 20px", color: "var(--text-muted)" }}><ShieldCheck size={30} className="mb-2 opacity-60" /><p className="text-[13px] m-0">No licenses match your filters</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4" style={{ borderTop: "1px solid var(--border-clr)" }}>
          <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>Showing {rangeFrom}–{rangeTo} of {filtered.length.toLocaleString()} licenses</span>
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
      </div>
    </div>
  );
}
