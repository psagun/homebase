"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Phone, Mail, Calendar, X, Check, Users, KeyRound } from "lucide-react";
import { useProperty } from "@/lib/hooks/useProperties";
import { useTenants } from "@/lib/hooks/useTenants";
import { createTenant, updateTenant, deleteTenant, type TenantData } from "@/lib/api/tenants";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ActionsMenu } from "@/components/shared/ActionsMenu";
import { formatCurrency } from "@/lib/utils";

const EMPTY_FORM = {
  name: "", email: "", phone: "", monthly_rent: "",
  move_in_date: "", lease_start: "", lease_end: "", security_deposit: "",
};

export default function TenantsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: property } = useProperty(id);
  const { data: tenants, isLoading, isError, refetch } = useTenants(id);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const resetForm = () => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(false); };

  const startEdit = (t: TenantData) => {
    setEditId(t.id);
    setForm({
      name: t.name || "", email: t.email || "", phone: t.phone || "",
      monthly_rent: t.monthly_rent ? String(t.monthly_rent) : "",
      move_in_date: t.move_in_date || "", lease_start: t.lease_start || "", lease_end: t.lease_end || "",
      security_deposit: t.security_deposit ? String(t.security_deposit) : "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setMsg({ text: "Name is required", ok: false }); return; }
    setSaving(true); setMsg(null);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        monthly_rent: Number(form.monthly_rent) || 0,
        security_deposit: Number(form.security_deposit) || 0,
      };
      if (editId) {
        await updateTenant(id, editId, payload);
      } else {
        await createTenant(id, payload);
      }
      await refetch();
      resetForm();
      setMsg({ text: editId ? "Tenant updated" : "Tenant added", ok: true });
      setTimeout(() => setMsg(null), 2500);
    } catch {
      setMsg({ text: "Failed to save tenant", ok: false });
    }
    setSaving(false);
  };

  const handleDelete = async (t: TenantData) => {
    try {
      await deleteTenant(id, t.id);
      await refetch();
      setMsg({ text: "Tenant removed", ok: true });
      setTimeout(() => setMsg(null), 2500);
    } catch {
      setMsg({ text: "Failed to remove tenant", ok: false });
    }
  };

  if (isLoading) return <LoadingState text="Loading tenants..." />;
  if (isError) return <ErrorState title="Failed to load" onRetry={() => refetch()} />;

  const totalRent = (tenants || []).reduce((s, t) => s + (Number(t.monthly_rent) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tenants{property ? <span className="text-muted-foreground font-normal"> — {property.name}</span> : ""}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{(tenants || []).length} tenant{(tenants || []).length !== 1 ? "s" : ""} · {formatCurrency(totalRent)}/mo total rent</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Add Tenant
          </button>
        )}
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="rounded-lg border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">{editId ? "Edit Tenant" : "Add Tenant"}</h3>
            <button onClick={resetForm} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Tenant name" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="name@example.com" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="(555) 123-4567" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Monthly Rent ($)</label>
              <input type="number" step="0.01" value={form.monthly_rent} onChange={(e) => setForm((p) => ({ ...p, monthly_rent: e.target.value }))}
                placeholder="0.00" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Move-in Date</label>
              <input type="date" value={form.move_in_date} onChange={(e) => setForm((p) => ({ ...p, move_in_date: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Lease Start</label>
              <input type="date" value={form.lease_start} onChange={(e) => setForm((p) => ({ ...p, lease_start: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Lease End</label>
              <input type="date" value={form.lease_end} onChange={(e) => setForm((p) => ({ ...p, lease_end: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Security Deposit ($)</label>
              <input type="number" step="0.01" value={form.security_deposit} onChange={(e) => setForm((p) => ({ ...p, security_deposit: e.target.value }))}
                placeholder="0.00" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSubmit} disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
              <Check className="h-4 w-4" /> {editId ? "Save Changes" : "Add Tenant"}
            </button>
            <button onClick={resetForm} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tenant cards */}
      {(tenants || []).length === 0 && !showForm ? (
        <div className="rounded-lg border bg-card py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">No tenants yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Add tenants to track leases, rent, and contact info.
          </p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add Tenant
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(tenants || []).map((t) => {
            const leaseActive = t.lease_end && new Date(t.lease_end) >= new Date();
            return (
              <div key={t.id} className="group rounded-lg border bg-card overflow-hidden">
                <div className="flex items-start justify-between px-4 py-3 border-b bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                      {t.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{t.name}</p>
                      {t.monthly_rent ? (
                        <p className="text-sm text-emerald-600 font-medium">{formatCurrency(t.monthly_rent)}/mo</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">No rent set</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {leaseActive && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Active lease</span>
                    )}
                    <ActionsMenu
                      label={`${t.name}`}
                      actions={[
                        { label: "Edit Tenant", icon: <Pencil className="h-4 w-4" />, onClick: () => startEdit(t) },
                        { label: "Remove", icon: <Trash2 className="h-4 w-4" />, destructive: true, onClick: () => handleDelete(t) },
                      ]}
                    />
                  </div>
                </div>
                <div className="px-4 py-3 space-y-1.5 text-sm text-muted-foreground">
                  {t.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{t.email}</p>}
                  {t.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{t.phone}</p>}
                  {t.lease_start && (
                    <p className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      Lease: {new Date(t.lease_start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {" → "}{t.lease_end ? new Date(t.lease_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Ongoing"}
                    </p>
                  )}
                  {t.move_in_date && (
                    <p className="flex items-center gap-2"><KeyRound className="h-3.5 w-3.5" />Moved in: {new Date(t.move_in_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  )}
                  {t.security_deposit ? (
                    <p className="text-xs pt-1 border-t mt-1">Security deposit: {formatCurrency(t.security_deposit)}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
