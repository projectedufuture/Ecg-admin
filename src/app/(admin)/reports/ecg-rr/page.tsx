"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, ChevronRight, RefreshCw } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Btn from "@/components/ui/Btn";
import { useUsers } from "@/lib/hooks";
import { User } from "@/types";

/**
 * ECG / RR Analysis — level 2 of the drilldown: pick a user.
 *
 * Uses the existing admin users endpoint and the existing DataTable, so search,
 * sorting and pagination behave exactly as they do on the Users page.
 */
export default function EcgRrUsersPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useUsers({ limit: 100, sort: "name", order: "asc" });

  const users = (data?.items ?? []) as unknown as User[];

  const columns = [
    { key: "name", label: "User" },
    { key: "email", label: "Email" },
    {
      key: "deviceId",
      label: "Device",
      render: (v: unknown) =>
        v ? (
          <code
            className="text-xs rounded"
            style={{ color: "#06B6D4", background: "rgba(6,182,212,0.15)", padding: "2px 8px" }}
          >
            {v as string}
          </code>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>—</span>
        ),
    },
    { key: "sessions", label: "Sessions" },
    {
      key: "lastActive",
      label: "Last Active",
      render: (v: unknown) =>
        v ? new Date(v as string).toLocaleDateString() : <span style={{ color: "var(--text-muted)" }}>—</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v: unknown) => <StatusBadge status={v as string} />,
    },
    {
      key: "_open",
      label: "",
      sortable: false,
      render: () => <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />,
    },
  ];

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Reports", onClick: () => router.push("/reports") },
          { label: "ECG / RR Analysis" },
        ]}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold m-0" style={{ color: "var(--text-primary)" }}>
            ECG / RR Analysis
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
            Select a user to view their session-wise ECG/RR reports.
          </p>
        </div>
        <Btn variant="ghost" onClick={() => mutate()}>
          <RefreshCw size={14} />
          Refresh
        </Btn>
      </div>

      {error ? (
        <div
          className="rounded-2xl text-center"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-clr)",
            padding: "44px 28px",
          }}
        >
          <AlertCircle size={26} style={{ color: "#EF4444", margin: "0 auto" }} />
          <p className="text-[14px] font-semibold mt-3" style={{ color: "var(--text-primary)" }}>
            Unable to load users
          </p>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>
            Please try again.
          </p>
          <div className="mt-4 flex justify-center">
            <Btn variant="ghost" onClick={() => mutate()}>
              <RefreshCw size={14} />
              Try again
            </Btn>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={users as unknown as Record<string, unknown>[]}
          loading={isLoading}
          pageSize={12}
          onRowClick={(row) => router.push(`/reports/ecg-rr/${row.id as string}`)}
        />
      )}
    </div>
  );
}
