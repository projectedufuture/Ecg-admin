"use client";

import { useState } from "react";
import {
  User, Mail, Lock, Save, CheckCircle2, AlertCircle, RefreshCw, Check, X,
} from "lucide-react";
import InputField from "@/components/ui/InputField";
import Btn from "@/components/ui/Btn";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { getInitials } from "@/lib/utils";

// ── Password strength rules ─────────────────────────
const PW_RULES = [
  { label: "8+ characters",      test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter",   test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter",   test: (p: string) => /[a-z]/.test(p) },
  { label: "Number",             test: (p: string) => /[0-9]/.test(p) },
  { label: "Special character",  test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function isStrongPassword(p: string) {
  return PW_RULES.every((r) => r.test(p));
}

export default function ProfilePage() {
  const { admin, updateAdmin } = useAuth();

  // Personal info
  const [name, setName]             = useState(admin?.name || "");
  const [email, setEmail]           = useState(admin?.email || "");
  const [saved, setSaved]           = useState(false);
  const [saving, setSaving]         = useState(false);
  const [profileError, setProfileError] = useState("");

  // Password change
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwSuccess, setPwSuccess]   = useState(false);
  const [pwError, setPwError]       = useState("");

  if (!admin) return null;

  // ── Save profile (persists to database) ──
  const handleSaveProfile = async () => {
    setProfileError("");
    setSaved(false);

    if (!name.trim()) { setProfileError("Name cannot be empty."); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setProfileError("Please enter a valid email address.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put<{ success: boolean; data: { id: string; name: string; email: string; role: string; clientId: string | null }; error: string | null }>(
        "/admin/profile",
        { name: name.trim(), email: email.trim() }
      );
      const updated = (res as Record<string, unknown>).data as typeof admin;
      if (updated) {
        updateAdmin({ ...admin, ...updated });
        setName(updated.name);
        setEmail(updated.email);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ──────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwError("");
    setPwSuccess(false);

    if (!currentPw) { setPwError("Enter your current password."); return; }
    if (!newPw)     { setPwError("Enter a new password."); return; }
    if (!isStrongPassword(newPw)) {
      setPwError("New password does not meet the requirements below.");
      return;
    }
    if (newPw !== confirmPw) { setPwError("Passwords do not match."); return; }

    setPwSaving(true);
    try {
      await api.post("/admin/change-password", {
        current_password: currentPw,
        new_password: newPw,
      });
      setPwSuccess(true);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
        Profile Settings
      </h1>
      <p className="text-[13px] mb-7" style={{ color: "var(--text-muted)" }}>
        Manage your admin account
      </p>

      <div className="grid grid-cols-2 gap-5">

        {/* ── Personal Information ─────────────────────────────── */}
        <div
          className="rounded-2xl p-7"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="flex items-center justify-center text-xl font-bold"
              style={{
                width: 52, height: 52, borderRadius: 14,
                background: "linear-gradient(135deg, rgba(6,182,212,0.25), rgba(139,92,246,0.25))",
                color: "#06B6D4",
              }}
            >
              {getInitials(name)}
            </div>
            <div>
              <h3 className="text-base font-bold m-0" style={{ color: "var(--text-primary)" }}>
                Personal Information
              </h3>
              <p className="text-xs m-0" style={{ color: "var(--text-muted)" }}>
                Update your name and email
              </p>
            </div>
          </div>

          {profileError && (
            <div
              className="flex items-center gap-2 rounded-[10px] mb-4 text-[13px]"
              style={{ padding: "10px 14px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}
            >
              <AlertCircle size={14} />
              {profileError}
            </div>
          )}

          <InputField label="Full Name"      icon={User} value={name}  onChange={setName}  placeholder="Your name" />
          <InputField label="Email Address"  icon={Mail} value={email} onChange={setEmail} type="email" placeholder="your@email.com" />

          <div className="flex items-center gap-[10px] mt-2">
            <Btn onClick={handleSaveProfile} disabled={saving}>
              <Save size={14} />
              Save Changes
            </Btn>
            {saved && (
              <span className="text-[13px] flex items-center gap-1" style={{ color: "#10B981" }}>
                <CheckCircle2 size={14} /> Saved
              </span>
            )}
          </div>
        </div>

        {/* ── Change Password ───────────────────────────────────── */}
        <div
          className="rounded-2xl p-7"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="flex items-center justify-center"
              style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(245,158,11,0.12)" }}
            >
              <Lock size={22} color="#F59E0B" />
            </div>
            <div>
              <h3 className="text-base font-bold m-0" style={{ color: "var(--text-primary)" }}>
                Change Password
              </h3>
              <p className="text-xs m-0" style={{ color: "var(--text-muted)" }}>
                Update your login credentials
              </p>
            </div>
          </div>

          {/* Error */}
          {pwError && (
            <div
              className="flex items-center gap-2 rounded-[10px] mb-4 text-[13px]"
              style={{
                padding: "10px 14px",
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#EF4444",
              }}
            >
              <AlertCircle size={14} />
              {pwError}
            </div>
          )}

          {/* Success */}
          {pwSuccess && (
            <div
              className="flex items-center gap-2 rounded-[10px] mb-4 text-[13px]"
              style={{
                padding: "10px 14px",
                background: "rgba(16,185,129,0.12)",
                border: "1px solid rgba(16,185,129,0.25)",
                color: "#10B981",
              }}
            >
              <CheckCircle2 size={14} />
              Password updated successfully.
            </div>
          )}

          <InputField
            label="Current Password"
            icon={Lock}
            value={currentPw}
            onChange={setCurrentPw}
            type="password"
            placeholder="Enter current password"
          />
          <InputField
            label="New Password"
            icon={Lock}
            value={newPw}
            onChange={setNewPw}
            type="password"
            placeholder="At least 8 characters"
          />

          {/* Strength checklist — visible once user starts typing */}
          {newPw.length > 0 && (
            <div
              className="rounded-[10px] mb-4 grid grid-cols-2 gap-[6px]"
              style={{ padding: "10px 12px", background: "var(--bg-input)", border: "1px solid var(--border-clr)" }}
            >
              {PW_RULES.map((rule) => {
                const ok = rule.test(newPw);
                return (
                  <div key={rule.label} className="flex items-center gap-[6px] text-[12px]">
                    {ok
                      ? <Check size={12} color="#10B981" />
                      : <X    size={12} color="#EF4444" />}
                    <span style={{ color: ok ? "#10B981" : "var(--text-muted)" }}>
                      {rule.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <InputField
            label="Confirm New Password"
            icon={Lock}
            value={confirmPw}
            onChange={setConfirmPw}
            type="password"
            placeholder="Re-enter new password"
          />

          <div className="flex items-center gap-[10px] mt-2">
            <Btn onClick={handleChangePassword} variant="accentSoft" disabled={pwSaving}>
              {pwSaving
                ? <><RefreshCw size={14} className="animate-spin-slow" /> Updating…</>
                : <><Save size={14} /> Update Password</>}
            </Btn>
          </div>
        </div>

      </div>
    </div>
  );
}
