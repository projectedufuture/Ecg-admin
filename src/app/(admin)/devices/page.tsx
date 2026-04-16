"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Plus, Radio, CheckCircle2, ShieldCheck, XCircle, Hash, Cpu, Package, Info, AlertCircle, RefreshCw } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import MetricCard from "@/components/ui/MetricCard";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import InputField from "@/components/ui/InputField";
import { useDevices } from "@/lib/hooks";
import { api, downloadExport } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { Device } from "@/types";

export default function DevicesPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useDevices();
  const [showRegister, setShowRegister] = useState(false);
  const [regDeviceId, setRegDeviceId] = useState("");
  const [regHwVersion, setRegHwVersion] = useState("HW-2.0");
  const [regSuccess, setRegSuccess] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");

  const columns = [
    { key: "id", label: "Device ID" },
    { key: "userName", label: "Assigned User" },
    { key: "firmware", label: "Firmware" },
    { key: "hardwareVersion", label: "HW Version" },
    { key: "lastSeen", label: "Last Seen", render: (v: unknown) => formatRelativeTime(v as string) },
    { key: "batteryLevel", label: "Battery", render: (v: unknown) => { const val = v as number; return (<div className="flex items-center gap-[6px]"><div className="overflow-hidden rounded-[3px]" style={{ width: 40, height: 6, background: "var(--bg-input)" }}><div className="h-full rounded-[3px]" style={{ width: `${val}%`, background: val > 50 ? "#10B981" : val > 20 ? "#F59E0B" : "#EF4444" }} /></div><span className="text-[11px]">{val}%</span></div>); } },
    { key: "licenseStatus", label: "License", render: (v: unknown) => <StatusBadge status={v as string} /> },
  ];

  const handleRegister = async () => {
    if (!regDeviceId) return;
    setRegLoading(true);
    setRegError("");
    try {
      await api.post("/admin/devices/register", { deviceId: regDeviceId, hardwareVersion: regHwVersion });
      setRegSuccess(true);
      await mutate();
      setTimeout(() => { setShowRegister(false); setRegDeviceId(""); setRegHwVersion("HW-2.0"); setRegSuccess(false); }, 1500);
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : "Registration failed");
    }
    setRegLoading(false);
  };

  if (error) {
    return (<div className="text-center py-20"><AlertCircle size={48} className="mx-auto mb-4" style={{ color: "#EF4444" }} /><p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Failed to load devices</p><Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn></div>);
  }

  const devices = (data?.items as unknown as Device[]) ?? [];
  const onlineCount = devices.filter(d => (Date.now() - new Date(d.lastSeen).getTime()) / 3600000 < 24).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold m-0" style={{ color: "var(--text-primary)" }}>Devices</h1><p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>Registered wearable device inventory</p></div>
        <div className="flex gap-2"><Btn onClick={() => setShowRegister(true)}><Plus size={14} />Register Device</Btn><Btn variant="ghost" onClick={() => downloadExport("devices")}><Download size={14} />Export CSV</Btn></div>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <MetricCard icon={Radio} label="Total Devices" value={devices.length} color="#06B6D4" />
        <MetricCard icon={CheckCircle2} label="Online (24h)" value={onlineCount} color="#10B981" />
        <MetricCard icon={ShieldCheck} label="Licensed" value={devices.filter(d => d.licenseStatus === "active").length} color="#8B5CF6" />
        <MetricCard icon={XCircle} label="Inactive" value={devices.filter(d => d.licenseStatus !== "active").length} color="#EF4444" />
      </div>
      <DataTable columns={columns} data={devices as unknown as Record<string, unknown>[]} loading={isLoading} onRowClick={(row: Record<string, unknown>) => router.push(`/devices/${(row as unknown as Device).id}`)} />
      <Modal open={showRegister} title="Register New Device" onClose={() => { setShowRegister(false); setRegSuccess(false); setRegError(""); }}>
        {regSuccess ? (
          <div className="text-center py-5"><div className="inline-flex items-center justify-center mb-4" style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(16,185,129,0.12)" }}><CheckCircle2 size={24} color="#10B981" /></div><h3 className="text-[17px] font-bold mb-2" style={{ color: "var(--text-primary)" }}>Device Registered</h3><p className="text-[13px]" style={{ color: "var(--text-secondary)" }}><strong style={{ color: "var(--text-primary)" }}>{regDeviceId}</strong> has been added to the system.</p></div>
        ) : (
          <>
            {regError && <div className="flex items-center gap-2 rounded-[10px] px-[14px] py-[10px] mb-4 text-[13px]" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}><AlertCircle size={14} />{regError}</div>}
            <div className="rounded-[10px] mb-5 text-[13px] flex items-start gap-2" style={{ padding: "12px 14px", background: "rgba(6,182,212,0.15)", color: "var(--text-secondary)" }}><Info size={14} color="#06B6D4" className="shrink-0 mt-[1px]" /><span>Register devices supplied by the manufacturer. Device ID must be in format ECG-XXXXX (5 digits).</span></div>
            <InputField label="Device ID" icon={Hash} value={regDeviceId} onChange={setRegDeviceId} placeholder="e.g. ECG-02032" />
            <InputField label="Hardware Version" icon={Cpu} value={regHwVersion} onChange={setRegHwVersion} placeholder="e.g. HW-2.0" />
            <div className="mb-4"><label className="block text-xs font-semibold mb-[6px] uppercase" style={{ color: "var(--text-secondary)", letterSpacing: 0.5 }}>Client</label><div className="flex items-center gap-2 rounded-[10px]" style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)", padding: "10px 14px" }}><Package size={16} style={{ color: "var(--text-muted)" }} /><span className="text-sm" style={{ color: "var(--text-secondary)" }}>CLIENT-001</span></div></div>
            <div className="flex gap-[10px] justify-end mt-2"><Btn onClick={() => setShowRegister(false)} variant="ghost">Cancel</Btn><Btn onClick={handleRegister} disabled={!regDeviceId || regLoading}>{regLoading ? <><RefreshCw size={14} className="animate-spin-slow" />Registering...</> : <><Plus size={14} />Register</>}</Btn></div>
          </>
        )}
      </Modal>
    </div>
  );
}
