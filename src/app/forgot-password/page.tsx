"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, CheckCircle2, ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import InputField from "@/components/ui/InputField";
import Btn from "@/components/ui/Btn";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://ecg-api-7ryx.onrender.com/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const goBack = () => router.push("/login");

  const handleSubmit = async () => {
    setError("");
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
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
        {/* Logo */}
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
            Reset Password
          </h1>
          <p className="text-sm mt-[6px]" style={{ color: "#64748B" }}>
            We&apos;ll send a reset link to your email
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-[20px] p-8"
          style={{ background: "#151d2e", border: "1px solid #1e293b" }}
        >
          {sent ? (
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
                Check your email
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: "#94A3B8" }}>
                If <strong style={{ color: "#F1F5F9" }}>{email}</strong> is registered, a
                password reset link has been sent. The link expires in{" "}
                <strong style={{ color: "#F1F5F9" }}>15 minutes</strong>.
              </p>
              <div className="mt-4">
                <Btn onClick={goBack} variant="ghost" style={{ width: "100%", justifyContent: "center" }}>
                  <ArrowLeft size={14} />
                  Back to Login
                </Btn>
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
              <InputField
                label="Email Address"
                icon={Mail}
                value={email}
                onChange={setEmail}
                type="email"
                placeholder="Enter your admin email"
              />
              <Btn
                onClick={handleSubmit}
                disabled={loading}
                style={{ width: "100%", justifyContent: "center", padding: "12px 0", marginBottom: 12 }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin-slow" />
                    Sending…
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Btn>
              <Btn onClick={goBack} variant="ghost" style={{ width: "100%", justifyContent: "center" }}>
                <ArrowLeft size={14} />
                Back to Login
              </Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
