"use client";

import { useState } from "react";
import { Download, Key, ShieldCheck, Shield, AlertCircle, Radio, CheckCircle2, Clipboard, Info, RefreshCw } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import MetricCard from "@/components/ui/MetricCard";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import InputField from "@/components/ui/InputField";
import { useLicenses, useDevices } from "@/lib/hooks";
import { api, downloadExport } from "@/lib/api";
import { License } from "@/types";

export default function LicensesPage() {
  const { data, error, isLoading, mutate } = useLicenses();
  const { data: devicesData } = useDevices({ limit: 100 });
  const [showGenerate, setShowGenerate] = useState(false);
  const [genDeviceId, setGenDeviceId] = useState("");
  const [genSuccess, setGenSuccess] = useState(false);
  const [generatedKey, setGeneratedKey] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState("");

  const columns = [
    { key: "id", label: "License ID" },
    { key: "licenseKey", label: "Key", render: (v: unknown) => <code className="text-xs rounded" style={{ color: "#06B6D4", background: "rgba(6,182,212,0.15)", padding: "2px 8px" }}>{v as string}</code> },
    { key: "deviceId", label: "Device" },
    { key: "activationDate", label: "Activated" },
    { key: "expiryDate", label: "Expires" },
    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
  ];

  const handleGenerate = async () => {
    if (!genDeviceId) return;
    setGenLoading(true);
    setGenError("");
    try {
      const resp = await api.post<{ success: boolean; data: { licenseKey: string }; error: string | null }>("/admin/licenses/generate", { deviceId: genDeviceId });
      const licenseData = (resp as Record<string, unknown>).data as Record<string, unknown>;
      setGeneratedKey(licenseData.licenseKey as string);
      setGenSuccess(true);
      await mutate();
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    }
    setGenLoading(false);
  };

  if (error) return (<div className="text-center py-20"><AlertCircle size={48} className="mx-auto mb-4" style={{ color: "#EF4444" }} /><p className="text-sm mb-4" style={{ color: "#94A3B8" }}>Failed to load licenses</p><Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn></div>);

  const licenses = (data as Record<string, unknown>)?.items as License[] ?? [];
  const devices = ((devicesData as Record<string, unknown>)?.items as Record<string, unknown>[]) ?? [];
  const unlicensedDevices = devices.filter(d => !licenses.find(l => l.deviceId === (d.id as string) && l.status === "active"));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold m-0" style={{ color: "#F1F5F9" }}>Licenses</h1><p className="text-[13px] mt-1" style={{ color: "#64748B" }}>Per-device license management</p></div>
        <div className="flex gap-2"><Btn onClick={() => { setShowGenerate(true); setGenSuccess(false); setGenDeviceId(""); setGenError(""); }}><Key size={14} />Generate License</Btn><Btn variant="ghost" onClick={() => downloadExport("licenses")}><Download size={14} />Export</Btn></div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <MetricCard icon={ShieldCheck} label="Active Licenses" value={licenses.filter(l => l.status === "active").length} color="#10B981" />
        <MetricCard icon={Shield} label="Inactive" value={licenses.filter(l => l.status === "inactive").length} color="#EF4444" />
        <MetricCard icon={AlertCircle} label="Expired" value={licenses.filter(l => l.status === "expired").length} color="#F59E0B" />
      </div>
      <DataTable columns={columns} data={licenses} loading={isLoading} />
      <Modal open={showGenerate} title="Generate Device License" onClose={() => { setShowGenerate(false); setGenSuccess(false); setGenError(""); }}>
        {genSuccess ? (
          <div className="text-center py-[10px]">
            <div className="inline-flex items-center justify-center mb-4" style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(16,185,129,0.12)" }}><Key size={24} color="#10B981" /></div>
            <h3 className="text-[17px] font-bold mb-2" style={{ color: "#F1F5F9" }}>License Generated</h3>
            <p className="text-[13px] mb-4" style={{ color: "#94A3B8" }}>License for <strong style={{ color: "#F1F5F9" }}>{genDeviceId}</strong>:</p>
            <div className="flex items-center justify-between rounded-[10px] mb-5" style={{ background: "#111827", border: "1px solid #1e293b", padding: "14px 18px" }}>
              <code className="text-base font-bold" style={{ color: "#06B6D4", letterSpacing: 1 }}>{generatedKey}</code>
              <button onClick={() => navigator.clipboard?.writeText(generatedKey)} className="bg-transparent border-none cursor-pointer p-1"><Clipboard size={16} style={{ color: "#64748B" }} /></button>
            </div>
            <div className="flex gap-[10px] justify-center"><Btn onClick={() => { setShowGenerate(false); setGenSuccess(false); }} variant="ghost">Close</Btn><Btn onClick={() => { setGenSuccess(false); setGenDeviceId(""); }}>Generate Another</Btn></div>
          </div>
        ) : (
          <>
            {genError && <div className="flex items-center gap-2 rounded-[10px] px-[14px] py-[10px] mb-4 text-[13px]" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}><AlertCircle size={14} />{genError}</div>}
            <div className="rounded-[10px] mb-5 text-[13px] flex items-start gap-2" style={{ padding: "12px 14px", background: "rgba(6,182,212,0.15)", color: "#94A3B8" }}><Info size={14} color="#06B6D4" className="shrink-0 mt-[1px]" /><span>Generate a unique license key for a registered device. The license activates immediately.</span></div>
            <InputField label="Device ID" icon={Radio} value={genDeviceId} onChange={setGenDeviceId} placeholder="Select or enter device ID" />
            <div className="mb-4"><label className="block text-xs font-semibold mb-[6px] uppercase" style={{ color: "#94A3B8", letterSpacing: 0.5 }}>Registered Devices (unlicensed)</label>
              <div className="flex flex-wrap gap-[6px]">
                {unlicensedDevices.slice(0, 8).map(d => (<button key={d.id as string} onClick={() => setGenDeviceId(d.id as string)} className="rounded-lg text-xs font-medium font-sans" style={{ background: genDeviceId === d.id ? "rgba(6,182,212,0.15)" : "#111827", border: genDeviceId === d.id ? "1px solid rgba(6,182,212,0.38)" : "1px solid #1e293b", padding: "6px 12px", color: genDeviceId === d.id ? "#06B6D4" : "#94A3B8", cursor: "pointer" }}>{d.id as string}</button>))}
                {unlicensedDevices.length === 0 && <span className="text-xs" style={{ color: "#64748B" }}>All devices have active licenses</span>}
              </div>
            </div>
            <div className="flex gap-[10px] justify-end mt-2"><Btn onClick={() => setShowGenerate(false)} variant="ghost">Cancel</Btn><Btn onClick={handleGenerate} disabled={!genDeviceId || genLoading}>{genLoading ? <><RefreshCw size={14} className="animate-spin-slow" />Generating...</> : <><Key size={14} />Generate</>}</Btn></div>
          </>
        )}
      </Modal>
    </div>
  );
}
