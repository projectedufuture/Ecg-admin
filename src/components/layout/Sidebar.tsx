"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Radio, Activity, ShieldCheck, FileBarChart2,
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
  { id: "users",     label: "Users",     icon: Users,           href: "/users" },
  { id: "devices",   label: "Devices",   icon: Radio,           href: "/devices" },
  { id: "sessions",  label: "Sessions",  icon: Activity,        href: "/sessions" },
  { id: "licenses",  label: "Licenses",  icon: ShieldCheck,     href: "/licenses" },
  { id: "reports",   label: "Reports",   icon: FileBarChart2,   href: "/reports" },
];

const ACCENT_GRAD = "linear-gradient(135deg, #22D3EE 0%, #3B82F6 55%, #8B5CF6 100%)";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <div
      data-print="hide"
      className="flex flex-col shrink-0"
      style={{
        width: 248,
        minWidth: 248,
        background: "var(--bg-elevated)",
        borderRight: "1px solid var(--border-clr)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3"
        style={{ padding: "20px 22px", borderBottom: "1px solid var(--border-clr)", minHeight: 74 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo.png"
          alt="Biotex Admin Panel"
          style={{ height: 40, maxWidth: "100%", objectFit: "contain", display: "block" }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      </div>

      {/* Nav */}
      <div className="flex-1 flex flex-col gap-[3px] overflow-y-auto" style={{ padding: "16px 14px" }}>
        {NAV.map((n) => {
          const active = isActive(n.href);
          return (
            <button
              key={n.id}
              onClick={() => router.push(n.href)}
              className="flex items-center gap-3 rounded-[12px] border-none relative w-full font-sans text-left"
              style={{
                padding: "11px 14px",
                background: active ? ACCENT_GRAD : "transparent",
                color: active ? "#fff" : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                boxShadow: active ? "0 6px 16px rgba(59,130,246,0.30)" : "none",
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <n.icon size={19} />
              <span className="whitespace-nowrap">{n.label}</span>
            </button>
          );
        })}
      </div>

      {/* System status + version */}
      <div style={{ padding: "14px 16px 18px" }}>
        <div
          className="rounded-[14px] px-4 py-3 mb-3"
          style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)" }}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex" style={{ width: 9, height: 9 }}>
              <span className="absolute inline-flex w-full h-full rounded-full opacity-60" style={{ background: "#10B981", animation: "pulse 2s ease-in-out infinite" }} />
              <span className="relative inline-flex rounded-full" style={{ width: 9, height: 9, background: "#10B981" }} />
            </span>
            <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>System Status</span>
          </div>
          <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>All systems operational</p>
        </div>
        <div className="px-1">
          <div className="text-[12px] font-semibold" style={{ color: "var(--text-secondary)" }}>Biotex v1.0.0</div>
          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>Wearable Wellness Platform</div>
        </div>
      </div>
    </div>
  );
}
