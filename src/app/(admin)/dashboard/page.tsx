"use client";

import { Users, FileText, Radio, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import MetricCard from "@/components/ui/MetricCard";
import { useDashboard } from "@/lib/hooks";
import Btn from "@/components/ui/Btn";

export default function DashboardPage() {
  const { data, error, isLoading, mutate } = useDashboard();
  const months = "JFMAMJJASOND";

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-7">
          <div><h1 className="text-2xl font-bold m-0" style={{ color: "#F1F5F9" }}>Dashboard</h1></div>
        </div>
        <div className="grid grid-cols-4 gap-[14px] mb-6">
          {[1,2,3,4].map(i => <div key={i} className="h-[130px] rounded-2xl animate-pulse" style={{ background: "#151d2e" }} />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="h-[180px] rounded-2xl animate-pulse" style={{ background: "#151d2e" }} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto mb-4" style={{ color: "#EF4444" }} />
        <p className="text-sm mb-4" style={{ color: "#94A3B8" }}>Failed to load dashboard data</p>
        <Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn>
      </div>
    );
  }

  const d = data as Record<string, unknown> | undefined;
  const totalUsers = (d?.totalUsers as number) ?? 0;
  const totalSessions = (d?.totalSessions as number) ?? 0;
  const activeDevices = (d?.activeDevices as number) ?? 0;
  const activeLicenses = (d?.activeLicenses as number) ?? 0;
  const trends = (d?.trends as Record<string, number>) ?? {};
  const regData = [12, 18, 8, 22, 15, 28, 34, 19, 25, 31, 20, 27];
  const sessData = [45, 62, 38, 71, 55, 80, 92, 67, 78, 95, 60, 85];

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold m-0" style={{ color: "#F1F5F9" }}>Dashboard</h1>
          <p className="text-[13px] mt-1" style={{ color: "#64748B" }}>Platform overview and system health</p>
        </div>
        <div className="flex items-center gap-2 px-[14px] py-[6px] rounded-full text-[13px] font-semibold" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>
          <CheckCircle2 size={14} />All Systems Operational
        </div>
      </div>

      <div className="grid grid-cols-4 gap-[14px] mb-6">
        <MetricCard icon={Users} label="Total Users" value={totalUsers} sub="vs last month" trend={trends.usersTrend ?? 0} color="#06B6D4" />
        <MetricCard icon={FileText} label="Sessions" value={totalSessions} sub="vs last month" trend={trends.sessionsTrend ?? 0} color="#10B981" />
        <MetricCard icon={Radio} label="Active Devices" value={activeDevices} color="#8B5CF6" />
        <MetricCard icon={ShieldCheck} label="Active Licenses" value={activeLicenses} color="#F59E0B" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { title: "User Registrations", data: regData, color: "#06B6D4" },
          { title: "Sessions Recorded", data: sessData, color: "#10B981" },
        ].map((ch, ci) => (
          <div key={ci} className="rounded-2xl p-6" style={{ background: "#151d2e", border: "1px solid #1e293b" }}>
            <h3 className="text-[15px] font-semibold mb-4" style={{ color: "#F1F5F9" }}>{ch.title} (Monthly)</h3>
            <div className="flex items-end gap-[6px]" style={{ height: 100 }}>
              {ch.data.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t" style={{ height: (v / Math.max(...ch.data)) * 80, background: `linear-gradient(to top, ${ch.color}40, ${ch.color})`, minHeight: 4 }} />
                  <span className="text-[9px]" style={{ color: "#64748B" }}>{months[i]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
