"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Landmark, CalendarClock, ExternalLink } from "lucide-react";
import { useProperty } from "@/lib/hooks/useProperties";
import { useHoaFees } from "@/lib/hooks/useHoa";
import { createHoaFee, updateHoaFee, deleteHoaFee, type HoaFeeData } from "@/lib/api/hoa";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ActionsMenu } from "@/components/shared/ActionsMenu";
import { formatCurrency, formatDate } from "@/lib/utils";

const EMPTY_FORM = {
  association_name: "", fee_amount: "", payment_frequency: "Monthly",
  next_due_date: "", portal_url: "", notes: "",
};

export default function HoaPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: property } = useProperty(id);
  const { data: fees, isLoading, isError, refetch } = useHoaFees(id);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  if (isLoading) return <LoadingState text="Loading HOA fees..." />;
  if (isError) return <ErrorState title="Failed to load HOA fees" onRetry={() => refetch()} />;

  const resetForm = () => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(false); };

  const startEdit = (f: HoaFeeData) => {
    setEditId(f.id);
    setForm({
      association_name: f.association_name || "",
      fee_amount: f.fee_amount ? String(f.fee_amount) : "",
      payment_frequency: f.payment_frequency || "Monthly",
      next_due_date: f.next_due_date || "",
      portal_url: f.portal_url || "",
      notes: f.notes || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.association_name.trim()) { setMsg({ text: "Association name is required", ok: false }); return; }
    setSaving(true); setMsg(null);
    try {
      const payload = {
        ...form,
        association_name: form.association_name.trim(),
        fee_amount: Number(form.fee_amount) || 0,
      };
      if (editId) {
        await updateHoaFee(id, editId, payload);
      } else {
        await createHoaFee(id, payload);
      }
      await refetch();
      resetForm();
      setMsg({ text: editId ? "HOA updated" : "HOA added", ok: true });
      setTimeout(() => setMsg(null), 2500);
    } catch {
      setMsg({ text: "Failed to save HOA", ok: false });
    }
    setSaving(false);
  };

  const handleDelete = async (f: HoaFeeData) => {
    try {
      await deleteHoaFee(id, f.id);
      await refetch();
      setMsg({ text: "HOA removed", ok: true });
      setTimeout(() => setMsg(null), 2500);
    } catch {
      setMsg({ text: "Failed to delete HOA", ok: false });
      setTimeout(() => setMsg(null), 2500);
    }
  };

  const list = fees || [];
  const total = list.reduce((s, f) => s + (Number(f.fee_amount) || 0), 0);
  const next = list
    .filter((f) => f.next_due_date)
    .sort((a, b) => (a.next_due_date! > b.next_due_date! ? 1 : -1))[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            HOA{property ? <span className="text-muted-foreground font-normal"> — {property.name}</span> : ""}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Homeowners association dues and payment portals</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Add HOA
          </button>
        )}
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {showForm ? (
        <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Association name *</label>
              <input value={form.association_name} onChange={(e) => setForm({ ...form, association_name: e.target.value })}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g. Oakwood HOA" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</label>
              <input type="number" step="0.01" min="0" value={form.fee_amount}
                onChange={(e) => setForm({ ...form, fee_amount: e.target.value })}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g. 600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Frequency</label>
              <select value={form.payment_frequency}
                onChange={(e) => setForm({ ...form, payment_frequency: e.target.value })}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option>Monthly</option><option>Quarterly</option><option>Semi-Annual</option><option>Annual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Next due date</label>
              <input type="date" value={form.next_due_date}
                onChange={(e) => setForm({ ...form, next_due_date: e.target.value })}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment portal URL</label>
              <input type="url" value={form.portal_url}
                onChange={(e) => setForm({ ...form, portal_url: e.target.value })}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="https://portal.example.com" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Optional notes" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
              {saving ? "Saving…" : editId ? "Update" : "Add"}
            </button>
            <button type="button" onClick={resetForm}
              className="rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
              Cancel
            </button>
          </div>
        </form>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Landmark className="h-16 w-16" />}
          title="No HOA records yet"
          description="Track homeowners association dues, payment portals, and due dates."
          action={
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Add HOA
            </button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Landmark className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Total HOA Dues</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatCurrency(total)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{list.length} record{list.length > 1 ? "s" : ""}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CalendarClock className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Next Due Date</span>
              </div>
              <p className="text-xl font-bold text-foreground">{next ? formatDate(next.next_due_date!) : "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{next?.association_name || "No upcoming dues"}</p>
            </div>
          </div>

          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Association</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Amount</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Frequency</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Next Due</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Portal</th>
                  <th className="p-3 w-12" />
                </tr>
              </thead>
              <tbody>
                {list.map((f) => (
                  <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 text-sm font-medium">{f.association_name}</td>
                    <td className="p-3 text-sm">{f.fee_amount ? formatCurrency(Number(f.fee_amount)) : "—"}</td>
                    <td className="p-3 text-sm text-muted-foreground">{f.payment_frequency || "—"}</td>
                    <td className="p-3 text-sm">{f.next_due_date ? formatDate(f.next_due_date) : "—"}</td>
                    <td className="p-3">
                      {f.portal_url ? (
                        <a href={f.portal_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" /> Pay
                        </a>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-right sticky right-0 bg-card">
                      <ActionsMenu
                        label="HOA"
                        actions={[
                          { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: () => startEdit(f) },
                          { label: "Delete", icon: <Trash2 className="h-4 w-4" />, destructive: true, onClick: () => handleDelete(f) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
