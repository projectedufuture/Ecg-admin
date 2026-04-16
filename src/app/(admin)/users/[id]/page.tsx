"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CalendarDays, Clock, Cpu, FileText, Activity, Heart, UserX, UserCheck, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import StatusBadge from "@/components/ui/StatusBadge";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import { useUser, useUserSessions } from "@/lib/hooks";
import { api } from "@/lib/api";

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { data: userData, error, isLoading, mutate } = useUser(userId);
  const { data: sessionsData } = useUserSessions(userId);
  const [modal, setModal] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "#151d2e" }} />)}</div>;
  }

  if (error || !userData) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto mb-4" style={{ color: "#EF4444" }} />
        <p className="text-sm mb-4" style={{ color: "#94A3B8" }}>{error ? "Failed to load user" : "User not found"}</p>
        <Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn>
      </div>
    );
  }

  const user = userData as Record<string, unknown>;
  const sessionHistory = ((user.sessionHistory || (sessionsData as Record<string, unknown>)?.items) as Record<string, unknown>[]) ?? [];

  const handleAction = async (action: "deactivate" | "reactivate") => {
    setMutating(true);
    try {
      await api.put(`/admin/users/${userId}/${action}`);
      await mutate();
      setModal(null);
    } catch { /* ignore */ }
    setMutating(false);
  };

  const infoItems = [
    { l: "Registered", v: user.registeredDate as string, i: CalendarDays },
    { l: "Last Active", v: user.lastActive as string, i: Clock },
    { l: "Device", v: (user.deviceId as string) || "None", i: Cpu },
    { l: "Total Sessions", v: String(user.sessions), i: FileText },
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Users", onClick: () => router.push("/users") }, { label: user.name as string }]} />
      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 2fr" }}>
        <div className="rounded-2xl p-6" style={{ background: "#151d2e", border: "1px solid #1e293b" }}>
          <div className="flex items-center justify-center text-2xl font-bold mb-4" style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, rgba(6,182,212,0.19), rgba(139,92,246,0.19))", color: "#06B6D4" }}>
            {(user.name as string).split(" ").map((n: string) => n[0]).join("")}
          </div>
          <h2 className="text-xl font-bold m-0" style={{ color: "#F1F5F9" }}>{user.name as string}</h2>
          <p className="text-[13px] mt-1" style={{ color: "#94A3B8" }}>{user.email as string}</p>
          <div className="mt-4"><StatusBadge status={user.status as string} /></div>
          <div className="mt-6 flex flex-col gap-[14px]">
            {infoItems.map((item, i) => (
              <div key={i} className="flex items-center gap-[10px]">
                <item.i size={14} style={{ color: "#64748B" }} />
                <span className="text-xs flex-1" style={{ color: "#64748B" }}>{item.l}</span>
                <span className="text-[13px] font-medium" style={{ color: "#F1F5F9" }}>{item.v}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-2">
            {user.status === "active" ? (
              <Btn onClick={() => setModal("deactivate")} variant="danger" style={{ flex: 1, justifyContent: "center" }}><UserX size={14} />Deactivate</Btn>
            ) : (
              <Btn onClick={() => setModal("reactivate")} variant="success" style={{ flex: 1, justifyContent: "center" }}><UserCheck size={14} />Reactivate</Btn>
            )}
          </div>
        </div>
        <div className="rounded-2xl p-6" style={{ background: "#151d2e", border: "1px solid #1e293b" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold m-0" style={{ color: "#F1F5F9" }}>Session History</h3>
            <span className="text-xs" style={{ color: "#64748B" }}>{sessionHistory.length} sessions — click to view ECG</span>
          </div>
          {sessionHistory.length === 0 ? (
            <p className="text-center py-10 text-sm" style={{ color: "#64748B" }}>No sessions recorded yet</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto">
              {sessionHistory.map((s) => (
                <div key={s.id as string} onClick={() => router.push(`/sessions/${s.id}`)} className="flex items-center gap-[14px] rounded-[10px] cursor-pointer transition-colors duration-200" style={{ padding: "12px 14px", border: "1px solid #1e293b" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#06B6D4"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1e293b"; }}>
                  <div className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(6,182,212,0.15)" }}><Activity size={16} color="#06B6D4" /></div>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold" style={{ color: "#F1F5F9" }}>{s.id as string}</div>
                    <div className="text-[11px]" style={{ color: "#64748B" }}>{new Date(s.startTime as string).toLocaleDateString()} &middot; {s.duration as number} min</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center"><div className="text-xs font-bold flex items-center gap-[3px]" style={{ color: "#F43F5E" }}><Heart size={11} />{s.avgHR as number}</div><div className="text-[9px]" style={{ color: "#64748B" }}>bpm</div></div>
                    <div className="text-center"><div className="text-xs font-bold" style={{ color: "#F59E0B" }}>{s.avgTemp as string}°</div><div className="text-[9px]" style={{ color: "#64748B" }}>temp</div></div>
                  </div>
                  <StatusBadge status={s.dataSource as string} /><ChevronRight size={16} style={{ color: "#64748B" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Modal open={modal === "deactivate"} title="Deactivate User" onClose={() => setModal(null)}>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "#94A3B8" }}>Are you sure you want to deactivate <strong style={{ color: "#F1F5F9" }}>{user.name as string}</strong>? They will no longer be able to log in. All data is retained.</p>
        <div className="flex gap-[10px] justify-end">
          <Btn onClick={() => setModal(null)} variant="ghost">Cancel</Btn>
          <Btn onClick={() => handleAction("deactivate")} variant="danger" disabled={mutating}>{mutating ? <><RefreshCw size={14} className="animate-spin-slow" />Processing...</> : "Deactivate"}</Btn>
        </div>
      </Modal>
      <Modal open={modal === "reactivate"} title="Reactivate User" onClose={() => setModal(null)}>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "#94A3B8" }}>Reactivate <strong style={{ color: "#F1F5F9" }}>{user.name as string}</strong>?</p>
        <div className="flex gap-[10px] justify-end">
          <Btn onClick={() => setModal(null)} variant="ghost">Cancel</Btn>
          <Btn onClick={() => handleAction("reactivate")} variant="success" disabled={mutating}>{mutating ? <><RefreshCw size={14} className="animate-spin-slow" />Processing...</> : "Reactivate"}</Btn>
        </div>
      </Modal>
    </div>
  );
}
