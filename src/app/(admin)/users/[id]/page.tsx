"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  CalendarDays,
  Clock,
  Cpu,
  FileText,
  Activity,
  Heart,
  UserX,
  UserCheck,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Radio,
  Link as LinkIcon,
  Unlink,
  CheckCircle2,
  Info,
  Mail,
  Key,
} from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import StatusBadge from "@/components/ui/StatusBadge";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import { useUser, useUserSessions, useDevices } from "@/lib/hooks";
import { api } from "@/lib/api";

interface AssignResponse {
  success: boolean;
  data: {
    user: { id: string; name: string; email: string; deviceId: string };
    device: { id: string; firmware: string; licenseKey: string | null };
    emailSent: boolean;
    emailError?: string | null;
  };
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { data: userData, error, isLoading, mutate } = useUser(userId);
  const { data: sessionsData } = useUserSessions(userId);
  const { data: devicesData } = useDevices({ limit: 200 });

  const [modal, setModal] = useState<
    null | "deactivate" | "reactivate" | "assign" | "unassign"
  >(null);
  const [mutating, setMutating] = useState(false);

  // Assign state
  const [pickedDeviceId, setPickedDeviceId] = useState("");
  const [assignError, setAssignError] = useState("");
  const [assignResult, setAssignResult] = useState<AssignResponse["data"] | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "var(--bg-surface)" }} />
        ))}
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto mb-4" style={{ color: "#EF4444" }} />
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          {error ? "Failed to load user" : "User not found"}
        </p>
        <Btn onClick={() => mutate()} variant="ghost">
          <RefreshCw size={14} />Retry
        </Btn>
      </div>
    );
  }

  const user = userData as Record<string, unknown>;
  const sessionHistory =
    ((user.sessionHistory ||
      (sessionsData as Record<string, unknown>)?.items) as Record<string, unknown>[]) ?? [];

  const allDevices =
    (devicesData?.items as unknown as Array<{ id: string; userId: string | null; licenseKey?: string | null }>) ??
    [];
  const unassignedDevices = allDevices.filter((d) => !d.userId);

  const handleAction = async (action: "deactivate" | "reactivate") => {
    setMutating(true);
    try {
      await api.put(`/admin/users/${userId}/${action}`);
      await mutate();
      setModal(null);
    } catch {
      /* ignore */
    }
    setMutating(false);
  };

  const handleAssign = async () => {
    if (!pickedDeviceId) return;
    setMutating(true);
    setAssignError("");
    try {
      const resp = (await api.post(`/admin/users/${userId}/assign-device`, {
        deviceId: pickedDeviceId,
      })) as AssignResponse;
      setAssignResult(resp.data);
      await mutate();
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : "Assignment failed");
    }
    setMutating(false);
  };

  const closeAssign = () => {
    setModal(null);
    setPickedDeviceId("");
    setAssignError("");
    setAssignResult(null);
  };

  const doUnassign = async () => {
    setMutating(true);
    setAssignError("");
    try {
      await api.del(`/admin/users/${userId}/assign-device`);
      await mutate();
      setModal(null);
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : "Unassign failed");
    }
    setMutating(false);
  };

  const infoItems = [
    { l: "Registered", v: user.registeredDate as string, i: CalendarDays },
    { l: "Last Active", v: user.lastActive as string, i: Clock },
    {
      l: "Device",
      v: (user.deviceId as string) || "None",
      i: Cpu,
    },
    { l: "Total Sessions", v: String(user.sessions), i: FileText },
  ];

  const hasDevice = Boolean(user.deviceId);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Users", onClick: () => router.push("/users") },
          { label: user.name as string },
        ]}
      />
      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 2fr" }}>
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <div
            className="flex items-center justify-center text-2xl font-bold mb-4"
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, rgba(6,182,212,0.19), rgba(139,92,246,0.19))",
              color: "#06B6D4",
            }}
          >
            {(user.name as string)
              .split(" ")
              .map((n: string) => n[0])
              .join("")}
          </div>
          <h2 className="text-xl font-bold m-0" style={{ color: "var(--text-primary)" }}>
            {user.name as string}
          </h2>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>
            {user.email as string}
          </p>
          <div className="mt-4">
            <StatusBadge status={user.status as string} />
          </div>
          <div className="mt-6 flex flex-col gap-[14px]">
            {infoItems.map((item, i) => (
              <div key={i} className="flex items-center gap-[10px]">
                <item.i size={14} style={{ color: "var(--text-muted)" }} />
                <span className="text-xs flex-1" style={{ color: "var(--text-muted)" }}>
                  {item.l}
                </span>
                <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                  {item.v}
                </span>
              </div>
            ))}
          </div>

          {/* Device section */}
          <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--border-clr)" }}>
            {hasDevice ? (
              <div>
                <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  Assigned Device
                </div>
                <div
                  className="flex items-center justify-between rounded-[10px] mb-3"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)", padding: "10px 14px" }}
                >
                  <div className="flex items-center gap-2">
                    <Radio size={14} style={{ color: "#06B6D4" }} />
                    <code style={{ color: "var(--text-primary)" }}>{user.deviceId as string}</code>
                  </div>
                </div>
                <Btn
                  onClick={() => setModal("unassign")}
                  variant="ghost"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <Unlink size={14} />Unassign Device
                </Btn>
              </div>
            ) : (
              <div>
                <div
                  className="rounded-[10px] mb-3 text-[12px] flex items-start gap-2"
                  style={{
                    padding: "10px 12px",
                    background: "rgba(245,158,11,0.1)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    color: "#F59E0B",
                  }}
                >
                  <AlertCircle size={13} className="shrink-0 mt-[1px]" />
                  <span>This user has no device. Assign one so they can pair in the app.</span>
                </div>
                <Btn
                  onClick={() => setModal("assign")}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <LinkIcon size={14} />Assign Device
                </Btn>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {user.status === "active" ? (
              <Btn
                onClick={() => setModal("deactivate")}
                variant="danger"
                style={{ flex: 1, justifyContent: "center" }}
              >
                <UserX size={14} />Deactivate
              </Btn>
            ) : (
              <Btn
                onClick={() => setModal("reactivate")}
                variant="success"
                style={{ flex: 1, justifyContent: "center" }}
              >
                <UserCheck size={14} />Reactivate
              </Btn>
            )}
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold m-0" style={{ color: "var(--text-primary)" }}>
              Session History
            </h3>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {sessionHistory.length} sessions — click to view ECG
            </span>
          </div>
          {sessionHistory.length === 0 ? (
            <p className="text-center py-10 text-sm" style={{ color: "var(--text-muted)" }}>
              No sessions recorded yet
            </p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto">
              {sessionHistory.map((s) => (
                <div
                  key={s.id as string}
                  onClick={() => router.push(`/sessions/${s.id}`)}
                  className="flex items-center gap-[14px] rounded-[10px] cursor-pointer transition-colors duration-200"
                  style={{ padding: "12px 14px", border: "1px solid var(--border-clr)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "#06B6D4";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-clr)";
                  }}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(6,182,212,0.15)" }}
                  >
                    <Activity size={16} color="#06B6D4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                      {s.id as string}
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {new Date(s.startTime as string).toLocaleDateString()} &middot; {s.duration as number} min
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-xs font-bold flex items-center gap-[3px]" style={{ color: "#F43F5E" }}>
                        <Heart size={11} />
                        {s.avgHR as number}
                      </div>
                      <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>bpm</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold" style={{ color: "#F59E0B" }}>
                        {s.avgTemp as string}°
                      </div>
                      <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>temp</div>
                    </div>
                  </div>
                  <StatusBadge status={s.dataSource as string} />
                  <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assign Device modal */}
      <Modal open={modal === "assign"} title="Assign Device" onClose={closeAssign}>
        {assignResult ? (
          <div>
            <div className="text-center mb-4">
              <div
                className="inline-flex items-center justify-center mb-3"
                style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(16,185,129,0.12)" }}
              >
                <CheckCircle2 size={24} color="#10B981" />
              </div>
              <h3 className="text-[17px] font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                Device Assigned
              </h3>
              <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                <code style={{ color: "#06B6D4" }}>{assignResult.device.id}</code> is now assigned to{" "}
                <strong style={{ color: "var(--text-primary)" }}>{assignResult.user.name}</strong>.
              </p>
            </div>

            {assignResult.device.licenseKey && (
              <div
                className="rounded-[10px] mb-3 p-3"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)" }}
              >
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                  <Key size={12} />License Key
                </div>
                <code className="text-sm font-bold" style={{ color: "#06B6D4", letterSpacing: 1 }}>
                  {assignResult.device.licenseKey}
                </code>
              </div>
            )}

            <div
              className="rounded-[10px] mb-4 p-3 flex items-start gap-2 text-[13px]"
              style={{
                background: assignResult.emailSent ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                border: assignResult.emailSent
                  ? "1px solid rgba(16,185,129,0.25)"
                  : "1px solid rgba(245,158,11,0.25)",
                color: assignResult.emailSent ? "#10B981" : "#F59E0B",
              }}
            >
              <Mail size={14} className="shrink-0 mt-[1px]" />
              <span>
                {assignResult.emailSent
                  ? `Email with device details sent to ${assignResult.user.email}`
                  : `Email could not be sent${
                      assignResult.emailError ? ` (${assignResult.emailError})` : ""
                    }. Please share the license key manually.`}
              </span>
            </div>

            <div className="flex justify-end">
              <Btn onClick={closeAssign}>Done</Btn>
            </div>
          </div>
        ) : (
          <>
            {assignError && (
              <div
                className="flex items-center gap-2 rounded-[10px] px-[14px] py-[10px] mb-4 text-[13px]"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#EF4444",
                }}
              >
                <AlertCircle size={14} />{assignError}
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
                Pick an unassigned device. An email with the device ID and license key will be sent to{" "}
                <strong style={{ color: "var(--text-primary)" }}>{user.email as string}</strong>.
              </span>
            </div>

            <label
              className="block text-xs font-semibold mb-[6px] uppercase"
              style={{ color: "var(--text-secondary)", letterSpacing: 0.5 }}
            >
              Available Devices ({unassignedDevices.length})
            </label>
            {unassignedDevices.length === 0 ? (
              <div
                className="rounded-[10px] text-center text-[13px] mb-4 py-6"
                style={{
                  border: "1px dashed var(--border-clr)",
                  color: "var(--text-muted)",
                }}
              >
                No unassigned devices available. Create more from the Devices page.
              </div>
            ) : (
              <div
                className="flex flex-wrap gap-[6px] mb-4 overflow-auto"
                style={{ maxHeight: 200 }}
              >
                {unassignedDevices.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setPickedDeviceId(d.id)}
                    className="rounded-lg text-xs font-medium font-sans"
                    style={{
                      background: pickedDeviceId === d.id ? "rgba(6,182,212,0.15)" : "var(--bg-input)",
                      border:
                        pickedDeviceId === d.id
                          ? "1px solid rgba(6,182,212,0.38)"
                          : "1px solid var(--border-clr)",
                      padding: "6px 12px",
                      color: pickedDeviceId === d.id ? "#06B6D4" : "var(--text-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    {d.id}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-[10px] justify-end mt-2">
              <Btn onClick={closeAssign} variant="ghost">Cancel</Btn>
              <Btn onClick={handleAssign} disabled={!pickedDeviceId || mutating}>
                {mutating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin-slow" />Assigning...
                  </>
                ) : (
                  <>
                    <LinkIcon size={14} />Assign &amp; Email
                  </>
                )}
              </Btn>
            </div>
          </>
        )}
      </Modal>

      {/* Unassign modal */}
      <Modal open={modal === "unassign"} title="Unassign Device" onClose={() => setModal(null)}>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>
          Remove device <code style={{ color: "#06B6D4" }}>{user.deviceId as string}</code> from{" "}
          <strong style={{ color: "var(--text-primary)" }}>{user.name as string}</strong>? The device will become available for reassignment.
        </p>
        {assignError && (
          <div
            className="flex items-center gap-2 rounded-[10px] px-[14px] py-[10px] mb-4 text-[13px]"
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#EF4444",
            }}
          >
            <AlertCircle size={14} />{assignError}
          </div>
        )}
        <div className="flex gap-[10px] justify-end">
          <Btn onClick={() => setModal(null)} variant="ghost">Cancel</Btn>
          <Btn onClick={doUnassign} variant="danger" disabled={mutating}>
            {mutating ? (
              <>
                <RefreshCw size={14} className="animate-spin-slow" />Processing...
              </>
            ) : (
              <>
                <Unlink size={14} />Unassign
              </>
            )}
          </Btn>
        </div>
      </Modal>

      <Modal open={modal === "deactivate"} title="Deactivate User" onClose={() => setModal(null)}>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>
          Are you sure you want to deactivate{" "}
          <strong style={{ color: "var(--text-primary)" }}>{user.name as string}</strong>? They will no longer be able to log in. All data is retained.
        </p>
        <div className="flex gap-[10px] justify-end">
          <Btn onClick={() => setModal(null)} variant="ghost">Cancel</Btn>
          <Btn onClick={() => handleAction("deactivate")} variant="danger" disabled={mutating}>
            {mutating ? (
              <>
                <RefreshCw size={14} className="animate-spin-slow" />Processing...
              </>
            ) : (
              "Deactivate"
            )}
          </Btn>
        </div>
      </Modal>
      <Modal open={modal === "reactivate"} title="Reactivate User" onClose={() => setModal(null)}>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>
          Reactivate <strong style={{ color: "var(--text-primary)" }}>{user.name as string}</strong>?
        </p>
        <div className="flex gap-[10px] justify-end">
          <Btn onClick={() => setModal(null)} variant="ghost">Cancel</Btn>
          <Btn onClick={() => handleAction("reactivate")} variant="success" disabled={mutating}>
            {mutating ? (
              <>
                <RefreshCw size={14} className="animate-spin-slow" />Processing...
              </>
            ) : (
              "Reactivate"
            )}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
