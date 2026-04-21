"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Plus,
  Radio,
  CheckCircle2,
  ShieldCheck,
  XCircle,
  Hash,
  Cpu,
  Package,
  Info,
  AlertCircle,
  RefreshCw,
  Layers,
  Clipboard,
  Key,
} from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import MetricCard from "@/components/ui/MetricCard";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import InputField from "@/components/ui/InputField";
import { useDevices } from "@/lib/hooks";
import { api, downloadExport } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Device } from "@/types";

interface RegisterResponse {
  success: boolean;
  data: {
    id: string;
    license?: { licenseKey: string; status: string; expiryDate: string };
  };
}

interface BulkCreatedDevice {
  id: string;
  license: { licenseKey: string; status: string; expiryDate: string };
}

interface BulkResponse {
  success: boolean;
  data: {
    created: number;
    devices: BulkCreatedDevice[];
    range: { first: string; last: string };
  };
}

export default function DevicesPage() {
  const router = useRouter();
  const { admin } = useAuth();
  const canRegisterDevice = admin?.role === "super_admin";
  const { data, error, isLoading, mutate } = useDevices();

  // Single register modal
  const [showRegister, setShowRegister] = useState(false);
  const [regDeviceId, setRegDeviceId] = useState("");
  const [regHwVersion, setRegHwVersion] = useState("HW-2.0");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regResult, setRegResult] = useState<RegisterResponse["data"] | null>(null);

  // Bulk register modal
  const [showBulk, setShowBulk] = useState(false);
  const [bulkCount, setBulkCount] = useState("10");
  const [bulkFirmware, setBulkFirmware] = useState("1.0.0");
  const [bulkHw, setBulkHw] = useState("HW-2.0");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkResult, setBulkResult] = useState<BulkResponse["data"] | null>(null);

  const columns = [
    { key: "id", label: "Device ID" },
    { key: "userName", label: "Assigned User" },
    {
      key: "licenseKey",
      label: "License Key",
      render: (v: unknown) =>
        v ? (
          <code
            className="text-xs rounded"
            style={{
              color: "#06B6D4",
              background: "rgba(6,182,212,0.15)",
              padding: "2px 8px",
            }}
          >
            {v as string}
          </code>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>—</span>
        ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (v: unknown) =>
        v ? new Date(v as string).toLocaleDateString() : <span style={{ color: "var(--text-muted)" }}>—</span>,
    },
    { key: "lastSeen", label: "Last Seen", render: (v: unknown) => formatRelativeTime(v as string) },
    {
      key: "batteryLevel",
      label: "Battery",
      render: (v: unknown) => {
        const val = v as number;
        return (
          <div className="flex items-center gap-[6px]">
            <div className="overflow-hidden rounded-[3px]" style={{ width: 40, height: 6, background: "var(--bg-input)" }}>
              <div
                className="h-full rounded-[3px]"
                style={{
                  width: `${val}%`,
                  background: val > 50 ? "#10B981" : val > 20 ? "#F59E0B" : "#EF4444",
                }}
              />
            </div>
            <span className="text-[11px]">{val}%</span>
          </div>
        );
      },
    },
    { key: "licenseStatus", label: "License", render: (v: unknown) => <StatusBadge status={v as string} /> },
  ];

  const resetRegister = () => {
    setShowRegister(false);
    setRegDeviceId("");
    setRegHwVersion("HW-2.0");
    setRegResult(null);
    setRegError("");
  };

  const resetBulk = () => {
    setShowBulk(false);
    setBulkCount("10");
    setBulkFirmware("1.0.0");
    setBulkHw("HW-2.0");
    setBulkResult(null);
    setBulkError("");
  };

  const handleRegister = async () => {
    if (!regDeviceId) return;
    setRegLoading(true);
    setRegError("");
    try {
      const resp = (await api.post("/admin/devices/register", {
        deviceId: regDeviceId,
        hardwareVersion: regHwVersion,
      })) as RegisterResponse;
      setRegResult(resp.data);
      await mutate();
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : "Registration failed");
    }
    setRegLoading(false);
  };

  const handleBulk = async () => {
    const n = parseInt(bulkCount, 10);
    if (!Number.isFinite(n) || n < 1) {
      setBulkError("Enter a number between 1 and 500.");
      return;
    }
    setBulkLoading(true);
    setBulkError("");
    try {
      const resp = (await api.post("/admin/devices/bulk", {
        numberOfDevices: n,
        firmware: bulkFirmware,
        hardwareVersion: bulkHw,
      })) as BulkResponse;
      setBulkResult(resp.data);
      await mutate();
    } catch (err: unknown) {
      setBulkError(err instanceof Error ? err.message : "Bulk creation failed");
    }
    setBulkLoading(false);
  };

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto mb-4" style={{ color: "#EF4444" }} />
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Failed to load devices</p>
        <Btn onClick={() => mutate()} variant="ghost">
          <RefreshCw size={14} />Retry
        </Btn>
      </div>
    );
  }

  const devices = (data?.items as unknown as Device[]) ?? [];
  const onlineCount = devices.filter(
    (d) => (Date.now() - new Date(d.lastSeen).getTime()) / 3600000 < 24
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold m-0" style={{ color: "var(--text-primary)" }}>Devices</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
            Registered wearable device inventory · licenses auto-generated
          </p>
        </div>
        <div className="flex gap-2">
          {canRegisterDevice && (
            <>
              <Btn onClick={() => setShowBulk(true)}>
                <Layers size={14} />Bulk Create
              </Btn>
              <Btn variant="ghost" onClick={() => setShowRegister(true)}>
                <Plus size={14} />Single Register
              </Btn>
            </>
          )}
          <Btn variant="ghost" onClick={() => downloadExport("devices")}>
            <Download size={14} />Export CSV
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        <MetricCard icon={Radio} label="Total Devices" value={devices.length} color="#06B6D4" />
        <MetricCard icon={CheckCircle2} label="Online (24h)" value={onlineCount} color="#10B981" />
        <MetricCard
          icon={ShieldCheck}
          label="Licensed"
          value={devices.filter((d) => d.licenseStatus === "active").length}
          color="#8B5CF6"
        />
        <MetricCard
          icon={XCircle}
          label="Inactive"
          value={devices.filter((d) => d.licenseStatus !== "active").length}
          color="#EF4444"
        />
      </div>

      <DataTable
        columns={columns}
        data={devices as unknown as Record<string, unknown>[]}
        loading={isLoading}
        onRowClick={(row: Record<string, unknown>) => router.push(`/devices/${(row as unknown as Device).id}`)}
      />

      {/* Single register modal */}
      <Modal open={showRegister} title="Register New Device" onClose={resetRegister}>
        {regResult ? (
          <div className="text-center py-5">
            <div
              className="inline-flex items-center justify-center mb-4"
              style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(16,185,129,0.12)" }}
            >
              <CheckCircle2 size={24} color="#10B981" />
            </div>
            <h3 className="text-[17px] font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Device Registered
            </h3>
            <p className="text-[13px] mb-3" style={{ color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--text-primary)" }}>{regResult.id}</strong> has been added.
            </p>
            {regResult.license && (
              <div
                className="flex items-center justify-between rounded-[10px] mb-5"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)", padding: "12px 16px" }}
              >
                <div className="flex items-center gap-2 text-left">
                  <Key size={14} style={{ color: "#06B6D4" }} />
                  <div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      Auto-generated License
                    </div>
                    <code className="text-sm font-bold" style={{ color: "#06B6D4", letterSpacing: 1 }}>
                      {regResult.license.licenseKey}
                    </code>
                  </div>
                </div>
                <button
                  onClick={() => regResult.license && navigator.clipboard?.writeText(regResult.license.licenseKey)}
                  className="bg-transparent border-none cursor-pointer p-1"
                  title="Copy license key"
                >
                  <Clipboard size={16} style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
            )}
            <Btn onClick={resetRegister}>Done</Btn>
          </div>
        ) : (
          <>
            {regError && (
              <div
                className="flex items-center gap-2 rounded-[10px] px-[14px] py-[10px] mb-4 text-[13px]"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#EF4444",
                }}
              >
                <AlertCircle size={14} />{regError}
              </div>
            )}
            <div
              className="rounded-[10px] mb-5 text-[13px] flex items-start gap-2"
              style={{
                padding: "12px 14px",
                background: "rgba(6,182,212,0.15)",
                color: "var(--text-secondary)",
              }}
            >
              <Info size={14} color="#06B6D4" className="shrink-0 mt-[1px]" />
              <span>
                A license key is generated automatically when the device is registered. Format: ECG-NNNN or ECG-NNNNN.
              </span>
            </div>
            <InputField label="Device ID" icon={Hash} value={regDeviceId} onChange={setRegDeviceId} placeholder="e.g. ECG-02032" />
            <InputField label="Hardware Version" icon={Cpu} value={regHwVersion} onChange={setRegHwVersion} placeholder="e.g. HW-2.0" />
            <div className="mb-4">
              <label
                className="block text-xs font-semibold mb-[6px] uppercase"
                style={{ color: "var(--text-secondary)", letterSpacing: 0.5 }}
              >
                Client
              </label>
              <div
                className="flex items-center gap-2 rounded-[10px]"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)", padding: "10px 14px" }}
              >
                <Package size={16} style={{ color: "var(--text-muted)" }} />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>CLIENT-001</span>
              </div>
            </div>
            <div className="flex gap-[10px] justify-end mt-2">
              <Btn onClick={resetRegister} variant="ghost">Cancel</Btn>
              <Btn onClick={handleRegister} disabled={!regDeviceId || regLoading}>
                {regLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin-slow" />Registering...
                  </>
                ) : (
                  <>
                    <Plus size={14} />Register
                  </>
                )}
              </Btn>
            </div>
          </>
        )}
      </Modal>

      {/* Bulk create modal */}
      <Modal open={showBulk} title="Bulk Create Devices" onClose={resetBulk}>
        {bulkResult ? (
          <div>
            <div className="text-center mb-4">
              <div
                className="inline-flex items-center justify-center mb-3"
                style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(16,185,129,0.12)" }}
              >
                <CheckCircle2 size={24} color="#10B981" />
              </div>
              <h3 className="text-[17px] font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                {bulkResult.created} Devices Created
              </h3>
              <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                Range: <strong style={{ color: "var(--text-primary)" }}>{bulkResult.range.first}</strong> →{" "}
                <strong style={{ color: "var(--text-primary)" }}>{bulkResult.range.last}</strong>
              </p>
            </div>
            <div
              className="rounded-[10px] mb-4 overflow-auto"
              style={{
                maxHeight: 260,
                border: "1px solid var(--border-clr)",
                background: "var(--bg-input)",
              }}
            >
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ background: "rgba(6,182,212,0.08)" }}>
                    <th className="text-left px-3 py-2" style={{ color: "var(--text-muted)" }}>Device ID</th>
                    <th className="text-left px-3 py-2" style={{ color: "var(--text-muted)" }}>License Key</th>
                    <th className="text-left px-3 py-2" style={{ color: "var(--text-muted)" }}>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResult.devices.map((d) => (
                    <tr key={d.id} style={{ borderTop: "1px solid var(--border-clr)" }}>
                      <td className="px-3 py-2" style={{ color: "var(--text-primary)" }}>{d.id}</td>
                      <td className="px-3 py-2">
                        <code style={{ color: "#06B6D4" }}>{d.license.licenseKey}</code>
                      </td>
                      <td className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>{d.license.expiryDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-[10px] justify-end">
              <Btn
                variant="ghost"
                onClick={() => {
                  const csv = [
                    "deviceId,licenseKey,expiryDate",
                    ...bulkResult.devices.map((d) => `${d.id},${d.license.licenseKey},${d.license.expiryDate}`),
                  ].join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `devices_${bulkResult.range.first}_${bulkResult.range.last}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download size={14} />Download CSV
              </Btn>
              <Btn onClick={resetBulk}>Done</Btn>
            </div>
          </div>
        ) : (
          <>
            {bulkError && (
              <div
                className="flex items-center gap-2 rounded-[10px] px-[14px] py-[10px] mb-4 text-[13px]"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#EF4444",
                }}
              >
                <AlertCircle size={14} />{bulkError}
              </div>
            )}
            <div
              className="rounded-[10px] mb-5 text-[13px] flex items-start gap-2"
              style={{
                padding: "12px 14px",
                background: "rgba(6,182,212,0.15)",
                color: "var(--text-secondary)",
              }}
            >
              <Info size={14} color="#06B6D4" className="shrink-0 mt-[1px]" />
              <span>
                Creates N devices with sequential IDs, continuing from the last existing number. Each device gets a unique auto-generated license with a 1-year expiry.
              </span>
            </div>
            <InputField
              label="Number of Devices (1–500)"
              icon={Layers}
              value={bulkCount}
              onChange={setBulkCount}
              placeholder="e.g. 20"
            />
            <InputField label="Firmware" icon={Cpu} value={bulkFirmware} onChange={setBulkFirmware} placeholder="1.0.0" />
            <InputField label="Hardware Version" icon={Cpu} value={bulkHw} onChange={setBulkHw} placeholder="HW-2.0" />
            <div className="flex gap-[10px] justify-end mt-2">
              <Btn onClick={resetBulk} variant="ghost">Cancel</Btn>
              <Btn onClick={handleBulk} disabled={!bulkCount || bulkLoading}>
                {bulkLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin-slow" />Creating...
                  </>
                ) : (
                  <>
                    <Layers size={14} />Create {bulkCount} devices
                  </>
                )}
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
