"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Moon,
  Sun,
  ChevronDown,
  Users,
  Watch,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

const ACCENT_GRAD = "linear-gradient(135deg, #22D3EE 0%, #3B82F6 50%, #8B5CF6 100%)";

const FEATURES = [
  { icon: Users, title: "User Management", desc: "Manage members and roles" },
  { icon: Watch, title: "Device Monitoring", desc: "Track wearable devices" },
  { icon: BarChart3, title: "Advanced Analytics", desc: "Gain insights for better health" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col lg:flex-row font-sans relative overflow-hidden"
      style={{ background: "var(--bg-page)" }}
    >
      {/* Ambient glows */}
      <div
        className="pointer-events-none absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.22), transparent 70%)", filter: "blur(20px)" }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 w-[560px] h-[560px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.18), transparent 70%)", filter: "blur(20px)" }}
      />

      {/* Top-right controls */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", color: "var(--text-secondary)" }}
        >
          {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <div
          className="h-11 px-4 rounded-full flex items-center gap-2 text-sm font-semibold cursor-pointer"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", color: "var(--text-primary)" }}
        >
          EN <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />
        </div>
      </div>

      {/* ── Left : marketing panel ─────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center overflow-hidden">
        {/* Hero backdrop */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(130% 100% at 0% 50%, rgba(34,211,238,0.10), transparent 55%)" }}
        />
        {/* ECG pulse line */}
        <svg className="absolute left-0 bottom-28 w-full opacity-60" height="120" viewBox="0 0 600 120" fill="none" preserveAspectRatio="none">
          <path
            d="M0 60 H120 L140 60 L155 20 L175 100 L195 40 L210 60 H320 L338 60 L352 34 L368 86 L384 60 H600"
            stroke="#22D3EE"
            strokeWidth="2.5"
            fill="none"
            style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.8))" }}
          />
        </svg>

        <div className="relative z-10 px-16 xl:px-24 max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.3em] mb-6" style={{ color: "var(--text-muted)" }}>
            BIOTEX
          </p>
          <h1 className="text-5xl xl:text-6xl font-bold leading-[1.1] m-0" style={{ color: "var(--text-primary)" }}>
            Smarter Insights for a{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #38BDF8, #60A5FA)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Healthier Tomorrow
            </span>
          </h1>
          <p className="text-lg mt-6 mb-12 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Manage users, devices, sessions and analytics from a single secure platform.
          </p>

          <div className="flex flex-col gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}
                >
                  <f.icon size={20} style={{ color: "#38BDF8" }} />
                </div>
                <div>
                  <p className="font-semibold m-0" style={{ color: "var(--text-primary)" }}>{f.title}</p>
                  <p className="text-sm m-0" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right : sign-in card ───────────────────────── */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-6 relative z-10">
        <div
          className="w-[440px] max-w-full rounded-[28px] p-8 sm:p-10"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-clr)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          }}
        >
          {/* Logo + heading */}
          <div className="text-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo.png"
              alt="Biotex Admin Panel"
              className="mx-auto mb-4"
              style={{ height: 72, maxWidth: "80%", objectFit: "contain", display: "block" }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
            <p className="text-base mt-1" style={{ color: "var(--text-secondary)" }}>Admin Panel</p>
            <div className="flex items-center gap-3 justify-center mt-4">
              <span className="h-px w-8" style={{ background: "var(--border-clr)" }} />
              <span className="text-xs tracking-wider" style={{ color: "var(--text-muted)" }}>
                Wearable Wellness Platform
              </span>
              <span className="h-px w-8" style={{ background: "var(--border-clr)" }} />
            </div>
          </div>

          {error && (
            <div
              className="flex items-center gap-2 rounded-[10px] px-[14px] py-[10px] mb-5 text-[13px]"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}
            >
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Email */}
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Email address
          </label>
          <div
            className="flex items-center gap-3 rounded-[12px] px-4 py-[13px] mb-5"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)" }}
          >
            <Mail size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="bg-transparent border-none outline-none flex-1 text-[15px] font-sans"
              style={{ color: "var(--text-primary)" }}
            />
          </div>

          {/* Password */}
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Password
          </label>
          <div
            className="flex items-center gap-3 rounded-[12px] px-4 py-[13px] mb-4"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)" }}
          >
            <Lock size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPass ? "text" : "password"}
              placeholder="Enter password"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="bg-transparent border-none outline-none flex-1 text-[15px] font-sans"
              style={{ color: "var(--text-primary)" }}
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="bg-transparent border-none cursor-pointer p-0"
              aria-label={showPass ? "Hide password" : "Show password"}
            >
              {showPass ? (
                <EyeOff size={18} style={{ color: "var(--text-muted)" }} />
              ) : (
                <Eye size={18} style={{ color: "var(--text-muted)" }} />
              )}
            </button>
          </div>

          {/* Remember + forgot */}
          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                type="button"
                onClick={() => setRemember((r) => !r)}
                className="w-5 h-5 rounded-[6px] flex items-center justify-center flex-shrink-0 cursor-pointer"
                style={{
                  background: remember ? ACCENT_GRAD : "var(--bg-input)",
                  border: remember ? "none" : "1px solid var(--border-clr)",
                }}
                aria-pressed={remember}
              >
                {remember && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.5 L5 9 L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Remember me</span>
            </label>
            <span
              onClick={() => router.push("/forgot-password")}
              className="text-sm font-medium cursor-pointer"
              style={{ color: "#38BDF8" }}
            >
              Forgot password?
            </span>
          </div>

          {/* Sign in */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-[12px] font-bold text-[15px] cursor-pointer"
            style={{
              background: ACCENT_GRAD,
              color: "#fff",
              border: "none",
              padding: "15px 0",
              opacity: loading ? 0.7 : 1,
              boxShadow: "0 12px 30px rgba(59,130,246,0.35)",
              transition: "opacity 0.15s",
            }}
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin-slow" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={18} />
              </>
            )}
          </button>

        </div>
      </div>

      {/* Footer note */}
      <p
        className="absolute bottom-5 left-0 right-0 text-center text-xs z-10"
        style={{ color: "var(--text-muted)" }}
      >
        Wellness-grade platform — Not for medical diagnosis
      </p>
    </div>
  );
}
