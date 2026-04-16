"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Activity, Radio, ShieldCheck,
  Heart, ChevronLeft, ChevronRight,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { id: "users", label: "Users", icon: Users, href: "/users" },
  { id: "sessions", label: "Sessions", icon: Activity, href: "/sessions" },
  { id: "devices", label: "Devices", icon: Radio, href: "/devices" },
  { id: "licenses", label: "Licenses", icon: ShieldCheck, href: "/licenses" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div
      className="flex flex-col transition-all duration-[250ms] overflow-hidden shrink-0"
      style={{
        width: collapsed ? 68 : 220,
        minWidth: collapsed ? 68 : 220,
        background: "#0d1321",
        borderRight: "1px solid #1e293b",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-[10px]"
        style={{
          padding: collapsed ? "20px 12px" : "20px 20px",
          borderBottom: "1px solid #1e293b",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "linear-gradient(135deg, #06B6D4, #8B5CF6)",
          }}
        >
          <Heart size={18} color="#fff" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-bold whitespace-nowrap" style={{ color: "#F1F5F9" }}>
              ECG Admin
            </div>
            <div className="text-[10px] whitespace-nowrap" style={{ color: "#64748B" }}>
              Wellness Platform
            </div>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <div className="flex-1 flex flex-col gap-[2px]" style={{ padding: "12px 8px" }}>
        {NAV.map((n) => {
          const active = isActive(n.href);
          return (
            <button
              key={n.id}
              onClick={() => router.push(n.href)}
              className="flex items-center gap-3 rounded-[10px] border-none relative transition-all duration-150 w-full font-sans"
              style={{
                padding: collapsed ? "11px 0" : "11px 14px",
                background: active ? "rgba(6,182,212,0.08)" : "transparent",
                color: active ? "#06B6D4" : "#94A3B8",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                justifyContent: collapsed ? "center" : "flex-start",
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.background = "#1a2236";
              }}
              onMouseLeave={(e) => {
                if (!active)
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              {active && (
                <div
                  className="absolute rounded"
                  style={{
                    left: collapsed ? "50%" : 0,
                    top: "50%",
                    transform: collapsed ? "translate(-50%,-50%)" : "translateY(-50%)",
                    width: collapsed ? 20 : 3,
                    height: collapsed ? 3 : 20,
                    background: "#06B6D4",
                  }}
                />
              )}
              <n.icon size={18} />
              {!collapsed && <span className="whitespace-nowrap">{n.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Collapse Button */}
      <div style={{ padding: "12px 8px", borderTop: "1px solid #1e293b" }}>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center gap-2 rounded-[10px] border-none w-full text-xs font-sans"
          style={{
            padding: "10px 0",
            background: "#111827",
            color: "#64748B",
            cursor: "pointer",
          }}
        >
          {collapsed ? (
            <ChevronRight size={16} />
          ) : (
            <>
              <ChevronLeft size={16} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
