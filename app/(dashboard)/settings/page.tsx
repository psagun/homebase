"use client";

import { useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth/useAuth";
import { User, Lock, Bell, Sun, Moon, Check, Loader2, Upload, Camera } from "lucide-react";

type Tab = "profile" | "security" | "notifications" | "appearance";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Edit Profile", icon: <User className="h-4 w-4" /> },
    { id: "security", label: "Password & Security", icon: <Lock className="h-4 w-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { id: "appearance", label: "Appearance", icon: <Sun className="h-4 w-4" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1a1d2b]">Settings</h1>
        <p className="text-sm text-[#8b8fa3] mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Left: Tab Navigation */}
        <nav className="w-52 shrink-0 space-y-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                activeTab === tab.id
                  ? "bg-white border border-[#e8eaed] shadow-sm text-[#1a1d2b]"
                  : "text-[#8b8fa3] hover:text-[#1a1d2b] hover:bg-white/60"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right: Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "profile" && <ProfileTab user={user} />}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "appearance" && <AppearanceTab theme={theme} setTheme={setTheme} />}
        </div>
      </div>
    </div>
  );
}

/* ─── Profile Tab ─── */
function ProfileTab({ user }: { user: { name?: string; email?: string; avatar_url?: string | null } | null }) {
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true); setMsg("");
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false); setEditName(false);
    setMsg("Profile updated"); setTimeout(() => setMsg(""), 2000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/v1/auth/avatar", { method: "POST", credentials: "include", body: formData });
      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.avatar_url);
        setMsg("Photo updated"); setTimeout(() => setMsg(""), 2000);
      }
    } catch {}
  };

  return (
    <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[#1a1d2b]">Profile Information</h2>
        <p className="text-xs text-[#8b8fa3] mt-0.5">Your photo, name, and email address</p>
      </div>

      {msg && <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-2 rounded-md">{msg}</div>}

      {/* Avatar + Name */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/png,image/jpeg,image/webp,image/gif" />
          <button onClick={() => fileInputRef.current?.click()}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-[#eef2ff] text-3xl font-bold text-[#3b82f6] overflow-hidden relative transition-all hover:ring-4 hover:ring-blue-100">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              user?.name?.charAt(0).toUpperCase() || "U"
            )}
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </button>
          <p className="text-center text-[10px] text-[#8b8fa3] mt-1.5">Click to upload</p>
        </div>
        <div className="flex-1">
          {editName ? (
            <div className="flex items-center gap-2">
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-[#e8eaed] px-3 py-2 text-sm font-medium outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20 w-64"
                autoFocus
              />
              <button onClick={handleSave} disabled={saving}
                className="rounded-lg bg-[#1a1d2b] px-3.5 py-2 text-xs font-semibold text-white hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save
              </button>
              <button onClick={() => { setEditName(false); setName(user?.name || ""); }}
                className="rounded-lg border border-[#e8eaed] px-3.5 py-2 text-xs font-medium text-[#8b8fa3] hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-[#1a1d2b]">{user?.name || "—"}</p>
              <button onClick={() => setEditName(true)}
                className="text-xs text-[#3b82f6] hover:underline mt-0.5">Edit</button>
            </div>
          )}
        </div>
      </div>

      {/* Email (read-only) */}
      <div className="pt-4 border-t border-[#e8eaed]">
        <label className="text-xs font-semibold text-[#8b8fa3] uppercase tracking-wider">Email Address</label>
        <p className="text-sm font-medium text-[#1a1d2b] mt-1">{user?.email || "—"}</p>
        <p className="text-xs text-[#8b8fa3] mt-0.5">Contact support to change your email</p>
      </div>
    </div>
  );
}

/* ─── Security Tab ─── */
function SecurityTab() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) { setPwMsg({ text: "Passwords do not match", ok: false }); return; }
    if (newPw.length < 8) { setPwMsg({ text: "Password must be at least 8 characters", ok: false }); return; }
    setPwLoading(true);
    try {
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Failed");
      setPwMsg({ text: "Password updated successfully", ok: true });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: unknown) {
      setPwMsg({ text: err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Failed", ok: false });
    }
    setPwLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-[#1a1d2b]">Password & Security</h2>
        <p className="text-xs text-[#8b8fa3] mt-0.5">Change your login password</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-sm space-y-3">
        {pwMsg && (
          <div className={`text-xs font-medium p-2.5 rounded-md ${pwMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{pwMsg.text}</div>
        )}
        <div>
          <label className="block text-xs font-semibold text-[#1a1d2b] mb-1.5">Current Password</label>
          <input type="password" required value={currentPw} onChange={e => setCurrentPw(e.target.value)}
            className="w-full rounded-lg border border-[#e8eaed] px-3.5 py-2.5 text-sm outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#1a1d2b] mb-1.5">New Password</label>
          <input type="password" required value={newPw} onChange={e => setNewPw(e.target.value)}
            className="w-full rounded-lg border border-[#e8eaed] px-3.5 py-2.5 text-sm outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20" placeholder="Minimum 8 characters" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#1a1d2b] mb-1.5">Confirm New Password</label>
          <input type="password" required value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
            className="w-full rounded-lg border border-[#e8eaed] px-3.5 py-2.5 text-sm outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20" />
        </div>
        <button type="submit" disabled={pwLoading}
          className="rounded-lg bg-[#1a1d2b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2">
          {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Update Password
        </button>
      </form>
    </div>
  );
}

/* ─── Notifications Tab ─── */
function NotificationsTab() {
  const items = [
    { id: "overdue", label: "Overdue tasks", desc: "When a task passes its due date", on: true },
    { id: "today", label: "Due today reminders", desc: "Daily digest of tasks due today", on: true },
    { id: "insurance", label: "Insurance renewals", desc: "Before insurance policies expire", on: true },
    { id: "rent", label: "Rent collection", desc: "When rent payments are due or overdue", on: false },
    { id: "mortgage", label: "Mortgage payments", desc: "Upcoming mortgage payment alerts", on: true },
    { id: "documents", label: "Document expirations", desc: "When leases or docs are expiring", on: false },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-[#1a1d2b]">Notification Preferences</h2>
        <p className="text-xs text-[#8b8fa3] mt-0.5">Choose which notifications you receive</p>
      </div>
      <div className="divide-y divide-[#e8eaed]">
        {items.map((item) => (
          <NotificationRow key={item.id} {...item} />
        ))}
      </div>
    </div>
  );
}

function NotificationRow({ label, desc, on: initial }: { label: string; desc: string; on: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  return (
    <label className="flex items-center justify-between py-3.5 cursor-pointer">
      <div>
        <p className="text-sm font-medium text-[#1a1d2b]">{label}</p>
        <p className="text-xs text-[#8b8fa3]">{desc}</p>
      </div>
      <button
        type="button" role="switch" aria-checked={enabled}
        onClick={() => setEnabled(!enabled)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
          enabled ? "bg-[#3b82f6]" : "bg-gray-200"
        }`}
      >
        <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition duration-200 ${
          enabled ? "translate-x-4" : "translate-x-0"
        }`} />
      </button>
    </label>
  );
}

/* ─── Appearance Tab ─── */
function AppearanceTab({ theme, setTheme }: { theme?: string; setTheme: (t: string) => void }) {
  return (
    <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-[#1a1d2b]">Appearance</h2>
        <p className="text-xs text-[#8b8fa3] mt-0.5">Choose your preferred theme for the dashboard</p>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <button
          onClick={() => setTheme("light")}
          className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all ${
            theme === "light" ? "border-[#3b82f6] bg-blue-50/50" : "border-[#e8eaed] hover:border-gray-300"
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Sun className="h-7 w-7" />
          </div>
          <div className="text-center">
            <p className={`text-sm font-semibold ${theme === "light" ? "text-[#3b82f6]" : "text-[#1a1d2b]"}`}>Light</p>
            <p className="text-xs text-[#8b8fa3] mt-0.5">Bright & clean</p>
          </div>
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all ${
            theme === "dark" ? "border-[#3b82f6] bg-blue-50/50" : "border-[#e8eaed] hover:border-gray-300"
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-700 text-gray-300">
            <Moon className="h-7 w-7" />
          </div>
          <div className="text-center">
            <p className={`text-sm font-semibold ${theme === "dark" ? "text-[#3b82f6]" : "text-[#1a1d2b]"}`}>Dark</p>
            <p className="text-xs text-[#8b8fa3] mt-0.5">Easy on the eyes</p>
          </div>
        </button>
      </div>
    </div>
  );
}
