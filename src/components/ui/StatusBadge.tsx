"use client";

import { CheckCircle2, XCircle, AlertCircle, Wifi, Cpu, RefreshCw, LucideIcon } from "lucide-react";

interface BadgeConfig {
  bg: string;
  color: string;
  Icon: LucideIcon;
}

const statusMap: Record<string, BadgeConfig> = {
  active: { bg: "bg-ecg-green-soft", color: "text-ecg-green", Icon: CheckCircle2 },
  inactive: { bg: "bg-ecg-red-soft", color: "text-ecg-red", Icon: XCircle },
  expired: { bg: "bg-ecg-amber-soft", color: "text-ecg-amber", Icon: AlertCircle },
  live: { bg: "bg-ecg-green-soft", color: "text-ecg-green", Icon: Wifi },
  stored: { bg: "bg-ecg-purple-soft", color: "text-ecg-purple", Icon: Cpu },
  mixed: { bg: "bg-ecg-accent-soft", color: "text-ecg-accent", Icon: RefreshCw },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusMap[status] || statusMap.active;
  const { Icon } = config;

  return (
    <span
      className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-xs font-semibold capitalize tracking-wide"
      style={{
        background:
          status === "active" ? "rgba(16,185,129,0.12)" :
          status === "inactive" ? "rgba(239,68,68,0.12)" :
          status === "expired" ? "rgba(245,158,11,0.12)" :
          status === "live" ? "rgba(16,185,129,0.12)" :
          status === "stored" ? "rgba(139,92,246,0.12)" :
          status === "mixed" ? "rgba(6,182,212,0.15)" :
          "rgba(16,185,129,0.12)",
        color:
          status === "active" ? "#10B981" :
          status === "inactive" ? "#EF4444" :
          status === "expired" ? "#F59E0B" :
          status === "live" ? "#10B981" :
          status === "stored" ? "#8B5CF6" :
          status === "mixed" ? "#06B6D4" :
          "#10B981",
      }}
    >
      <Icon size={12} />
      {status.replace("_", " ")}
    </span>
  );
}
