"use client";

import { useState } from "react";
import {
  Download,
  ShieldCheck,
  Shield,
  AlertCircle,
  RefreshCw,
  Info,
  Power,
  PowerOff,
} from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import MetricCard from "@/components/ui/MetricCard";
import Btn from "@/components/ui/Btn";
import { useLicenses } from "@/lib/hooks";
import { api, downloadExport } from "@/lib/api";
import { License } from "@/types";

export default function LicensesPage() {
  const { data, error, isLoading, mutate } = useLicenses();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const toggleLicense = async (license: License) => {
    setActionError(null);
    setBusyId(license.id);
    try {
      const action = license.status === "active" ? "deactivate" : "activate";
      await api.put(`/admin/licenses/${license.id}/${action}`);
      await mutate();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    }
    setBusyId(null);
  };

  const columns = [
    { key: "id", label: "License ID" },
    {
      key: "licenseKey",
      label: "Key",
      render: (v: unknown) => (
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
      ),
    },
    { key: "deviceId", label: "Device" },
    {
      key: "createdAt",
      label: "Created Date",
      render: (v: unknown) =>
        v ? (
          new Date(v as string).toLocaleDateString()
        ) : (
          <span style={{ color: "var(--text-muted)" }}>—</span>
        ),
    },
    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
    {
      key: "_actions",
      label: "Actions",
      sortable: false,
      render: (_v: unknown, row: Record<string, unknown>) => {
        const lic = row as unknown as License;
        const isActive = lic.status === "active";
        const disabled = busyId === lic.id;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) toggleLicense(lic);
            }}
            disabled={disabled}
            className="inline-flex items-center gap-1 rounded-[8px] text-[11px] font-semibold"
            style={{
              padding: "5px 10px",
              background: isActive ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
              border: `1px solid ${isActive ? "rgba(239,68,68,0.35)" : "rgba(16,185,129,0.35)"}`,
              color: isActive ? "#EF4444" : "#10B981",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
            }}
            title={isActive ? "Deactivate license" : "Activate license"}
          >
            {disabled ? (
              <>
                <RefreshCw size={11} className="animate-spin-slow" />
                Working…
              </>
            ) : isActive ? (
              <>
                <PowerOff size={11} />
                Deactivate
              </>
            ) : (
              <>
                <Power size={11} />
                Activate
              </>
            )}
          </button>
        );
      },
    },
  ];

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto mb-4" style={{ color: "#EF4444" }} />
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Failed to load licenses</p>
        <Btn onClick={() => mutate()} variant="ghost">
          <RefreshCw size={14} />Retry
        </Btn>
      </div>
    );
  }

  const licenses = (data?.items as unknown as License[]) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold m-0" style={{ color: "var(--text-primary)" }}>Licenses</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
            Auto-generated with every device · activate or revoke per row
          </p>
        </div>
        <Btn variant="ghost" onClick={() => downloadExport("licenses")}>
          <Download size={14} />Export
        </Btn>
      </div>

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
          Licenses are issued automatically when a device is registered or bulk-created. Use the per-row action to activate or deactivate a license. To create a new license, register a new device under <strong style={{ color: "var(--text-primary)" }}>Devices</strong>.
        </span>
      </div>

      {actionError && (
        <div
          className="flex items-center gap-2 rounded-[10px] px-[14px] py-[10px] mb-4 text-[13px]"
          style={{
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "#EF4444",
          }}
        >
          <AlertCircle size={14} />{actionError}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-5">
        <MetricCard
          icon={ShieldCheck}
          label="Active Licenses"
          value={licenses.filter((l) => l.status === "active").length}
          color="#10B981"
        />
        <MetricCard
          icon={Shield}
          label="Inactive"
          value={licenses.filter((l) => l.status === "inactive").length}
          color="#EF4444"
        />
        <MetricCard
          icon={AlertCircle}
          label="Expired"
          value={licenses.filter((l) => l.status === "expired").length}
          color="#F59E0B"
        />
      </div>

      <DataTable
        columns={columns}
        data={licenses as unknown as Record<string, unknown>[]}
        loading={isLoading}
      />
    </div>
  );
}
