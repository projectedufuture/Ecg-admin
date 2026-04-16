"use client";

import { useRouter } from "next/navigation";
import { Download, AlertCircle, RefreshCw } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Btn from "@/components/ui/Btn";
import { useUsers } from "@/lib/hooks";
import { downloadExport } from "@/lib/api";
import { User } from "@/types";

export default function UsersPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useUsers();

  const columns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "registeredDate", label: "Registered" },
    { key: "lastActive", label: "Last Active" },
    { key: "sessions", label: "Sessions" },
    { key: "deviceId", label: "Device", render: (v: unknown) => v ? String(v) : <span style={{ color: "var(--text-muted)" }}>—</span> },
    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
  ];

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto mb-4" style={{ color: "#EF4444" }} />
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Failed to load users</p>
        <Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn>
      </div>
    );
  }

  const users = (data?.items as unknown as User[]) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold m-0" style={{ color: "var(--text-primary)" }}>Users</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>Manage end-consumer accounts</p>
        </div>
        <Btn variant="ghost" onClick={() => downloadExport("users")}><Download size={14} />Export CSV</Btn>
      </div>
      <DataTable
        columns={columns}
        data={users as unknown as Record<string, unknown>[]}
        loading={isLoading}
        onRowClick={(row: Record<string, unknown>) => router.push(`/users/${(row as unknown as User).id}`)}
      />
    </div>
  );
}
