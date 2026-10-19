"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, AlertOctagon, Info, Smartphone, ShieldCheck, Activity,
  RefreshCw, AlertCircle, Check, ChevronRight, BellRing,
} from "lucide-react";
import Btn from "@/components/ui/Btn";
import { useAlerts } from "@/lib/hooks";

const C = { blue: "#3B82F6", cyan: "#06B6D4", purple: "#8B5CF6", green: "#10B981", amber: "#F59E0B", pink: "#F43F5E", slate: "#94A3B8" };

const SEV_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  critical: { label: "Critical", color: C.pink, icon: AlertOctagon },
  warning: { label: "Warning", color: C.amber, icon: AlertTriangle },
  info: { label: "Info", color: C.blue, icon: Info },
};
const CAT_ICON: Record<string, React.ElementType> = { device: Smartphone, license: ShieldCheck, session: Activity };

interface Alert { id: string; category: string; severity: string; title: string; message: string; entityType: string; entityId: string; createdAt: string; }

const DISMISS_KEY = "biotex-dismissed-alerts";
function loadDismissed(): Set<string> { try { return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]")); } catch { return new Set(); } }
function saveDismissed(s: Set<string>) { try { localStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(s))); } catch { /* ignore */ } }
const relTime = (s: string) => { const h = Math.floor((Date.now() - new Date(s).getTime()) / 3600000); if (h < 1) return "Just now"; if (h < 24) return `${h}h ago`; const d = Math.floor(h / 24); return d < 7 ? `${d}d ago` : new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); };

export default function AlertsPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useAlerts();
  const [sevFilter, setSevFilter] = useState("all");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  useEffect(() => { setDismissed(loadDismissed()); }, []);

  const alerts = ((data as { alerts?: Alert[] } | undefined)?.alerts ?? []).filter((a) => !dismissed.has(a.id));
  const counts = useMemo(() => ({
    total: alerts.length,
    critical: alerts.filter((a) => a.severity === "critical").length,
    warning: alerts.filter((a) => a.severity === "warning").length,
    info: alerts.filter((a) => a.severity === "info").length,
  }), [alerts]);

  const filtered = sevFilter === "all" ? alerts : alerts.filter((a) => a.severity === sevFilter);

  const dismiss = (id: string) => setDismissed((s) => { const n = new Set(s); n.add(id); saveDismissed(n); return n; });
  const clearDismissed = () => { setDismissed(new Set()); saveDismissed(new Set()); };

  const goTo = (a: Alert) => {
    if (a.entityType === "device") router.push(`/devices/${a.entityId}`);
    else if (a.entityType === "session") router.push(`/sessions/${a.entityId}`);
    else router.push("/licenses");
  };

  const cards = [
    { k: "all", label: "Total Alerts", value: counts.total, color: C.cyan, icon: BellRing },
    { k: "critical", label: "Critical", value: counts.critical, color: C.pink, icon: AlertOctagon },
    { k: "warning", label: "Warnings", value: counts.warning, color: C.amber, icon: AlertTriangle },
    { k: "info", label: "Info", value: counts.info, color: C.blue, icon: Info },
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-bold m-0" style={{ color: "var(--text-primary)" }}>Alerts</h1>
          <p className="text-[14px] mt-1" style={{ color: "var(--text-muted)" }}>Live system alerts from your devices, licenses, and sessions</p>
        </div>
        <div className="flex gap-2">
          {dismissed.size > 0 && <button onClick={clearDismissed} className="rounded-[12px] text-[13px] font-medium cursor-pointer" style={{ padding: "10px 16px", background: "var(--bg-surface)", border: "1px solid var(--border-clr)", color: "var(--text-secondary)" }}>Restore dismissed ({dismissed.size})</button>}
          <button onClick={() => mutate()} className="flex items-center gap-2 rounded-[12px] text-[13px] font-semibold cursor-pointer" style={{ padding: "10px 16px", background: "var(--bg-surface)", border: "1px solid var(--border-clr)", color: "var(--text-primary)" }}><RefreshCw size={15} />Refresh</button>
        </div>
      </div>

      {/* Stat cards double as filters */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        {cards.map((c) => (
          <button key={c.k} onClick={() => setSevFilter(c.k)} className="rounded-2xl p-5 text-left cursor-pointer" style={{ background: "var(--bg-surface)", border: `1px solid ${sevFilter === c.k ? c.color : "var(--border-clr)"}`, transition: "border-color 0.15s" }}>
            <div className="flex items-center gap-[10px] mb-3"><span className="flex items-center justify-center" style={{ width: 42, height: 42, borderRadius: 12, background: `${c.color}22` }}><c.icon size={20} style={{ color: c.color }} /></span><span className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>{c.label}</span></div>
            <div className="text-[30px] font-bold leading-none" style={{ color: "var(--text-primary)" }}>{c.value}</div>
          </button>
        ))}
      </div>

      {/* List */}
      {error ? (
        <div className="text-center py-20 rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <AlertCircle size={44} className="mx-auto mb-4" style={{ color: C.pink }} /><p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Failed to load alerts</p><Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          {isLoading && !alerts.length && [1, 2, 3, 4].map((i) => <div key={i} className="h-[72px] animate-pulse" style={{ background: "var(--bg-input)", borderBottom: "1px solid var(--border-clr)" }} />)}
          {filtered.map((a, i) => {
            const sev = SEV_META[a.severity] ?? SEV_META.info;
            const CatIcon = CAT_ICON[a.category] ?? Info;
            return (
              <div key={a.id} className="flex items-center gap-4 px-5 py-4 animate-rise" style={{ borderTop: i ? "1px solid var(--border-clr)" : "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <span className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: 12, background: `${sev.color}1f` }}><sev.icon size={20} style={{ color: sev.color }} /></span>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => goTo(a)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>{a.title}</span>
                    <span className="inline-flex items-center gap-[5px] rounded-full text-[10px] font-semibold uppercase" style={{ padding: "2px 8px", background: `${sev.color}1f`, color: sev.color }}>{sev.label}</span>
                    <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}><CatIcon size={12} />{a.category}</span>
                  </div>
                  <p className="text-[13px] mt-[2px] m-0" style={{ color: "var(--text-secondary)" }}>{a.message}</p>
                </div>
                <span className="text-[12px] whitespace-nowrap shrink-0" style={{ color: "var(--text-muted)" }}>{relTime(a.createdAt)}</span>
                <button onClick={() => goTo(a)} className="flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer shrink-0" style={{ width: 30, height: 30, color: "var(--text-muted)" }} title="View"><ChevronRight size={18} /></button>
                <button onClick={() => dismiss(a.id)} className="flex items-center justify-center rounded-lg border-none cursor-pointer shrink-0" style={{ width: 30, height: 30, background: "transparent", color: "var(--text-muted)" }} title="Dismiss" onMouseEnter={(e) => { e.currentTarget.style.color = C.green; e.currentTarget.style.background = "rgba(16,185,129,0.1)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}><Check size={17} /></button>
              </div>
            );
          })}
          {!isLoading && !filtered.length && (
            <div className="flex flex-col items-center justify-center text-center" style={{ padding: "64px 20px", color: "var(--text-muted)" }}>
              <div className="flex items-center justify-center mb-3" style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(16,185,129,0.12)" }}><Check size={28} style={{ color: C.green }} /></div>
              <p className="text-[15px] font-semibold m-0" style={{ color: "var(--text-secondary)" }}>All clear</p>
              <p className="text-[13px] mt-1">No {sevFilter !== "all" ? sevFilter : ""} alerts right now</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
