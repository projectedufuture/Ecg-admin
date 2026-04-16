"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Activity, Heart, Zap, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import StatusBadge from "@/components/ui/StatusBadge";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import { useDevice } from "@/lib/hooks";
import { api } from "@/lib/api";

export default function DeviceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const deviceId = params.id as string;
  const { data, error, isLoading, mutate } = useDevice(deviceId);
  const [modal, setModal] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "var(--bg-surface)" }} />)}</div>;
  if (error || !data) return (<div className="text-center py-20"><AlertCircle size={48} className="mx-auto mb-4" style={{ color: "#EF4444" }} /><p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Failed to load device</p><Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn></div>);

  const device = data as Record<string, unknown>;
  const license = device.license as Record<string, unknown> | null;
  const recentSessions = (device.recentSessions as Record<string, unknown>[]) ?? [];

  const handleAction = async (action: "deactivate" | "reactivate") => {
    setMutating(true);
    try { await api.put(`/admin/devices/${deviceId}/${action}`); await mutate(); setModal(null); } catch { /* ignore */ }
    setMutating(false);
  };

  const deviceInfo: [string, string][] = [["Device ID", device.id as string], ["Firmware", `v${device.firmware}`], ["Hardware", device.hardwareVersion as string], ["Assigned User", device.userName as string], ["Battery", `${device.batteryLevel}%`], ["Last Seen", new Date(device.lastSeen as string).toLocaleString()]];
  const licenseInfo: [string, string][] = license ? [["License Key", license.licenseKey as string], ["Activated", license.activationDate as string], ["Expires", license.expiryDate as string]] : [];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Devices", onClick: () => router.push("/devices") }, { label: device.id as string }]} />
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <h3 className="text-[15px] font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Device Info</h3>
          {deviceInfo.map(([k, v], i) => (<div key={i} className="flex justify-between py-2 text-[13px]" style={{ borderBottom: "1px solid var(--border-clr)" }}><span style={{ color: "var(--text-muted)" }}>{k}</span><span className="font-medium" style={{ color: "var(--text-primary)" }}>{v}</span></div>))}
        </div>
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <h3 className="text-[15px] font-semibold mb-4" style={{ color: "var(--text-primary)" }}>License</h3>
          <div className="text-center py-[10px]"><StatusBadge status={device.licenseStatus as string} /></div>
          {licenseInfo.map(([k, v], i) => (<div key={i} className="flex justify-between py-2 text-[13px]" style={{ borderBottom: "1px solid var(--border-clr)", marginTop: i === 0 ? 12 : 0 }}><span style={{ color: "var(--text-muted)" }}>{k}</span><span className="font-medium" style={{ color: "var(--text-primary)", fontFamily: "monospace", fontSize: 12 }}>{v}</span></div>))}
        </div>
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <h3 className="text-[15px] font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Actions</h3>
          <div className="flex flex-col gap-[10px]">
            {device.licenseStatus === "active" ? (<Btn onClick={() => setModal("deactivate")} variant="danger" style={{ width: "100%", justifyContent: "center" }}><Zap size={14} />Deactivate Device</Btn>) : (<Btn onClick={() => setModal("reactivate")} variant="success" style={{ width: "100%", justifyContent: "center" }}><CheckCircle2 size={14} />Reactivate</Btn>)}
          </div>
        </div>
      </div>
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
        <h3 className="text-[15px] font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Recent Sessions</h3>
        {recentSessions.length === 0 ? (<p className="text-center py-[30px] text-sm" style={{ color: "var(--text-muted)" }}>No sessions recorded</p>) : (
          <div className="flex flex-col gap-2">{recentSessions.map((s) => (<div key={s.id as string} onClick={() => router.push(`/sessions/${s.id}`)} className="flex items-center gap-[14px] rounded-[10px] text-[13px] cursor-pointer" style={{ padding: "12px 14px", border: "1px solid var(--border-clr)" }} onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#06B6D4"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-clr)"; }}>
            <Activity size={16} color="#06B6D4" /><span className="font-semibold" style={{ color: "var(--text-primary)", minWidth: 130 }}>{s.id as string}</span><span className="flex-1" style={{ color: "var(--text-muted)" }}>{new Date(s.startTime as string).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span><span className="font-semibold flex items-center gap-[3px]" style={{ color: "#F43F5E" }}><Heart size={12} />{s.avgHR as number} bpm</span><span style={{ color: "var(--text-secondary)" }}>{s.duration as number} min</span><StatusBadge status={s.dataSource as string} />
          </div>))}</div>
        )}
      </div>
      <Modal open={modal === "deactivate"} title="Deactivate Device" onClose={() => setModal(null)}>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>Deactivate <strong style={{ color: "var(--text-primary)" }}>{device.id as string}</strong>? It will no longer sync data.</p>
        <div className="flex gap-[10px] justify-end"><Btn onClick={() => setModal(null)} variant="ghost">Cancel</Btn><Btn onClick={() => handleAction("deactivate")} variant="danger" disabled={mutating}>{mutating ? "Processing..." : "Deactivate"}</Btn></div>
      </Modal>
      <Modal open={modal === "reactivate"} title="Reactivate Device" onClose={() => setModal(null)}>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>Reactivate <strong style={{ color: "var(--text-primary)" }}>{device.id as string}</strong>?</p>
        <div className="flex gap-[10px] justify-end"><Btn onClick={() => setModal(null)} variant="ghost">Cancel</Btn><Btn onClick={() => handleAction("reactivate")} variant="success" disabled={mutating}>{mutating ? "Processing..." : "Reactivate"}</Btn></div>
      </Modal>
    </div>
  );
}
