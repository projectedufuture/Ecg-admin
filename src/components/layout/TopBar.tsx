"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getInitials } from "@/lib/utils";

export default function TopBar() {
  const { admin, logout } = useAuth();
  const router = useRouter();

  if (!admin) return null;

  return (
    <div
      className="flex items-center justify-end shrink-0"
      style={{
        height: 56,
        padding: "0 28px",
        borderBottom: "1px solid #1e293b",
        background: "#0d1321",
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="flex items-center gap-[10px] cursor-pointer"
          onClick={() => router.push("/profile")}
        >
          <div
            className="flex items-center justify-center text-[13px] font-bold transition-colors duration-150"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, rgba(6,182,212,0.25), rgba(139,92,246,0.25))",
              color: "#06B6D4",
              border: "2px solid transparent",
            }}
          >
            {getInitials(admin.name)}
          </div>
          <div>
            <div className="text-[13px] font-semibold" style={{ color: "#F1F5F9" }}>
              {admin.name}
            </div>
            <div className="text-[10px]" style={{ color: "#64748B" }}>
              {admin.email}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          title="Logout"
          className="flex items-center gap-[5px] rounded-lg text-xs font-sans transition-colors duration-150"
          style={{
            background: "#111827",
            border: "1px solid #1e293b",
            cursor: "pointer",
            padding: "6px 10px",
            color: "#64748B",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.color = "#EF4444";
            el.style.borderColor = "rgba(239,68,68,0.38)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.color = "#64748B";
            el.style.borderColor = "#1e293b";
          }}
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </div>
  );
}
