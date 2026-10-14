"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Calendar, Bell, Sun, Moon, ChevronDown, User as UserIcon, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { getInitials } from "@/lib/utils";

function currentMonthRange(): string {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(first)} - ${fmt(last)}`;
}

export default function TopBar() {
  const { admin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!admin) return null;

  return (
    <div
      data-print="hide"
      className="flex items-center gap-4 shrink-0"
      style={{
        height: 68,
        padding: "0 28px",
        borderBottom: "1px solid var(--border-clr)",
        background: "var(--bg-elevated)",
      }}
    >
      {/* Search */}
      <div
        className="flex items-center gap-[10px] rounded-[12px] flex-1 max-w-[460px]"
        style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)", padding: "10px 14px" }}
      >
        <Search size={17} style={{ color: "var(--text-muted)" }} />
        <input
          placeholder="Search users, devices, sessions..."
          className="bg-transparent border-none outline-none flex-1 text-[14px] font-sans"
          style={{ color: "var(--text-primary)" }}
        />
        <span
          className="text-[11px] font-semibold rounded-[6px] px-[7px] py-[2px]"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", color: "var(--text-muted)" }}
        >
          Ctrl K
        </span>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Date range */}
        <div
          className="hidden md:flex items-center gap-2 rounded-[12px] text-[13px] font-medium cursor-pointer"
          style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)", padding: "9px 14px", color: "var(--text-primary)" }}
        >
          <Calendar size={16} style={{ color: "var(--text-muted)" }} />
          {currentMonthRange()}
          <ChevronDown size={15} style={{ color: "var(--text-muted)" }} />
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="flex items-center justify-center rounded-[12px]"
          style={{
            width: 42, height: 42,
            background: "var(--bg-input)",
            border: "1px solid var(--border-clr)",
            cursor: "pointer",
            color: theme === "dark" ? "#F59E0B" : "#6366F1",
          }}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <button
          className="relative flex items-center justify-center rounded-[12px]"
          style={{ width: 42, height: 42, background: "var(--bg-input)", border: "1px solid var(--border-clr)", cursor: "pointer", color: "var(--text-secondary)" }}
          title="Notifications"
        >
          <Bell size={18} />
          <span
            className="absolute flex items-center justify-center text-[10px] font-bold text-white rounded-full"
            style={{ top: -4, right: -4, minWidth: 18, height: 18, padding: "0 4px", background: "#EF4444", border: "2px solid var(--bg-elevated)" }}
          >
            3
          </span>
        </button>

        {/* Avatar + menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-[10px] cursor-pointer border-none bg-transparent"
          >
            <div
              className="flex items-center justify-center text-[14px] font-bold text-white"
              style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg, #22D3EE, #8B5CF6)" }}
            >
              {getInitials(admin.name)}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-[14px] font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
                {admin.name}
              </div>
              <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {admin.role === "super_admin" ? "Super Admin" : "Admin"}
              </div>
            </div>
            <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 mt-2 rounded-[14px] overflow-hidden z-30"
              style={{ width: 220, background: "var(--bg-surface)", border: "1px solid var(--border-clr)", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}
            >
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-clr)" }}>
                <div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{admin.name}</div>
                <div className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{admin.email}</div>
              </div>
              <button
                onClick={() => { setMenuOpen(false); router.push("/profile"); }}
                className="flex items-center gap-2 w-full text-left px-4 py-[11px] text-[13px] border-none bg-transparent cursor-pointer"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <UserIcon size={15} /> Profile
              </button>
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="flex items-center gap-2 w-full text-left px-4 py-[11px] text-[13px] border-none bg-transparent cursor-pointer"
                style={{ color: "#EF4444" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <LogOut size={15} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
