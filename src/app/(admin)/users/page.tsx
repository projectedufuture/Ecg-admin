"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  AlertCircle,
  RefreshCw,
  UserPlus,
  User as UserIcon,
  Mail,
  Radio,
  CheckCircle2,
  Info,
  Clipboard,
} from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import InputField from "@/components/ui/InputField";
import { useUsers, useDevices } from "@/lib/hooks";
import { api, downloadExport } from "@/lib/api";
import { User } from "@/types";

interface CreateUserResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    email: string;
    deviceId: string | null;
    mustChangePassword: boolean;
    assignedDevice: { id: string; firmware: string; licenseKey: string | null } | null;
    emailSent: boolean;
  };
  debug?: { tempPassword?: string; emailError?: string };
}

export default function UsersPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useUsers();
  const { data: devicesData } = useDevices({ limit: 200 });

  const [showCreate, setShowCreate] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cDeviceId, setCDeviceId] = useState("");
  const [cLoading, setCLoading] = useState(false);
  const [cError, setCError] = useState("");
  const [cResult, setCResult] = useState<CreateUserResponse | null>(null);

  const columns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "registeredDate", label: "Registered" },
    { key: "lastActive", label: "Last Active" },
    { key: "sessions", label: "Sessions" },
    {
      key: "deviceId",
      label: "Device",
      render: (v: unknown) =>
        v ? String(v) : <span style={{ color: "var(--text-muted)" }}>—</span>,
    },
    {
      key: "lastLocation",
      label: "Location",
      sortable: false,
      render: (_v: unknown, row: Record<string, unknown>) => {
        const u = row as unknown as User;
        if (u.status !== "active") {
          return (
            <span
              className="inline-flex items-center rounded-[8px] text-[11px] font-semibold"
              style={{
                padding: "3px 10px",
                background: "rgba(148,163,184,0.12)",
                border: "1px solid rgba(148,163,184,0.35)",
                color: "#94A3B8",
              }}
            >
              Not Activated
            </span>
          );
        }
        const loc = u.lastLocation;
        if (!loc || loc.lat == null || loc.lng == null) {
          return <span style={{ color: "var(--text-muted)" }}>—</span>;
        }
        const label = loc.address || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
        const mapsUrl = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
        return (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs"
            style={{ color: "#06B6D4", textDecoration: "none" }}
            title={`${loc.lat}, ${loc.lng}`}
          >
            {label}
          </a>
        );
      },
    },
    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
  ];

  const resetCreate = () => {
    setShowCreate(false);
    setCName("");
    setCEmail("");
    setCDeviceId("");
    setCError("");
    setCResult(null);
  };

  const handleCreate = async () => {
    if (!cName || !cEmail) return;
    setCLoading(true);
    setCError("");
    try {
      const body: { name: string; email: string; deviceId?: string } = {
        name: cName,
        email: cEmail,
      };
      if (cDeviceId.trim()) body.deviceId = cDeviceId.trim();
      const resp = (await api.post("/admin/users", body)) as CreateUserResponse;
      setCResult(resp);
      await mutate();
    } catch (err: unknown) {
      setCError(err instanceof Error ? err.message : "Failed to create user");
    }
    setCLoading(false);
  };

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto mb-4" style={{ color: "#EF4444" }} />
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Failed to load users</p>
        <Btn onClick={() => mutate()} variant="ghost">
          <RefreshCw size={14} />Retry
        </Btn>
      </div>
    );
  }

  const users = (data?.items as unknown as User[]) ?? [];
  const allDevices = (devicesData?.items as unknown as Array<{ id: string; userId: string | null }>) ?? [];
  const unassignedDevices = allDevices.filter((d) => !d.userId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold m-0" style={{ color: "var(--text-primary)" }}>Users</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
            Manage end-consumer accounts · email onboarding
          </p>
        </div>
        <div className="flex gap-2">
          <Btn onClick={() => setShowCreate(true)}>
            <UserPlus size={14} />Create User
          </Btn>
          <Btn variant="ghost" onClick={() => downloadExport("users")}>
            <Download size={14} />Export CSV
          </Btn>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users as unknown as Record<string, unknown>[]}
        loading={isLoading}
        onRowClick={(row: Record<string, unknown>) => router.push(`/users/${(row as unknown as User).id}`)}
      />

      <Modal open={showCreate} title="Create New User" onClose={resetCreate}>
        {cResult ? (
          <div>
            <div className="text-center mb-4">
              <div
                className="inline-flex items-center justify-center mb-3"
                style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(16,185,129,0.12)" }}
              >
                <CheckCircle2 size={24} color="#10B981" />
              </div>
              <h3 className="text-[17px] font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                User Created
              </h3>
              <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                <strong style={{ color: "var(--text-primary)" }}>{cResult.data.name}</strong> ({cResult.data.email})
              </p>
            </div>

            <div
              className="rounded-[10px] mb-4 p-3"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)" }}
            >
              <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                Summary
              </div>
              <div className="text-[13px] space-y-1" style={{ color: "var(--text-secondary)" }}>
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>User ID:</strong>{" "}
                  <code style={{ color: "#06B6D4" }}>{cResult.data.id}</code>
                </div>
                {cResult.data.assignedDevice && (
                  <>
                    <div>
                      <strong style={{ color: "var(--text-primary)" }}>Device:</strong>{" "}
                      <code style={{ color: "#06B6D4" }}>{cResult.data.assignedDevice.id}</code>
                    </div>
                    {cResult.data.assignedDevice.licenseKey && (
                      <div>
                        <strong style={{ color: "var(--text-primary)" }}>License Key:</strong>{" "}
                        <code style={{ color: "#06B6D4" }}>{cResult.data.assignedDevice.licenseKey}</code>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>Credentials email:</strong>{" "}
                  {cResult.data.emailSent ? (
                    <span style={{ color: "#10B981" }}>sent ✓</span>
                  ) : (
                    <span style={{ color: "#F59E0B" }}>not sent</span>
                  )}
                </div>
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>First login:</strong>{" "}
                  <span style={{ color: "#F59E0B" }}>user must change password</span>
                </div>
              </div>
            </div>

            {cResult.debug?.tempPassword && (
              <div
                className="rounded-[10px] mb-4 p-3"
                style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}
              >
                <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "#F59E0B" }}>
                  Temporary password (dev-only)
                </div>
                <div className="flex items-center justify-between">
                  <code className="text-sm font-bold" style={{ color: "#F1F5F9", letterSpacing: 1 }}>
                    {cResult.debug.tempPassword}
                  </code>
                  <button
                    onClick={() =>
                      cResult.debug?.tempPassword &&
                      navigator.clipboard?.writeText(cResult.debug.tempPassword)
                    }
                    className="bg-transparent border-none cursor-pointer p-1"
                    title="Copy"
                  >
                    <Clipboard size={16} style={{ color: "var(--text-muted)" }} />
                  </button>
                </div>
                {cResult.debug.emailError && (
                  <div className="text-[11px] mt-2" style={{ color: "#EF4444" }}>
                    Email error: {cResult.debug.emailError}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-[10px] justify-end">
              <Btn variant="ghost" onClick={() => { setCResult(null); setCName(""); setCEmail(""); setCDeviceId(""); }}>
                Create Another
              </Btn>
              <Btn onClick={resetCreate}>Done</Btn>
            </div>
          </div>
        ) : (
          <>
            {cError && (
              <div
                className="flex items-center gap-2 rounded-[10px] px-[14px] py-[10px] mb-4 text-[13px]"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#EF4444",
                }}
              >
                <AlertCircle size={14} />{cError}
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
                A random password is generated and emailed to the user along with their credentials and (if assigned) device + license key. The user will be required to change their password on first login.
              </span>
            </div>

            <InputField label="Name" icon={UserIcon} value={cName} onChange={setCName} placeholder="e.g. Arjun Reddy" />
            <InputField label="Email" icon={Mail} value={cEmail} onChange={setCEmail} placeholder="user@example.com" />
            <InputField
              label="Assign Device (optional)"
              icon={Radio}
              value={cDeviceId}
              onChange={setCDeviceId}
              placeholder="ECG-NNNNN — leave empty to create without device"
            />

            {unassignedDevices.length > 0 && (
              <div className="mb-4">
                <label
                  className="block text-xs font-semibold mb-[6px] uppercase"
                  style={{ color: "var(--text-secondary)", letterSpacing: 0.5 }}
                >
                  Unassigned Devices
                </label>
                <div className="flex flex-wrap gap-[6px]">
                  {unassignedDevices.slice(0, 10).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setCDeviceId(d.id)}
                      className="rounded-lg text-xs font-medium font-sans"
                      style={{
                        background: cDeviceId === d.id ? "rgba(6,182,212,0.15)" : "var(--bg-input)",
                        border:
                          cDeviceId === d.id
                            ? "1px solid rgba(6,182,212,0.38)"
                            : "1px solid var(--border-clr)",
                        padding: "6px 12px",
                        color: cDeviceId === d.id ? "#06B6D4" : "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      {d.id}
                    </button>
                  ))}
                  {unassignedDevices.length > 10 && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      +{unassignedDevices.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-[10px] justify-end mt-2">
              <Btn onClick={resetCreate} variant="ghost">Cancel</Btn>
              <Btn onClick={handleCreate} disabled={!cName || !cEmail || cLoading}>
                {cLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin-slow" />Creating...
                  </>
                ) : (
                  <>
                    <UserPlus size={14} />Create User
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
