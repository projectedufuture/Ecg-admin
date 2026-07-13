"use client";

import { useRouter } from "next/navigation";
import { Download, Heart, Droplets, AlertCircle, RefreshCw } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Btn from "@/components/ui/Btn";
import { useSessions } from "@/lib/hooks";
import { downloadExport } from "@/lib/api";
import { formatDuration } from "@/lib/utils";
import { Session } from "@/types";

export default function SessionsPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSessions();

  const columns = [
    { key: "id", label: "Session ID" },
    { key: "name", label: "Name", render: (v: unknown) => (v as string) || "—" },
    { key: "userName", label: "User" },
    { key: "startTime", label: "Start", render: (v: unknown) => new Date(v as string).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) },
    { key: "duration", label: "Duration", render: (_v: unknown, row: Record<string, unknown>) => formatDuration(row.startTime as string, row.endTime as string) },
    { key: "avgHR", label: "Heart Rate", render: (v: unknown) => (<span className="font-semibold inline-flex items-center gap-1" style={{ color: "#F43F5E" }}><Heart size={12} />{v as number} bpm</span>) },
    { key: "avgSpo2", label: "SpO₂", render: (v: unknown) => (<span className="font-semibold inline-flex items-center gap-1" style={{ color: "#ff5fa2" }}><Droplets size={12} />{v as number}%</span>) },
    { key: "avgTemp", label: "Temp", render: (v: unknown) => `${v}°C` },
    { key: "dataSource", label: "Source", render: (v: unknown, row: Record<string, unknown>) => {
      const ended = new Date(row.endTime as string).getTime() > new Date(row.startTime as string).getTime();
      const source = ended && v === "live" ? "stored" : (v as string);
      return <StatusBadge status={source} />;
    } },
  ];

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto mb-4" style={{ color: "#EF4444" }} />
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Failed to load sessions</p>
        <Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn>
      </div>
    );
  }

  const sessions = (data?.items as unknown as Session[]) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold m-0" style={{ color: "var(--text-primary)" }}>Sessions</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>ECG, heart rate, and temperature recordings</p>
        </div>
        <Btn variant="ghost" onClick={() => downloadExport("sessions")}><Download size={14} />Export CSV</Btn>
      </div>
      <DataTable columns={columns} data={sessions as unknown as Record<string, unknown>[]} loading={isLoading} onRowClick={(row: Record<string, unknown>) => router.push(`/sessions/${(row as unknown as Session).id}`)} />
    </div>
  );
}
