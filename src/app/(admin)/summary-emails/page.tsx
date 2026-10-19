"use client";

import { useState } from "react";
import {
  CalendarClock, Mail, Plus, Send, Trash2, Pencil, X, AlertCircle,
  CheckCircle2, Power, RefreshCw, Clock,
} from "lucide-react";
import Btn from "@/components/ui/Btn";
import { useSummarySchedules } from "@/lib/hooks";
import { api } from "@/lib/api";

const C = { cyan: "#06B6D4", green: "#10B981", amber: "#F59E0B", red: "#EF4444", slate: "#94A3B8" };

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMEZONES = [
  "Asia/Kolkata", "UTC", "America/New_York", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Asia/Dubai", "Asia/Singapore", "Australia/Sydney",
];

interface Schedule {
  id: string;
  name: string;
  recipientEmail: string;
  frequency: "daily" | "weekly";
  timeOfDay: string;
  weekday: number;
  timezone: string;
  enabled: boolean;
  createdByName: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastStatus: "pending" | "success" | "failed" | null;
  lastError: string | null;
  lastSessionCount: number;
}

const emptyForm = {
  name: "",
  recipientEmail: "",
  frequency: "daily" as "daily" | "weekly",
  timeOfDay: "08:00",
  weekday: 1,
  timezone: "Asia/Kolkata",
  enabled: true,
};

function fmtDate(iso: string | null, tz?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz || undefined, day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit", hour12: true,
    }).format(d);
  } catch { return d.toLocaleString(); }
}

export default function SummaryEmailsPage() {
  const { data, isLoading, mutate } = useSummarySchedules();
  const schedules = ((data?.items as unknown as Schedule[]) ?? []);

  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const resetForm = () => { setForm({ ...emptyForm }); setEditingId(null); };

  const startEdit = (s: Schedule) => {
    setEditingId(s.id);
    setForm({
      name: s.name, recipientEmail: s.recipientEmail, frequency: s.frequency,
      timeOfDay: s.timeOfDay, weekday: s.weekday ?? 1, timezone: s.timezone, enabled: s.enabled,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    if (!form.name.trim()) return setNotice({ kind: "err", msg: "Please enter a name." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.recipientEmail)) return setNotice({ kind: "err", msg: "Enter a valid recipient email." });
    setSaving(true); setNotice(null);
    try {
      if (editingId) {
        await api.put(`/admin/summary-schedules/${editingId}`, form);
        setNotice({ kind: "ok", msg: "Schedule updated." });
      } else {
        await api.post("/admin/summary-schedules", form);
        setNotice({ kind: "ok", msg: "Schedule created." });
      }
      resetForm();
      mutate();
    } catch (e) {
      setNotice({ kind: "err", msg: e instanceof Error ? e.message : "Save failed." });
    } finally { setSaving(false); }
  };

  const toggle = async (s: Schedule) => {
    setBusyId(s.id);
    try { await api.put(`/admin/summary-schedules/${s.id}`, { enabled: !s.enabled }); mutate(); }
    catch (e) { setNotice({ kind: "err", msg: e instanceof Error ? e.message : "Update failed." }); }
    finally { setBusyId(null); }
  };

  const remove = async (s: Schedule) => {
    if (!window.confirm(`Delete schedule "${s.name}"?`)) return;
    setBusyId(s.id);
    try { await api.del(`/admin/summary-schedules/${s.id}`); if (editingId === s.id) resetForm(); mutate(); }
    catch (e) { setNotice({ kind: "err", msg: e instanceof Error ? e.message : "Delete failed." }); }
    finally { setBusyId(null); }
  };

  const sendNow = async (s: Schedule) => {
    setBusyId(s.id); setNotice(null);
    try {
      const r = await api.post<{ sessionCount: number; activeUserCount: number }>(`/admin/summary-schedules/${s.id}/send-now`, {});
      setNotice({ kind: "ok", msg: `Sent to ${s.recipientEmail} — ${r.sessionCount} sessions, ${r.activeUserCount} active users.` });
      mutate();
    } catch (e) {
      setNotice({ kind: "err", msg: e instanceof Error ? e.message : "Send failed." });
    } finally { setBusyId(null); }
  };

  const inputCls = "w-full bg-transparent outline-none text-[14px] font-sans rounded-[12px]";
  const inputSx = { background: "var(--bg-input)", border: "1px solid var(--border-clr)", padding: "11px 14px", color: "var(--text-primary)" } as const;
  const labelCls = "block text-[13px] font-medium mb-2 mt-4";
  const labelSx = { color: "var(--text-secondary)" } as const;

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[28px] font-bold m-0 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <CalendarClock size={26} style={{ color: C.cyan }} /> Summary Emails
        </h1>
        <p className="text-[14px] mt-1" style={{ color: "var(--text-muted)" }}>
          Schedule recurring session-activity digests (logins, sessions recorded &amp; durations) to any email.
        </p>
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-[12px] px-4 py-3 mb-5 text-[13px]"
          style={{ background: notice.kind === "ok" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", border: `1px solid ${notice.kind === "ok" ? C.green : C.red}`, color: notice.kind === "ok" ? C.green : C.red }}>
          <span className="flex items-center gap-2">
            {notice.kind === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {notice.msg}
          </span>
          <button onClick={() => setNotice(null)} className="bg-transparent border-none cursor-pointer" style={{ color: "inherit" }}><X size={15} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* ── Form ─────────────────────────────────────────── */}
        <div className="rounded-2xl p-5 h-fit" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <div className="flex items-center gap-2 mb-1">
            {editingId ? <Pencil size={18} style={{ color: C.cyan }} /> : <Plus size={18} style={{ color: C.cyan }} />}
            <h3 className="text-[16px] font-semibold m-0" style={{ color: "var(--text-primary)" }}>{editingId ? "Edit schedule" : "New schedule"}</h3>
          </div>

          <label className={labelCls} style={labelSx}>Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120}
            placeholder="e.g. Daily activity digest" className={inputCls} style={inputSx} />

          <label className={labelCls} style={labelSx}>Recipient email</label>
          <input value={form.recipientEmail} onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })} type="email"
            placeholder="ops@company.com" className={inputCls} style={inputSx} />

          <label className={labelCls} style={labelSx}>Frequency</label>
          <div className="grid grid-cols-2 gap-2">
            {(["daily", "weekly"] as const).map((f) => (
              <button key={f} onClick={() => setForm({ ...form, frequency: f })}
                className="rounded-[11px] cursor-pointer text-[13px] font-semibold capitalize" style={{ padding: "11px 0", background: form.frequency === f ? "rgba(6,182,212,0.15)" : "var(--bg-input)", border: `1px solid ${form.frequency === f ? C.cyan : "var(--border-clr)"}`, color: form.frequency === f ? C.cyan : "var(--text-secondary)" }}>{f}</button>
            ))}
          </div>

          {form.frequency === "weekly" && (
            <>
              <label className={labelCls} style={labelSx}>Day of week</label>
              <select value={form.weekday} onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })} className={inputCls} style={inputSx}>
                {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </>
          )}

          <label className={labelCls} style={labelSx}>Send time (24h)</label>
          <input value={form.timeOfDay} onChange={(e) => setForm({ ...form, timeOfDay: e.target.value })} type="time" className={inputCls} style={inputSx} />

          <label className={labelCls} style={labelSx}>Timezone</label>
          <select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className={inputCls} style={inputSx}>
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>

          <label className="flex items-center gap-2 mt-4 cursor-pointer text-[13px]" style={{ color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            Enabled (sends automatically on schedule)
          </label>

          <div className="flex gap-2 mt-5">
            <Btn onClick={save} disabled={saving} style={{ flex: 1, justifyContent: "center" }}>
              {saving ? <RefreshCw size={15} className="animate-spin" /> : editingId ? <Pencil size={15} /> : <Plus size={15} />}
              {editingId ? "Update" : "Create"}
            </Btn>
            {editingId && <Btn variant="ghost" onClick={resetForm}>Cancel</Btn>}
          </div>
        </div>

        {/* ── List ─────────────────────────────────────────── */}
        <div className="xl:col-span-2 flex flex-col gap-3">
          {isLoading && <div className="text-[14px]" style={{ color: "var(--text-muted)" }}>Loading schedules…</div>}
          {!isLoading && schedules.length === 0 && (
            <div className="rounded-2xl p-10 text-center" style={{ background: "var(--bg-surface)", border: "1px dashed var(--border-clr)" }}>
              <Mail size={28} style={{ color: C.slate }} className="mx-auto mb-3" />
              <p className="text-[14px] m-0" style={{ color: "var(--text-muted)" }}>No summary emails scheduled yet. Create one on the left.</p>
            </div>
          )}

          {schedules.map((s) => {
            const statusColor = s.lastStatus === "success" ? C.green : s.lastStatus === "failed" ? C.red : C.slate;
            return (
              <div key={s.id} className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", opacity: s.enabled ? 1 : 0.65 }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-[15px] font-semibold m-0 truncate" style={{ color: "var(--text-primary)" }}>{s.name}</h4>
                      <span className="text-[11px] font-semibold px-2 py-[2px] rounded-full capitalize" style={{ background: "rgba(6,182,212,0.15)", color: C.cyan }}>{s.frequency}</span>
                      {!s.enabled && <span className="text-[11px] font-semibold px-2 py-[2px] rounded-full" style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}>Paused</span>}
                    </div>
                    <p className="text-[13px] mt-1 mb-0 flex items-center gap-1 truncate" style={{ color: "var(--text-secondary)" }}>
                      <Mail size={13} /> {s.recipientEmail}
                    </p>
                    <p className="text-[12px] mt-1 mb-0 flex items-center gap-1 flex-wrap" style={{ color: "var(--text-muted)" }}>
                      <Clock size={12} />
                      {s.frequency === "weekly" ? `${WEEKDAYS[s.weekday] ?? ""} ` : "Every day "}
                      at {s.timeOfDay} ({s.timezone})
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button title={s.enabled ? "Pause" : "Resume"} onClick={() => toggle(s)} disabled={busyId === s.id}
                      className="p-2 rounded-[9px] border-none cursor-pointer" style={{ background: "var(--bg-input)", color: s.enabled ? C.amber : C.green }}><Power size={15} /></button>
                    <button title="Send now" onClick={() => sendNow(s)} disabled={busyId === s.id}
                      className="p-2 rounded-[9px] border-none cursor-pointer" style={{ background: "var(--bg-input)", color: C.cyan }}><Send size={15} /></button>
                    <button title="Edit" onClick={() => startEdit(s)} disabled={busyId === s.id}
                      className="p-2 rounded-[9px] border-none cursor-pointer" style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}><Pencil size={15} /></button>
                    <button title="Delete" onClick={() => remove(s)} disabled={busyId === s.id}
                      className="p-2 rounded-[9px] border-none cursor-pointer" style={{ background: "var(--bg-input)", color: C.red }}><Trash2 size={15} /></button>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3 pt-3 flex-wrap text-[12px]" style={{ borderTop: "1px solid var(--border-clr)", color: "var(--text-muted)" }}>
                  <span>Next: <strong style={{ color: "var(--text-secondary)" }}>{fmtDate(s.nextRunAt, s.timezone)}</strong></span>
                  <span>Last run: <strong style={{ color: "var(--text-secondary)" }}>{fmtDate(s.lastRunAt, s.timezone)}</strong></span>
                  {s.lastStatus && (
                    <span className="flex items-center gap-1" style={{ color: statusColor }}>
                      ● {s.lastStatus}{s.lastStatus === "success" ? ` (${s.lastSessionCount} sessions)` : ""}
                    </span>
                  )}
                </div>
                {s.lastStatus === "failed" && s.lastError && (
                  <p className="text-[12px] mt-2 mb-0" style={{ color: C.red }}>Error: {s.lastError}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
