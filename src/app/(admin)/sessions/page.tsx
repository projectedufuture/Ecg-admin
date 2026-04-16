"use client";

import { useRouter } from "next/navigation";
import { Download, Heart, AlertCircle, RefreshCw } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Btn from "@/components/ui/Btn";
import { useSessions } from "@/lib/hooks";
import { downloadExport } from "@/lib/api";
import { Session } from "@/types";

export default function SessionsPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSessions();

  const columns = [
    { key: "id", label: "Session ID" },
    { key: "userName", label: "User" },
    { key: "startTime", label: "Start", render: (v: unknown) => new Date(v as string).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) },
    { key: "duration", label: "Duration", render: (v: unknown) => `${v} min` },
    { key: "avgHR", label: "Heart Rate", render: (v: unknown) => (<span className="font-semibold inline-flex items-center gap-1" style={{ color: "#F43F5E" }}><Heart size={12} />{v as number} bpm</span>) },
    { key: "avgTemp", label: "Temp", render: (v: unknown) => `${v}°C` },
    { key: "dataSource", label: "Source", render: (v: unknown) => <StatusBadge status={v as string} /> },
  ];

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto mb-4" style={{ color: "#EF4444" }} />
        <p className="text-sm mb-4" style={{ color: "#94A3B8" }}>Failed to load sessions</p>
        <Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn>
      </div>
    );
  }

  const sessions = (data?.items as unknown as Session[]) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold m-0" style={{ color: "#F1F5F9" }}>Sessions</h1>
          <p className="text-[13px] mt-1" style={{ color: "#64748B" }}>ECG, heart rate, and temperature recordings</p>
        </div>
        <Btn variant="ghost" onClick={() => downloadExport("sessions")}><Download size={14} />Export CSV</Btn>
      </div>
      <DataTable columns={columns} data={sessions as unknown as Record<string, unknown>[]} loading={isLoading} onRowClick={(row: Record<string, unknown>) => router.push(`/sessions/${(row as unknown as Session).id}`)} />
    </div>
  );
}
