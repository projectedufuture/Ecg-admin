"use client";

import { useState, useMemo } from "react";
import {
  Bell, Send, Users as UsersIcon, Search, CheckCircle2, Info, AlertTriangle,
  AlertOctagon, Trash2, RefreshCw, AlertCircle, X, Megaphone,
} from "lucide-react";
import Btn from "@/components/ui/Btn";
import { useNotifications, useUsers } from "@/lib/hooks";
import { api } from "@/lib/api";
import { User } from "@/types";

const C = { blue: "#3B82F6", cyan: "#06B6D4", purple: "#8B5CF6", green: "#10B981", amber: "#F59E0B", pink: "#F43F5E", slate: "#94A3B8" };

const TYPE_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  info: { label: "Info", color: C.blue, icon: Info },
  success: { label: "Success", color: C.green, icon: CheckCircle2 },
  warning: { label: "Warning", color: C.amber, icon: AlertTriangle },
  alert: { label: "Alert", color: C.pink, icon: AlertOctagon },
};

function initials(name: string) { return (name || "–").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(); }
const AVATAR = ["linear-gradient(135deg,#22D3EE,#3B82F6)", "linear-gradient(135deg,#8B5CF6,#EC4899)", "linear-gradient(135deg,#10B981,#06B6D4)", "linear-gradient(135deg,#F59E0B,#F43F5E)"];
function gradFor(id: string) { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % AVATAR.length; return AVATAR[h]; }

interface Batch { batchId: string; title: string; body: string; type: string; audience: string; createdByName: string; recipientCount: number; readCount: number; createdAt: string; }

export default function NotificationsPage() {
  const { data, error, isLoading, mutate } = useNotifications();
  const { data: usersData } = useUsers({ limit: 1000 });
  const users = (usersData?.items as unknown as User[]) ?? [];

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("info");
  const [audience, setAudience] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [userSearch, setUserSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeErr, setNoticeErr] = useState(false);

  const batches = (data?.items as unknown as Batch[]) ?? [];
  const activeUsers = useMemo(() => users.filter((u) => u.status === "active"), [users]);
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return (q ? activeUsers.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q)) : activeUsers).slice(0, 50);
  }, [activeUsers, userSearch]);

  const toggleUser = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const canSend = title.trim() && body.trim() && (audience === "all" || selected.size > 0) && !sending;
  const recipientCount = audience === "all" ? activeUsers.length : selected.size;

  const send = async () => {
    if (!canSend) return;
    setSending(true); setNotice(""); setNoticeErr(false);
    try {
      const payload = audience === "all"
        ? { title, body, type, broadcast: true }
        : { title, body, type, userIds: Array.from(selected) };
      const resp = (await api.post("/admin/notifications", payload)) as { data: { recipientCount: number } };
      setNotice(`Sent to ${resp.data.recipientCount} user${resp.data.recipientCount === 1 ? "" : "s"}.`);
      setTitle(""); setBody(""); setSelected(new Set()); setUserSearch("");
      await mutate();
    } catch (err: unknown) {
      setNoticeErr(true); setNotice(err instanceof Error ? err.message : "Failed to send notification");
    }
    setSending(false);
  };

  const remove = async (batchId: string) => {
    try { await api.del(`/admin/notifications/${batchId}`); await mutate(); }
    catch (err: unknown) { setNoticeErr(true); setNotice(err instanceof Error ? err.message : "Failed to delete"); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold m-0" style={{ color: "var(--text-primary)" }}>Notifications</h1>
        <p className="text-[14px] mt-1" style={{ color: "var(--text-muted)" }}>Send push notifications to your app users</p>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-2 rounded-[12px] px-4 py-3 mb-4 text-[13px]"
          style={{ background: noticeErr ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)", border: `1px solid ${noticeErr ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)"}`, color: noticeErr ? C.pink : C.green }}>
          <span className="flex items-center gap-2">{noticeErr ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}{notice}</span>
          <button onClick={() => setNotice("")} className="bg-transparent border-none cursor-pointer" style={{ color: "var(--text-muted)" }}><X size={15} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Compose */}
        <div className="xl:col-span-2 rounded-2xl p-5 h-fit" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <div className="flex items-center gap-2 mb-4"><Send size={18} style={{ color: C.cyan }} /><h3 className="text-[16px] font-semibold m-0" style={{ color: "var(--text-primary)" }}>Compose</h3></div>

          <label className="block text-[13px] font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. New feature available"
            className="w-full bg-transparent outline-none text-[14px] font-sans mb-4 rounded-[12px]" style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)", padding: "11px 14px", color: "var(--text-primary)" }} />

          <label className="block text-[13px] font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Message</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={4} placeholder="Write your message…"
            className="w-full bg-transparent outline-none text-[14px] font-sans mb-4 rounded-[12px] resize-none" style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)", padding: "11px 14px", color: "var(--text-primary)" }} />

          <label className="block text-[13px] font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Type</label>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {Object.entries(TYPE_META).map(([k, m]) => (
              <button key={k} onClick={() => setType(k)} className="flex flex-col items-center gap-1 rounded-[11px] cursor-pointer text-[11px] font-semibold" style={{ padding: "10px 0", background: type === k ? `${m.color}1f` : "var(--bg-input)", border: `1px solid ${type === k ? m.color : "var(--border-clr)"}`, color: type === k ? m.color : "var(--text-muted)" }}>
                <m.icon size={17} />{m.label}
              </button>
            ))}
          </div>

          <label className="block text-[13px] font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Audience</label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={() => setAudience("all")} className="flex items-center justify-center gap-2 rounded-[11px] cursor-pointer text-[13px] font-semibold" style={{ padding: "11px 0", background: audience === "all" ? "rgba(6,182,212,0.15)" : "var(--bg-input)", border: `1px solid ${audience === "all" ? C.cyan : "var(--border-clr)"}`, color: audience === "all" ? C.cyan : "var(--text-secondary)" }}><Megaphone size={15} />All users</button>
            <button onClick={() => setAudience("selected")} className="flex items-center justify-center gap-2 rounded-[11px] cursor-pointer text-[13px] font-semibold" style={{ padding: "11px 0", background: audience === "selected" ? "rgba(6,182,212,0.15)" : "var(--bg-input)", border: `1px solid ${audience === "selected" ? C.cyan : "var(--border-clr)"}`, color: audience === "selected" ? C.cyan : "var(--text-secondary)" }}><UsersIcon size={15} />Selected</button>
          </div>

          {audience === "selected" && (
            <div className="mb-3 rounded-[12px] overflow-hidden" style={{ border: "1px solid var(--border-clr)" }}>
              <div className="flex items-center gap-2 px-3" style={{ background: "var(--bg-input)", borderBottom: "1px solid var(--border-clr)" }}>
                <Search size={15} style={{ color: "var(--text-muted)" }} />
                <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users…" className="flex-1 bg-transparent outline-none text-[13px] py-[10px]" style={{ color: "var(--text-primary)" }} />
                {selected.size > 0 && <span className="text-[11px] font-semibold" style={{ color: C.cyan }}>{selected.size} selected</span>}
              </div>
              <div className="max-h-[220px] overflow-y-auto" style={{ background: "var(--bg-surface)" }}>
                {filteredUsers.map((u) => {
                  const sel = selected.has(u.id);
                  return (
                    <button key={u.id} onClick={() => toggleUser(u.id)} className="flex items-center gap-[10px] w-full text-left px-3 py-2 border-none bg-transparent cursor-pointer" style={{ borderTop: "1px solid var(--border-clr)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <span className="flex items-center justify-center rounded-[6px] shrink-0" style={{ width: 17, height: 17, background: sel ? "linear-gradient(135deg,#22D3EE,#3B82F6)" : "var(--bg-input)", border: sel ? "none" : "1px solid var(--border-clr)" }}>{sel && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5 L5 9 L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}</span>
                      <span className="flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ width: 26, height: 26, borderRadius: 8, background: gradFor(u.id) }}>{initials(u.name)}</span>
                      <span className="flex-1 min-w-0"><span className="text-[13px] font-medium block truncate" style={{ color: "var(--text-primary)" }}>{u.name}</span><span className="text-[11px] block truncate" style={{ color: "var(--text-muted)" }}>{u.email}</span></span>
                    </button>
                  );
                })}
                {!filteredUsers.length && <div className="text-center text-[12px] py-4" style={{ color: "var(--text-muted)" }}>No users found</div>}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>Will reach <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{recipientCount}</span> user{recipientCount === 1 ? "" : "s"}</span>
            <button onClick={send} disabled={!canSend} className="flex items-center gap-2 rounded-[12px] text-[14px] font-semibold text-white border-none" style={{ padding: "11px 20px", background: "linear-gradient(135deg,#22D3EE,#3B82F6)", cursor: canSend ? "pointer" : "not-allowed", opacity: canSend ? 1 : 0.5 }}>
              {sending ? <><RefreshCw size={15} className="animate-spin-slow" />Sending…</> : <><Send size={15} />Send</>}
            </button>
          </div>
        </div>

        {/* Sent list */}
        <div className="xl:col-span-3">
          <div className="flex items-center gap-2 mb-3"><Bell size={17} style={{ color: C.purple }} /><h3 className="text-[16px] font-semibold m-0" style={{ color: "var(--text-primary)" }}>Sent notifications</h3></div>
          {error ? (
            <div className="text-center py-16 rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
              <AlertCircle size={40} className="mx-auto mb-3" style={{ color: C.pink }} /><p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>Failed to load notifications</p><Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {isLoading && !batches.length && [1, 2, 3].map((i) => <div key={i} className="h-[92px] rounded-2xl animate-pulse" style={{ background: "var(--bg-surface)" }} />)}
              {batches.map((b) => {
                const m = TYPE_META[b.type] ?? TYPE_META.info;
                const pct = b.recipientCount ? Math.round((b.readCount / b.recipientCount) * 100) : 0;
                return (
                  <div key={b.batchId} className="rounded-2xl p-4 animate-rise" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 11, background: `${m.color}22` }}><m.icon size={19} style={{ color: m.color }} /></span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[14px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{b.title}</span>
                          <button onClick={() => remove(b.batchId)} className="flex items-center justify-center rounded-lg border-none cursor-pointer shrink-0" style={{ width: 28, height: 28, background: "transparent", color: "var(--text-muted)" }} onMouseEnter={(e) => { e.currentTarget.style.color = C.pink; e.currentTarget.style.background = "rgba(244,63,94,0.1)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}><Trash2 size={15} /></button>
                        </div>
                        <p className="text-[13px] mt-[2px] mb-2" style={{ color: "var(--text-secondary)" }}>{b.body}</p>
                        <div className="flex items-center gap-3 flex-wrap text-[11px]" style={{ color: "var(--text-muted)" }}>
                          <span className="inline-flex items-center gap-[5px] rounded-full font-semibold" style={{ padding: "2px 9px", background: `${m.color}1f`, color: m.color }}>{m.label}</span>
                          <span className="inline-flex items-center gap-1">{b.audience === "all" ? <Megaphone size={12} /> : <UsersIcon size={12} />}{b.audience === "all" ? "All users" : "Selected"} · {b.recipientCount}</span>
                          <span>{new Date(b.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          <span className="ml-auto flex items-center gap-2"><span>{b.readCount}/{b.recipientCount} read</span><span className="inline-block rounded-full overflow-hidden" style={{ width: 54, height: 6, background: "var(--bg-input)" }}><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: C.green }} /></span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!isLoading && !batches.length && (
                <div className="text-center py-16 rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
                  <Bell size={34} className="mx-auto mb-2 opacity-60" style={{ color: "var(--text-muted)" }} /><p className="text-[13px] m-0" style={{ color: "var(--text-muted)" }}>No notifications sent yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
