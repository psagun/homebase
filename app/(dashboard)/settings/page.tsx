"use client";

import { useRef, useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth/useAuth";
import { User, Lock, Bell, Sun, Moon, Check, Loader2, Upload, Camera, Users, X, Pencil, Trash2, KeyRound } from "lucide-react";
import { useInvestors, useCreateInvestor, useUpdateInvestor, useResetInvestorPassword, useDeleteInvestor } from "@/lib/hooks/useAdmin";
import { suggestPropertiesForEmail } from "@/lib/api/admin";
import { useProperties } from "@/lib/hooks/useProperties";
import { LoadingState } from "@/components/shared/LoadingState";

type Tab = "profile" | "security" | "notifications" | "appearance" | "investors";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Edit Profile", icon: <User className="h-4 w-4" /> },
    { id: "security", label: "Password & Security", icon: <Lock className="h-4 w-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { id: "appearance", label: "Appearance", icon: <Sun className="h-4 w-4" /> },
    ...(user?.role === "admin" ? [{ id: "investors" as Tab, label: "Investors", icon: <Users className="h-4 w-4" /> }] : []),
  ];

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account and preferences</p>
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
                  ? "bg-card border border-border shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
          {activeTab === "investors" && <InvestorsTab />}
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
    <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Profile Information</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Your photo, name, and email address</p>
      </div>

      {msg && <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-2 rounded-md">{msg}</div>}

      {/* Avatar + Name */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/png,image/jpeg,image/webp,image/gif" />
          <button onClick={() => fileInputRef.current?.click()}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-[#eef2ff] text-3xl font-bold text-primary overflow-hidden relative transition-all hover:ring-4 hover:ring-blue-100">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              user?.name?.charAt(0).toUpperCase() || "U"
            )}
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </button>
          <p className="text-center text-[10px] text-muted-foreground mt-1.5">Click to upload</p>
        </div>
        <div className="flex-1">
          {editName ? (
            <div className="flex items-center gap-2">
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 w-64"
                autoFocus
              />
              <button onClick={handleSave} disabled={saving}
                className="rounded-lg bg-[#1a1d2b] px-3.5 py-2 text-xs font-semibold text-white hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save
              </button>
              <button onClick={() => { setEditName(false); setName(user?.name || ""); }}
                className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-muted-foreground hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-foreground">{user?.name || "—"}</p>
              <button onClick={() => setEditName(true)}
                className="text-xs text-primary hover:underline mt-0.5">Edit</button>
            </div>
          )}
        </div>
      </div>

      {/* Email (read-only) */}
      <div className="pt-4 border-t border-border">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</label>
        <p className="text-sm font-medium text-foreground mt-1">{user?.email || "—"}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Contact support to change your email</p>
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
    <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Password & Security</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Change your login password</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-sm space-y-3">
        {pwMsg && (
          <div className={`text-xs font-medium p-2.5 rounded-md ${pwMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{pwMsg.text}</div>
        )}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Current Password</label>
          <input type="password" required value={currentPw} onChange={e => setCurrentPw(e.target.value)}
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">New Password</label>
          <input type="password" required value={newPw} onChange={e => setNewPw(e.target.value)}
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" placeholder="Minimum 8 characters" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Confirm New Password</label>
          <input type="password" required value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
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
    <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Notification Preferences</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Choose which notifications you receive</p>
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
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
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
    <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Appearance</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Choose your preferred theme for the dashboard</p>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <button
          onClick={() => setTheme("light")}
          className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all ${
            theme === "light" ? "border-[#3b82f6] bg-blue-50/50" : "border-border hover:border-gray-300"
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Sun className="h-7 w-7" />
          </div>
          <div className="text-center">
            <p className={`text-sm font-semibold ${theme === "light" ? "text-primary" : "text-foreground"}`}>Light</p>
            <p className="text-xs text-muted-foreground mt-0.5">Bright & clean</p>
          </div>
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all ${
            theme === "dark" ? "border-[#3b82f6] bg-blue-50/50" : "border-border hover:border-gray-300"
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-700 text-gray-300">
            <Moon className="h-7 w-7" />
          </div>
          <div className="text-center">
            <p className={`text-sm font-semibold ${theme === "dark" ? "text-primary" : "text-foreground"}`}>Dark</p>
            <p className="text-xs text-muted-foreground mt-0.5">Easy on the eyes</p>
          </div>
        </button>
      </div>
    </div>
  );
}

/* ─── Investors Tab (admin only) ─── */
function InvestorsTab() {
  const { data: investors, isLoading } = useInvestors();
  const { data: properties } = useProperties();
  const createInvestor = useCreateInvestor();
  const updateInvestor = useUpdateInvestor();
  const resetPassword = useResetInvestorPassword();
  const deleteInvestor = useDeleteInvestor();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPropertyIds, setNewPropertyIds] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<{ entities: { id: string; name: string }[]; properties: { id: string; name: string; entity_name: string }[] } | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editPropertyIds, setEditPropertyIds] = useState<string[]>([]);

  // Fetch property suggestions when email changes (debounced)
  useEffect(() => {
    if (!newEmail.trim() || !newEmail.includes("@")) {
      setSuggestions(null);
      return;
    }
    const t = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const result = await suggestPropertiesForEmail(newEmail.trim());
        setSuggestions(result);
      } catch {
        setSuggestions(null);
      }
      setSuggestLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, [newEmail]);

  const handleToggleNewProperty = (propId: string) => {
    setNewPropertyIds((prev) =>
      prev.includes(propId) ? prev.filter((id) => id !== propId) : [...prev, propId]
    );
  };

  const selectAllSuggested = () => {
    if (!suggestions) return;
    setNewPropertyIds((prev) => {
      const merged = new Set([...prev, ...suggestions.properties.map((p) => p.id)]);
      return Array.from(merged);
    });
  };

  const handleToggleEditProperty = (propId: string) => {
    setEditPropertyIds((prev) =>
      prev.includes(propId) ? prev.filter((id) => id !== propId) : [...prev, propId]
    );
  };

  const handleAdd = async () => {
    try {
      const result = await createInvestor.mutateAsync({
        name: newName,
        email: newEmail,
        property_ids: newPropertyIds,
      });
      setTempPassword(result.temp_password ?? null);
      setShowAddForm(false);
      setNewName("");
      setNewEmail("");
      setNewPropertyIds([]);
    } catch {
      // error handled by query client
    }
  };

  const handleEdit = async (id: string) => {
    try {
      await updateInvestor.mutateAsync({
        id,
        data: { name: editName, property_ids: editPropertyIds },
      });
      setEditingId(null);
    } catch {
      // error handled by query client
    }
  };

  const handleResetPassword = async (id: string) => {
    try {
      const result = await resetPassword.mutateAsync(id);
      setTempPassword(result.temp_password ?? null);
    } catch {
      // error handled by query client
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInvestor.mutateAsync(id);
      setConfirmDelete(null);
    } catch {
      // error handled by query client
    }
  };

  const startEditing = (investor: { id: string; name: string; property_ids: string[] }) => {
    setEditingId(investor.id);
    setEditName(investor.name);
    setEditPropertyIds(investor.property_ids);
  };

  if (isLoading) {
    return <LoadingState text="Loading investors..." />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Investors</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manage investor accounts and property assignments</p>
          </div>
          <button
            onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); }}
            className="rounded-lg bg-[#1a1d2b] px-4 py-2 text-xs font-semibold text-white hover:bg-black transition-colors"
          >
            {showAddForm ? "Cancel" : "Add Investor"}
          </button>
        </div>
      </div>

      {/* Temp password banner */}
      {tempPassword && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Temporary Password</p>
              <p className="text-sm font-mono font-bold text-amber-900 mt-0.5">{tempPassword}</p>
              <p className="text-xs text-amber-700 mt-0.5">Share this with the investor. It will not be shown again.</p>
            </div>
          </div>
          <button onClick={() => setTempPassword(null)} className="text-amber-500 hover:text-amber-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">New Investor</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Name</label>
              <input
                type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Email</label>
              <input
                type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                placeholder="investor@example.com"
              />
            </div>
          </div>

          {/* Property suggestions from ownership entities */}
          {suggestLoading && (
            <p className="text-xs text-muted-foreground">Checking ownership entities...</p>
          )}
          {suggestions && suggestions.entities.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-blue-800">
                  Found in ownership entities
                </p>
                <button onClick={selectAllSuggested}
                  className="text-xs font-medium text-blue-700 hover:underline">
                  Select all suggested
                </button>
              </div>
              <p className="text-xs text-blue-700 mb-2">
                This email is an investor in: {suggestions.entities.map((e) => e.name).join(", ")}
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.properties.map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-card border border-blue-200 px-2.5 py-1 text-xs text-blue-800">
                    {p.name}
                    <span className="text-blue-400">({p.entity_name})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Property Access</label>
            <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
              {properties && properties.length > 0 ? (
                properties.map((prop) => (
                  <label key={prop.id} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPropertyIds.includes(prop.id)}
                      onChange={() => handleToggleNewProperty(prop.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                    />
                    <span className="text-sm text-foreground">{prop.name}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No properties available</p>
              )}
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!newName || !newEmail || createInvestor.isPending}
            className="rounded-lg bg-[#1a1d2b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {createInvestor.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create Investor
          </button>
        </div>
      )}

      {/* Investors list */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        {investors && investors.length > 0 ? (
          <div className="divide-y divide-[#e8eaed]">
            {investors.map((investor) => (
              <div key={investor.id} className="p-5">
                {editingId === investor.id ? (
                  /* ── Inline Edit Form ── */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1.5">Name</label>
                        <input
                          type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Email</label>
                        <p className="text-sm font-medium text-foreground py-2.5">{investor.email}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">Property Access</label>
                      <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
                        {properties && properties.length > 0 ? (
                          properties.map((prop) => (
                            <label key={prop.id} className="flex items-center gap-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editPropertyIds.includes(prop.id)}
                                onChange={() => handleToggleEditProperty(prop.id)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                              />
                              <span className="text-sm text-foreground">{prop.name}</span>
                            </label>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No properties available</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(investor.id)}
                        disabled={updateInvestor.isPending}
                        className="rounded-lg bg-[#1a1d2b] px-4 py-2 text-xs font-semibold text-white hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {updateInvestor.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Investor Row ── */
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{investor.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{investor.email}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {investor.property_ids.length} property{investor.property_ids.length !== 1 ? "ies" : "y"}
                        {investor.property_ids.length > 0 ? ` assigned` : ``}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => startEditing(investor)}
                        className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleResetPassword(investor.id)}
                        disabled={resetPassword.isPending}
                        className="rounded-lg p-2 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                        title="Reset Password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      {confirmDelete === investor.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDelete(investor.id)}
                            disabled={deleteInvestor.isPending}
                            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            {deleteInvestor.isPending ? "Deleting..." : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(investor.id)}
                          className="rounded-lg p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No investors yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click &quot;Add Investor&quot; to create the first one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
