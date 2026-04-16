"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Mail, Lock, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import InputField from "@/components/ui/InputField";
import Btn from "@/components/ui/Btn";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
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
    <div className="min-h-screen flex items-center justify-center font-sans" style={{ background: "#0B0F19" }}>
      <div className="w-[420px] max-w-[92vw]">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-4" style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #06B6D4, #8B5CF6)" }}>
            <Heart size={28} color="#fff" />
          </div>
          <h1 className="text-2xl font-bold m-0" style={{ color: "#F1F5F9" }}>ECG Admin Panel</h1>
          <p className="text-sm mt-[6px]" style={{ color: "#64748B" }}>Wearable Wellness Platform</p>
        </div>
        <div className="rounded-[20px] p-8" style={{ background: "#151d2e", border: "1px solid #1e293b" }}>
          <h2 className="text-xl font-bold m-0 mb-1" style={{ color: "#F1F5F9" }}>Welcome back</h2>
          <p className="text-[13px] mb-7" style={{ color: "#64748B" }}>Sign in to your admin account</p>
          {error && (
            <div className="flex items-center gap-2 rounded-[10px] px-[14px] py-[10px] mb-4 text-[13px]" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}>
              <AlertCircle size={14} />{error}
            </div>
          )}
          <InputField label="Email Address" icon={Mail} value={email} onChange={setEmail} type="email" placeholder="admin@ecgplatform.com" />
          <InputField label="Password" icon={Lock} value={password} onChange={setPassword} type="password" placeholder="Enter password" />
          <div className="text-right mb-6">
            <span onClick={() => router.push("/forgot-password")} className="text-[13px] font-medium cursor-pointer" style={{ color: "#06B6D4" }}>Forgot password?</span>
          </div>
          <Btn onClick={handleLogin} disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "12px 0", fontSize: 15 }}>
            {loading ? (<><RefreshCw size={16} className="animate-spin-slow" />Signing in...</>) : "Sign In"}
          </Btn>
        </div>
        <p className="text-center text-xs mt-6" style={{ color: "#64748B" }}>Wellness-grade platform — Not for medical diagnosis</p>
      </div>
    </div>
  );
}
