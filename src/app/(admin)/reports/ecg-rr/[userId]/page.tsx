"use client";

import { useParams, useRouter } from "next/navigation";
import { AlertCircle, FileBarChart2, Inbox, RefreshCw } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Btn from "@/components/ui/Btn";
import { useUser, useUserSessions } from "@/lib/hooks";
import { Session, User } from "@/types";

/**
 * ECG / RR Analysis — level 3: the selected user's sessions.
 *
 * Reuses the existing per-user session hook, so the relationship between users
 * and sessions comes straight from the existing data model. Each row opens that
 * session's full ECG/RR report.
 */
export default function EcgRrUserSessionsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const userQuery = useUser(userId);
  const sessionsQuery = useUserSessions(userId);

  const user = userQuery.data as unknown as User | undefined;
  const sessions = ((sessionsQuery.data as { items?: unknown[] })?.items ?? []) as unknown as Session[];

  const openReport = (sessionId: string) =>
    router.push(`/reports/ecg-rr/${userId}/${sessionId}`);

  const columns = [
    {
      key: "startTime",
      label: "Session",
      render: (v: unknown, row: Record<string, unknown>) => {
        const name = row.name as string | null;
        const started = new Date(v as string);
        const when = Number.isNaN(started.getTime()) ? String(v) : started.toLocaleString();
        return (
          <div>
            <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {name || "Untitled recording"}
            </div>
            <div className="text-[11px] mt-[2px]" style={{ color: "var(--text-muted)" }}>
              {when}
            </div>
          </div>
        );
      },
    },
    { key: "deviceId", label: "Device" },
    {
      key: "duration",
      label: "Duration",
      render: (v: unknown) => `${v as number} min`,
    },
    {
      key: "dataPoints",
      label: "Data Points",
      render: (v: unknown) => ((v as number) ?? 0).toLocaleString(),
    },
    {
      key: "avgHR",
      label: "Avg HR",
      render: (v: unknown) =>
        (v as number) > 0 ? `${v as number} BPM` : <span style={{ color: "var(--text-muted)" }}>—</span>,
    },
    {
      key: "dataSource",
      label: "Source",
      render: (v: unknown) => <StatusBadge status={v as string} />,
    },
    {
      key: "_action",
      label: "Report",
      sortable: false,
      render: (_v: unknown, row: Record<string, unknown>) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openReport(row.id as string);
          }}
          className="inline-flex items-center gap-[6px] rounded-lg text-[12px] font-semibold font-sans whitespace-nowrap transition-colors duration-150"
          style={{
            padding: "6px 12px",
            background: "rgba(6,182,212,0.15)",
            border: "1px solid rgba(6,182,212,0.25)",
            color: "#06B6D4",
            cursor: "pointer",
          }}
        >
          <FileBarChart2 size={13} />
          View full report
        </button>
      ),
    },
  ];

  const error = userQuery.error || sessionsQuery.error;
  const isLoading = userQuery.isLoading || sessionsQuery.isLoading;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Reports", onClick: () => router.push("/reports") },
          { label: "ECG / RR Analysis", onClick: () => router.push("/reports/ecg-rr") },
          { label: user?.name || userId },
        ]}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold m-0" style={{ color: "var(--text-primary)" }}>
            {user?.name || "User"}
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
            {user?.email
              ? `${user.email} · select a session to open its ECG/RR report`
              : "Select a session to open its ECG/RR report."}
          </p>
        </div>
        <Btn variant="ghost" onClick={() => sessionsQuery.mutate()}>
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
            Unable to load sessions
          </p>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>
            Please try again.
          </p>
          <div className="mt-4 flex justify-center">
            <Btn variant="ghost" onClick={() => sessionsQuery.mutate()}>
              <RefreshCw size={14} />
              Try again
            </Btn>
          </div>
        </div>
      ) : !isLoading && sessions.length === 0 ? (
        <div
          className="rounded-2xl text-center"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-clr)",
            padding: "48px 28px",
          }}
        >
          <div
            className="flex items-center justify-center mx-auto"
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              background: "rgba(100,116,139,0.12)",
              border: "1px solid rgba(100,116,139,0.25)",
            }}
          >
            <Inbox size={26} style={{ color: "#64748B" }} />
          </div>
          <p className="text-[16px] font-bold mt-4" style={{ color: "var(--text-primary)" }}>
            No recorded sessions
          </p>
          <p
            className="text-[13px] mt-2 mx-auto leading-relaxed"
            style={{ color: "var(--text-secondary)", maxWidth: 380 }}
          >
            This user has no recorded sessions yet, so there is nothing to report on.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={sessions as unknown as Record<string, unknown>[]}
          loading={isLoading}
          pageSize={12}
          onRowClick={(row) => openReport(row.id as string)}
        />
      )}
    </div>
  );
}
