"use client";

import { LucideIcon, ArrowUp, ArrowDown } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  trend?: number;
}

export default function MetricCard({ icon: Icon, label, value, sub, color, trend }: MetricCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-[22px_24px] transition-colors duration-200 group"
      style={{
        background: "#151d2e",
        border: "1px solid #1e293b",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#1e293b";
      }}
    >
      <div
        className="absolute -top-5 -right-5 w-20 h-20 rounded-full"
        style={{ background: color, opacity: 0.06 }}
      />
      <div className="flex items-center gap-[10px] mb-[14px]">
        <div
          className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center"
          style={{ background: color + "18" }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <span className="text-[13px] font-medium" style={{ color: "#94A3B8" }}>
          {label}
        </span>
      </div>
      <div
        className="text-[30px] font-bold leading-none"
        style={{ color: "#F1F5F9", letterSpacing: -1 }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {(sub || trend != null) && (
        <div className="flex items-center gap-[6px] mt-2">
          {trend != null && (
            <span
              className="text-xs font-semibold flex items-center gap-[2px]"
              style={{ color: trend > 0 ? "#10B981" : "#EF4444" }}
            >
              {trend > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              {Math.abs(trend)}%
            </span>
          )}
          {sub && (
            <span className="text-xs" style={{ color: "#64748B" }}>
              {sub}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
