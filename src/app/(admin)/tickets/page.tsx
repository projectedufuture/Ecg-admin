"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Search, Send, LifeBuoy, RefreshCw, AlertCircle, ChevronDown, Inbox,
  Clock, CheckCircle2, XCircle, CircleDot, Hash, Tag, Flag,
} from "lucide-react";
import Btn from "@/components/ui/Btn";
import { useTickets, useTicket } from "@/lib/hooks";
import { api } from "@/lib/api";

const C = { cyan: "#06B6D4", blue: "#3B82F6", purple: "#8B5CF6", green: "#10B981", amber: "#F59E0B", pink: "#F43F5E", slate: "#94A3B8" };

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: "Open", color: C.blue, icon: CircleDot },
  pending: { label: "Pending", color: C.amber, icon: Clock },
  resolved: { label: "Resolved", color: C.green, icon: CheckCircle2 },
  closed: { label: "Closed", color: C.slate, icon: XCircle },
};
const PRIORITY_META: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: C.slate },
  medium: { label: "Medium", color: C.blue },
  high: { label: "High", color: C.amber },
  urgent: { label: "Urgent", color: C.pink },
};
const CAT_LABEL: Record<string, string> = { general: "General", technical: "Technical", device: "Device", billing: "Billing", account: "Account", other: "Other" };

function initials(name: string) { return (name || "–").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(); }
const AVATAR = ["linear-gradient(135deg,#22D3EE,#3B82F6)", "linear-gradient(135deg,#8B5CF6,#EC4899)", "linear-gradient(135deg,#10B981,#06B6D4)", "linear-gradient(135deg,#F59E0B,#F43F5E)"];
function gradFor(id: string) { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % AVATAR.length; return AVATAR[h]; }
const relTime = (s: string) => { const h = Math.floor((Date.now() - new Date(s).getTime()) / 3600000); if (h < 1) return "now"; if (h < 24) return `${h}h`; const d = Math.floor(h / 24); return d < 7 ? `${d}d` : new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" }); };

interface Ticket { id: string; ticketNumber: string; userId: string; userName: string; userEmail: string; subject: string; category: string; priority: string; status: string; lastMessage: string; lastSender: string; lastActivityAt: string; messageCount: number; unread: number; createdAt: string; }
interface Msg { id: string; sender: "admin" | "user"; senderName: string; body: string; read: boolean; createdAt: string; }

function Dropdown({ value, options, onChange, width = 150, color }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; width?: number; color?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const current = options.find((o) => o.value === value);
  return (
    <div className="relative" ref={ref} style={{ width }}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 w-full rounded-[11px] text-[13px] font-semibold cursor-pointer" style={{ background: "var(--bg-input)", border: `1px solid ${color || "var(--border-clr)"}`, padding: "9px 12px", color: color || "var(--text-primary)" }}>
        <span className="flex-1 text-left truncate">{current?.label ?? value}</span><ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-1 rounded-[11px] overflow-hidden z-30 py-1" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", boxShadow: "0 16px 40px rgba(0,0,0,0.28)" }}>
          {options.map((o) => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }} className="flex items-center justify-between w-full text-left px-3 py-[8px] text-[13px] border-none bg-transparent cursor-pointer" style={{ color: o.value === value ? C.cyan : "var(--text-secondary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              {o.label}{o.value === value && <CheckCircle2 size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const { data, error, isLoading, mutate } = useTickets({
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    search: search.trim() || undefined,
  });
  const tickets = (data?.items as unknown as Ticket[]) ?? [];
  const counts = (data?.counts as Record<string, number>) ?? { open: 0, pending: 0, resolved: 0, closed: 0, total: 0 };

  const { data: ticketData, mutate: mutateTicket } = useTicket(activeId);
  const detail = ticketData as { ticket?: Ticket; messages?: Msg[] } | undefined;
  const ticket = detail?.ticket;
  const messages = detail?.messages ?? [];

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages.length, activeId]);

  const cards = [
    { k: "all", label: "All Tickets", value: counts.total, color: C.cyan, icon: Inbox },
    { k: "open", label: "Open", value: counts.open, color: C.blue, icon: CircleDot },
    { k: "pending", label: "Pending", value: counts.pending, color: C.amber, icon: Clock },
    { k: "resolved", label: "Resolved", value: counts.resolved, color: C.green, icon: CheckCircle2 },
  ];

  const reply = async () => {
    if (!activeId || !input.trim() || sending) return;
    const body = input.trim(); setInput(""); setSending(true);
    try { await api.post(`/admin/tickets/${activeId}/reply`, { body }); await Promise.all([mutateTicket(), mutate()]); }
    catch { setInput(body); }
    setSending(false);
  };
  const setStatus = async (status: string) => { if (!activeId) return; try { await api.put(`/admin/tickets/${activeId}`, { status }); await Promise.all([mutateTicket(), mutate()]); } catch { /* ignore */ } };
  const setPriority = async (priority: string) => { if (!activeId) return; try { await api.put(`/admin/tickets/${activeId}`, { priority }); await Promise.all([mutateTicket(), mutate()]); } catch { /* ignore */ } };

  const filteredLocally = useMemo(() => tickets, [tickets]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[28px] font-bold m-0" style={{ color: "var(--text-primary)" }}>Support Tickets</h1>
        <p className="text-[14px] mt-1" style={{ color: "var(--text-muted)" }}>Respond to support requests raised by your app users</p>
      </div>

      {/* Stat cards (click to filter by status) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        {cards.map((c) => (
          <button key={c.k} onClick={() => setStatusFilter(c.k)} className="rounded-2xl p-5 text-left cursor-pointer" style={{ background: "var(--bg-surface)", border: `1px solid ${statusFilter === c.k ? c.color : "var(--border-clr)"}` }}>
            <div className="flex items-center gap-[10px] mb-3"><span className="flex items-center justify-center" style={{ width: 42, height: 42, borderRadius: 12, background: `${c.color}22` }}><c.icon size={20} style={{ color: c.color }} /></span><span className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>{c.label}</span></div>
            <div className="text-[30px] font-bold leading-none" style={{ color: "var(--text-primary)" }}>{c.value}</div>
          </button>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-[10px] rounded-[12px] flex-1 min-w-[220px]" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", padding: "11px 14px" }}>
          <Search size={17} style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by subject, ticket #, or user…" className="bg-transparent border-none outline-none flex-1 text-[14px] font-sans" style={{ color: "var(--text-primary)" }} />
        </div>
        <Dropdown value={statusFilter} onChange={setStatusFilter} width={150} options={[{ value: "all", label: "All Status" }, { value: "open", label: "Open" }, { value: "pending", label: "Pending" }, { value: "resolved", label: "Resolved" }, { value: "closed", label: "Closed" }]} />
        <Dropdown value={priorityFilter} onChange={setPriorityFilter} width={150} options={[{ value: "all", label: "All Priority" }, { value: "urgent", label: "Urgent" }, { value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }]} />
      </div>

      {/* Two-pane */}
      <div className="rounded-2xl overflow-hidden grid" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", gridTemplateColumns: "360px 1fr", height: "calc(100vh - 340px)", minHeight: 460 }}>
        {/* Ticket list */}
        <div className="flex flex-col overflow-y-auto" style={{ borderRight: "1px solid var(--border-clr)" }}>
          {isLoading && !tickets.length && [1, 2, 3, 4].map((i) => <div key={i} className="h-[84px] m-2 rounded-xl animate-pulse" style={{ background: "var(--bg-input)" }} />)}
          {error && <div className="text-center py-10"><AlertCircle size={28} className="mx-auto mb-2" style={{ color: C.pink }} /><Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={13} />Retry</Btn></div>}
          {filteredLocally.map((t) => {
            const active = t.id === activeId; const sm = STATUS_META[t.status] ?? STATUS_META.open; const pm = PRIORITY_META[t.priority] ?? PRIORITY_META.medium;
            return (
              <button key={t.id} onClick={() => setActiveId(t.id)} className="text-left px-4 py-3 border-none cursor-pointer" style={{ background: active ? "var(--hover-bg)" : "transparent", borderBottom: "1px solid var(--border-clr)", borderLeft: active ? `3px solid ${C.cyan}` : "3px solid transparent" }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--hover-bg)"; }} onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="flex items-center gap-[6px] text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}><Hash size={11} />{t.ticketNumber}</span>
                  <div className="flex items-center gap-[6px]">
                    {t.unread > 0 && <span className="flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ minWidth: 17, height: 17, padding: "0 5px", background: C.cyan }}>{t.unread}</span>}
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{relTime(t.lastActivityAt)}</span>
                  </div>
                </div>
                <div className="text-[13px] font-semibold truncate mb-[3px]" style={{ color: "var(--text-primary)" }}>{t.subject}</div>
                <div className="flex items-center gap-2 mb-[6px]">
                  <span className="flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ width: 20, height: 20, borderRadius: 6, background: gradFor(t.userId) }}>{initials(t.userName)}</span>
                  <span className="text-[12px] truncate" style={{ color: "var(--text-secondary)" }}>{t.userName}</span>
                </div>
                <div className="flex items-center gap-[6px]">
                  <span className="inline-flex items-center gap-[4px] rounded-full text-[10px] font-semibold" style={{ padding: "2px 8px", background: `${sm.color}1f`, color: sm.color }}><sm.icon size={10} />{sm.label}</span>
                  <span className="inline-flex items-center gap-[4px] rounded-full text-[10px] font-semibold" style={{ padding: "2px 8px", background: `${pm.color}1f`, color: pm.color }}><Flag size={10} />{pm.label}</span>
                </div>
              </button>
            );
          })}
          {!isLoading && !filteredLocally.length && !error && <div className="text-center px-4 py-12" style={{ color: "var(--text-muted)" }}><LifeBuoy size={30} className="mx-auto mb-2 opacity-60" /><p className="text-[13px] m-0">No tickets found</p></div>}
        </div>

        {/* Ticket detail */}
        <div className="flex flex-col min-w-0">
          {ticket ? (
            <>
              <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border-clr)" }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1"><span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>{ticket.ticketNumber}</span><span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}><Tag size={11} />{CAT_LABEL[ticket.category] ?? ticket.category}</span></div>
                    <h3 className="text-[17px] font-bold m-0 truncate" style={{ color: "var(--text-primary)" }}>{ticket.subject}</h3>
                    <div className="flex items-center gap-2 mt-1"><span className="flex items-center justify-center text-[10px] font-bold text-white" style={{ width: 22, height: 22, borderRadius: 7, background: gradFor(ticket.userId) }}>{initials(ticket.userName)}</span><span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{ticket.userName}</span><span className="text-[11px]" style={{ color: "var(--text-muted)" }}>· {ticket.userEmail}</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dropdown value={ticket.priority} onChange={setPriority} width={130} color={PRIORITY_META[ticket.priority]?.color} options={[{ value: "urgent", label: "Urgent" }, { value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }]} />
                    <Dropdown value={ticket.status} onChange={setStatus} width={140} color={STATUS_META[ticket.status]?.color} options={[{ value: "open", label: "Open" }, { value: "pending", label: "Pending" }, { value: "resolved", label: "Resolved" }, { value: "closed", label: "Closed" }]} />
                  </div>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-3" style={{ background: "var(--bg-page)" }}>
                {messages.map((m) => {
                  const mine = m.sender === "admin";
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[72%]">
                        <div className="text-[10px] mb-1" style={{ color: "var(--text-muted)", textAlign: mine ? "right" : "left" }}>{mine ? m.senderName || "Support" : m.senderName || "User"}</div>
                        <div className="rounded-2xl text-[14px]" style={{ padding: "10px 14px", background: mine ? "linear-gradient(135deg,#22D3EE,#3B82F6)" : "var(--bg-surface)", color: mine ? "#fff" : "var(--text-primary)", border: mine ? "none" : "1px solid var(--border-clr)", borderBottomRightRadius: mine ? 4 : 16, borderBottomLeftRadius: mine ? 16 : 4, whiteSpace: "pre-wrap" }}>{m.body}</div>
                        <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)", textAlign: mine ? "right" : "left" }}>{new Date(m.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}{mine && m.read ? " · Read" : ""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-end gap-2 p-3" style={{ borderTop: "1px solid var(--border-clr)" }}>
                <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); reply(); } }} rows={1} placeholder="Type your reply…  (Enter to send, Shift+Enter for newline)" className="flex-1 bg-transparent outline-none text-[14px] rounded-[12px] resize-none" style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)", padding: "12px 14px", color: "var(--text-primary)", maxHeight: 120 }} />
                <button onClick={reply} disabled={!input.trim() || sending} className="flex items-center justify-center rounded-[12px] border-none text-white shrink-0" style={{ width: 46, height: 46, background: "linear-gradient(135deg,#22D3EE,#3B82F6)", cursor: input.trim() && !sending ? "pointer" : "not-allowed", opacity: input.trim() && !sending ? 1 : 0.5 }}>{sending ? <RefreshCw size={18} className="animate-spin-slow" /> : <Send size={18} />}</button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center" style={{ color: "var(--text-muted)" }}>
              <div className="flex items-center justify-center mb-3" style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(6,182,212,0.12)" }}><LifeBuoy size={30} style={{ color: C.cyan }} /></div>
              <p className="text-[15px] font-semibold m-0" style={{ color: "var(--text-secondary)" }}>Select a ticket</p>
              <p className="text-[13px] mt-1">Choose a support request on the left to view and reply</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
