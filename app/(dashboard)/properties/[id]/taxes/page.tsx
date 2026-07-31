"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ExternalLink, Plus, Pencil, Trash2, Check, X,
  Landmark, CalendarClock, DollarSign, Receipt, Layers,
} from "lucide-react";
import { useProperty } from "@/lib/hooks/useProperties";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatCurrency } from "@/lib/utils";

interface TaxData {
  id: string;
  county?: string;
  tax_authority?: string;
  parcel_id?: string;
  portal_url?: string;
  annual_tax?: number;
  payment_frequency?: string;
  next_due_date?: string;
}

const EMPTY_FORM = {
  county: "",
  tax_authority: "",
  parcel_id: "",
  portal_url: "",
  annual_tax: "",
  payment_frequency: "Annual",
  next_due_date: "",
};

export default function TaxesPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: property } = useProperty(id);
  const [taxes, setTaxes] = useState<TaxData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const loadTaxes = async () => {
    const r = await fetch(`/api/v1/properties/${id}/taxes`, { credentials: "include" });
    if (!r.ok) throw new Error("Failed to load");
    setTaxes(await r.json());
  };

  useEffect(() => {
    loadTaxes().catch(() => setError(true)).finally(() => setLoading(false));
  }, [id]);

  const resetForm = () => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(false); };

  const handleSubmit = async () => {
    setSaving(true); setMsg(null);
    try {
      const payload = { ...form, annual_tax: Number(form.annual_tax) || 0 };
      if (editId) {
        const r = await fetch(`/api/v1/properties/${id}/taxes/${editId}`, {
          method: "PATCH", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error("Update failed");
      } else {
        const r = await fetch(`/api/v1/properties/${id}/taxes`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error("Add failed");
      }
      await loadTaxes();
      resetForm();
      setMsg({ text: editId ? "Tax record updated" : "Tax record added", ok: true });
      setTimeout(() => setMsg(null), 2500);
    } catch {
      setMsg({ text: "Failed to save tax record", ok: false });
    }
    setSaving(false);
  };

  const startEdit = (t: TaxData) => {
    setEditId(t.id);
    setForm({
      county: t.county || "",
      tax_authority: t.tax_authority || "",
      parcel_id: t.parcel_id || "",
      portal_url: t.portal_url || "",
      annual_tax: t.annual_tax ? String(t.annual_tax) : "",
      payment_frequency: t.payment_frequency || "Annual",
      next_due_date: t.next_due_date || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (t: TaxData) => {
    if (!confirm(`Delete this tax record${t.county ? ` for ${t.county}` : ""}?`)) return;
    try {
      const r = await fetch(`/api/v1/properties/${id}/taxes/${t.id}`, {
        method: "DELETE", credentials: "include",
      });
      if (!r.ok) throw new Error("Delete failed");
      await loadTaxes();
    } catch {
      setMsg({ text: "Failed to delete tax record", ok: false });
      setTimeout(() => setMsg(null), 2500);
    }
  };

  if (loading) return <LoadingState text="Loading tax info..." />;
  if (error) return <ErrorState title="Failed to load taxes" onRetry={() => { setError(false); setLoading(true); loadTaxes().catch(() => setError(true)).finally(() => setLoading(false)); }} />;

  const totalAnnual = taxes.reduce((s, t) => s + (Number(t.annual_tax) || 0), 0);
  const upcoming = taxes
    .filter((t) => t.next_due_date)
    .sort((a, b) => (a.next_due_date! > b.next_due_date! ? 1 : -1))[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Property Taxes{property ? <span className="text-muted-foreground font-normal"> — {property.name}</span> : ""}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">County tax records and payment portals</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Add Tax Record
          </button>
        )}
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Summary strip */}
      {taxes.length > 0 && !showForm && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Total Annual Tax</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalAnnual)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{taxes.length} record{taxes.length > 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CalendarClock className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Next Due Date</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {upcoming ? new Date(upcoming.next_due_date!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{upcoming?.county || "No upcoming dates"}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Layers className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Common Frequency</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {taxes.map((t) => t.payment_frequency).filter(Boolean)[0] || "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Payment schedule</p>
          </div>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="rounded-lg border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">{editId ? "Edit Tax Record" : "Add Tax Record"}</h3>
            <button onClick={resetForm} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">County</label>
              <input placeholder="e.g. Maricopa" value={form.county} onChange={e => setForm(p => ({ ...p, county: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Tax Authority</label>
              <input placeholder="e.g. County Assessor" value={form.tax_authority} onChange={e => setForm(p => ({ ...p, tax_authority: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Parcel ID / APN</label>
              <input placeholder="Parcel number" value={form.parcel_id} onChange={e => setForm(p => ({ ...p, parcel_id: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Annual Tax ($)</label>
              <input type="number" step="0.01" placeholder="0.00" value={form.annual_tax} onChange={e => setForm(p => ({ ...p, annual_tax: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Frequency</label>
              <select value={form.payment_frequency} onChange={e => setForm(p => ({ ...p, payment_frequency: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="Annual">Annual</option>
                <option value="Semi-Annual">Semi-Annual</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Next Due Date</label>
              <input type="date" value={form.next_due_date} onChange={e => setForm(p => ({ ...p, next_due_date: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Tax Payment Portal URL</label>
              <input placeholder="https://taxportal.county.gov/..." value={form.portal_url} onChange={e => setForm(p => ({ ...p, portal_url: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              <p className="text-xs text-muted-foreground mt-1">Adds a &quot;Pay Taxes&quot; button that opens this link.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button onClick={handleSubmit} disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
              <Check className="h-4 w-4" />
              {editId ? "Save Changes" : "Add Record"}
            </button>
            <button onClick={resetForm} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {taxes.length === 0 && !showForm && (
        <div className="rounded-lg border bg-card py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Landmark className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-foreground">No tax records yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Add county tax details, due dates, and payment portal links to track property taxes.
          </p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Add Tax Record
          </button>
        </div>
      )}

      {/* Tax record cards */}
      {taxes.map((t) => (
        <div key={t.id} className="rounded-lg border bg-card overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/30">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Landmark className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{t.county || "Tax Record"}</p>
                <p className="text-xs text-muted-foreground truncate">{t.tax_authority || "County tax"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => startEdit(t)} title="Edit tax record"
                className="rounded-md p-2 text-muted-foreground hover:bg-background hover:text-primary transition-colors">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(t)} title="Delete tax record"
                className="rounded-md p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Card body */}
          <div className="px-5 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Annual Tax</p>
                <p className="mt-0.5 text-lg font-bold text-foreground">{t.annual_tax ? formatCurrency(t.annual_tax) : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Parcel ID</p>
                <p className="mt-0.5 text-sm font-medium text-foreground font-mono">{t.parcel_id || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Frequency</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">{t.payment_frequency || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Next Due</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">
                  {t.next_due_date ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                      {new Date(t.next_due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  ) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Card footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground">
              {t.portal_url ? "Payment portal available" : "No payment portal URL set"}
            </p>
            {t.portal_url && /^https?:\/\//.test(t.portal_url) && (
              <Link href={t.portal_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-[#00D632] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#00b82a] hover:shadow-md transition-all">
                <ExternalLink className="h-4 w-4" /> Pay Taxes
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
