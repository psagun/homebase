"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus, Pencil, Trash2, Check, X, Landmark } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Property Taxes{property ? <span className="text-muted-foreground font-normal"> — {property.name}</span> : ""}</h2>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Add Tax Record
          </button>
        )}
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">{editId ? "Edit Tax Record" : "Add Tax Record"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">County</label>
              <input placeholder="e.g. Maricopa" value={form.county} onChange={e => setForm(p => ({ ...p, county: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tax Authority</label>
              <input placeholder="e.g. County Assessor" value={form.tax_authority} onChange={e => setForm(p => ({ ...p, tax_authority: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Parcel ID</label>
              <input placeholder="Parcel / APN number" value={form.parcel_id} onChange={e => setForm(p => ({ ...p, parcel_id: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Annual Tax ($)</label>
              <input type="number" step="0.01" placeholder="0.00" value={form.annual_tax} onChange={e => setForm(p => ({ ...p, annual_tax: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Payment Frequency</label>
              <select value={form.payment_frequency} onChange={e => setForm(p => ({ ...p, payment_frequency: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none">
                <option value="Annual">Annual</option>
                <option value="Semi-Annual">Semi-Annual</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Next Due Date</label>
              <input type="date" value={form.next_due_date} onChange={e => setForm(p => ({ ...p, next_due_date: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Tax Payment Portal URL</label>
              <input placeholder="https://taxportal.county.gov/..." value={form.portal_url} onChange={e => setForm(p => ({ ...p, portal_url: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none" />
              <p className="text-xs text-muted-foreground mt-1">Adds a &quot;Pay Taxes&quot; button that opens this link.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {saving ? <span>...</span> : <Check className="h-4 w-4" />}
              {editId ? "Save Changes" : "Add Record"}
            </button>
            <button onClick={resetForm} className="flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium">
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tax Records List */}
      {taxes.length === 0 && !showForm ? (
        <div className="rounded-lg border bg-card py-10 text-center">
          <Landmark className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No tax records yet. Add one to track county taxes.</p>
        </div>
      ) : taxes.map(t => (
        <div key={t.id} className="rounded-lg border bg-card p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-xs text-muted-foreground uppercase">County</p><p className="text-sm font-semibold">{t.county || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Tax Authority</p><p className="text-sm font-semibold">{t.tax_authority || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Parcel ID</p><p className="text-sm font-semibold">{t.parcel_id || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Annual Tax</p><p className="text-sm font-semibold">{t.annual_tax ? formatCurrency(t.annual_tax) : "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Frequency</p><p className="text-sm font-semibold">{t.payment_frequency || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Next Due</p><p className="text-sm font-semibold">{t.next_due_date ? new Date(t.next_due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</p></div>
          </div>
          <div className="flex items-center gap-3 mt-4 pt-3 border-t">
            {t.portal_url ? (
              <Link href={t.portal_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-[#00D632] px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-[#00b82a] transition-colors">
                <ExternalLink className="h-4 w-4" /> Pay Taxes
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground">No payment portal URL set</span>
            )}
            <button onClick={() => startEdit(t)}
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button onClick={() => handleDelete(t)}
              className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
