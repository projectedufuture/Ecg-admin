"use client";

import { useState } from "react";
import { User, Mail, Lock, Save, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import InputField from "@/components/ui/InputField";
import Btn from "@/components/ui/Btn";
import { useAuth } from "@/lib/auth";
import { getInitials } from "@/lib/utils";

export default function ProfilePage() {
  const { admin, updateAdmin } = useAuth();
  const [name, setName] = useState(admin?.name || "");
  const [email, setEmail] = useState(admin?.email || "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saved, setSaved] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  if (!admin) return null;

  const handleSaveProfile = () => {
    updateAdmin({ ...admin, name, email });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSavePassword = () => {
    setPwError("");
    if (!currentPw) { setPwError("Enter your current password."); return; }
    if (newPw.length < 8) { setPwError("New password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match."); return; }
    setPwSaved(true);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setTimeout(() => setPwSaved(false), 2000);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: "#F1F5F9" }}>Profile Settings</h1>
      <p className="text-[13px] mb-7" style={{ color: "#64748B" }}>Manage your admin account</p>
      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-2xl p-7" style={{ background: "#151d2e", border: "1px solid #1e293b" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center text-xl font-bold" style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, rgba(6,182,212,0.25), rgba(139,92,246,0.25))", color: "#06B6D4" }}>{getInitials(name)}</div>
            <div><h3 className="text-base font-bold m-0" style={{ color: "#F1F5F9" }}>Personal Information</h3><p className="text-xs m-0" style={{ color: "#64748B" }}>Update your name and email</p></div>
          </div>
          <InputField label="Full Name" icon={User} value={name} onChange={setName} placeholder="Your name" />
          <InputField label="Email Address" icon={Mail} value={email} onChange={setEmail} type="email" placeholder="your@email.com" />
          <div className="flex items-center gap-[10px] mt-2"><Btn onClick={handleSaveProfile}><Save size={14} />Save Changes</Btn>{saved && <span className="text-[13px] flex items-center gap-1" style={{ color: "#10B981" }}><CheckCircle2 size={14} />Saved</span>}</div>
        </div>
        <div className="rounded-2xl p-7" style={{ background: "#151d2e", border: "1px solid #1e293b" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(245,158,11,0.12)" }}><Lock size={22} color="#F59E0B" /></div>
            <div><h3 className="text-base font-bold m-0" style={{ color: "#F1F5F9" }}>Change Password</h3><p className="text-xs m-0" style={{ color: "#64748B" }}>Update your login credentials</p></div>
          </div>
          {pwError && <div className="flex items-center gap-2 rounded-[10px] mb-4 text-[13px]" style={{ padding: "10px 14px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}><AlertCircle size={14} />{pwError}</div>}
          <InputField label="Current Password" icon={Lock} value={currentPw} onChange={setCurrentPw} type="password" placeholder="Enter current password" />
          <InputField label="New Password" icon={Lock} value={newPw} onChange={setNewPw} type="password" placeholder="At least 8 characters" />
          <InputField label="Confirm New Password" icon={Lock} value={confirmPw} onChange={setConfirmPw} type="password" placeholder="Re-enter new password" />
          <div className="flex items-center gap-[10px] mt-2"><Btn onClick={handleSavePassword} variant="accentSoft"><Save size={14} />Update Password</Btn>{pwSaved && <span className="text-[13px] flex items-center gap-1" style={{ color: "#10B981" }}><CheckCircle2 size={14} />Updated</span>}</div>
        </div>
      </div>
    </div>
  );
}
