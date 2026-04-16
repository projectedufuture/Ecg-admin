"use client";

import { useRouter } from "next/navigation";
import { LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { getInitials } from "@/lib/utils";

export default function TopBar() {
  const { admin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  if (!admin) return null;

  return (
    <div
      className="flex items-center justify-end shrink-0"
      style={{
        height: 56,
        padding: "0 28px",
        borderBottom: "1px solid var(--border-clr)",
        background: "var(--bg-elevated)",
      }}
    >
      <div className="flex items-center gap-3">

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="flex items-center justify-center rounded-lg transition-colors duration-150"
          style={{
            width: 34,
            height: 34,
            background: "var(--bg-input)",
            border: "1px solid var(--border-clr)",
            cursor: "pointer",
            color: theme === "dark" ? "#F59E0B" : "#6366F1",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = theme === "dark" ? "rgba(245,158,11,0.4)" : "rgba(99,102,241,0.4)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-clr)";
          }}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Admin avatar + name */}
        <div
          className="flex items-center gap-[10px] cursor-pointer"
          onClick={() => router.push("/profile")}
        >
          <div
            className="flex items-center justify-center text-[13px] font-bold"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, rgba(6,182,212,0.25), rgba(139,92,246,0.25))",
              color: "#06B6D4",
            }}
          >
            {getInitials(admin.name)}
          </div>
          <div>
            <div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {admin.name}
            </div>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {admin.email}
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          title="Logout"
          className="flex items-center gap-[5px] rounded-lg text-xs font-sans transition-colors duration-150"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border-clr)",
            cursor: "pointer",
            padding: "6px 10px",
            color: "var(--text-muted)",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.color = "#EF4444";
            el.style.borderColor = "rgba(239,68,68,0.38)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.color = "var(--text-muted)";
            el.style.borderColor = "var(--border-clr)";
          }}
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </div>
  );
}
