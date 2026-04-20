"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Lock, CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff, Smartphone } from "lucide-react";
import Btn from "@/components/ui/Btn";

const API_URL = "https://ecg-api-7ryx.onrender.com/api";

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must contain at least one special character.";
  return null;
}

function AppResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No reset token found. Please request a new password reset link.");
    }
  }, [token]);

  const handleSubmit = async () => {
    setError("");

    if (!token) {
      setError("No reset token found. Please request a new password reset link.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }
    const pwErr = validatePassword(newPassword);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/app/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center font-sans"
      style={{ background: "#0B0F19" }}
    >
      <div className="w-[420px] max-w-[92vw]">
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center mb-4"
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #06B6D4, #8B5CF6)",
            }}
          >
            <Lock size={28} color="#fff" />
          </div>
          <h1 className="text-2xl font-bold m-0" style={{ color: "#F1F5F9" }}>
            Set New Password
          </h1>
          <p className="text-sm mt-[6px]" style={{ color: "#64748B" }}>
            ECG Wearable Wellness – Mobile App
          </p>
        </div>

        <div
          className="rounded-[20px] p-8"
          style={{ background: "#151d2e", border: "1px solid #1e293b" }}
        >
          {success ? (
            <div className="text-center py-5">
              <div
                className="inline-flex items-center justify-center mb-4"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "rgba(16,185,129,0.12)",
                }}
              >
                <CheckCircle2 size={24} color="#10B981" />
              </div>
              <h3 className="text-[17px] font-bold mb-2" style={{ color: "#F1F5F9" }}>
                Password Reset Successful
              </h3>
              <p className="text-[13px] leading-relaxed mb-6" style={{ color: "#94A3B8" }}>
                Your password has been updated. Open the ECG Wellness mobile app and sign in with your new password.
              </p>
              <div
                className="flex items-center justify-center gap-2 text-[13px]"
                style={{ color: "#64748B" }}
              >
                <Smartphone size={14} />
                Return to the mobile app to continue.
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div
                  className="flex items-center gap-2 rounded-[10px] px-[14px] py-[10px] mb-4 text-[13px]"
                  style={{
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    color: "#EF4444",
                  }}
                >
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label
                  className="block text-[13px] font-medium mb-[6px]"
                  style={{ color: "#94A3B8" }}
                >
                  New Password
                </label>
                <div className="relative">
                  <div
                    className="absolute left-[14px] top-1/2 -translate-y-1/2"
                    style={{ color: "#475569" }}
                  >
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8+ chars, upper, lower, number, symbol"
                    className="w-full rounded-[10px] pl-10 pr-10 py-[11px] text-[14px] outline-none"
                    style={{
                      background: "#0f172a",
                      border: "1px solid #1e293b",
                      color: "#F1F5F9",
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-[14px] top-1/2 -translate-y-1/2"
                    style={{ color: "#475569", background: "none", border: "none", cursor: "pointer" }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label
                  className="block text-[13px] font-medium mb-[6px]"
                  style={{ color: "#94A3B8" }}
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <div
                    className="absolute left-[14px] top-1/2 -translate-y-1/2"
                    style={{ color: "#475569" }}
                  >
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full rounded-[10px] pl-10 pr-4 py-[11px] text-[14px] outline-none"
                    style={{
                      background: "#0f172a",
                      border: "1px solid #1e293b",
                      color: "#F1F5F9",
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                </div>
              </div>

              <Btn
                onClick={handleSubmit}
                disabled={loading || !token}
                style={{ width: "100%", justifyContent: "center", padding: "12px 0" }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin-slow" />
                    Resetting…
                  </>
                ) : (
                  "Reset Password"
                )}
              </Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AppResetPasswordPage() {
  return (
    <Suspense>
      <AppResetPasswordForm />
    </Suspense>
  );
}
