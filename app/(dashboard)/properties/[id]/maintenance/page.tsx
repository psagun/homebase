"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Wrench, Calendar, DollarSign, ShieldCheck, X, Check, Clock } from "lucide-react";
import { useProperty } from "@/lib/hooks/useProperties";
import { useMaintenance } from "@/lib/hooks/useMaintenance";
import { createMaintenance, updateMaintenance, deleteMaintenance, type MaintenanceData } from "@/lib/api/maintenance";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ActionsMenu } from "@/components/shared/ActionsMenu";
import { formatCurrency } from "@/lib/utils";

const EMPTY_FORM = {
  title: "", description: "", category: "", priority: "Medium", status: "Open",
  date: "", scheduled_date: "", completed_date: "", cost: "", contractor: "", notes: "", warranty_expiration: "",
};

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-blue-50 text-blue-700",
  "In Progress": "bg-amber-50 text-amber-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-gray-100 text-gray-600",
};

export default function MaintenancePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: property } = useProperty(id);
  const { data: records, isLoading, isError, refetch } = useMaintenance(id);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const resetForm = () => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(false); };

  const startEdit = (r: MaintenanceData) => {
    setEditId(r.id);
    setForm({
      title: r.title || "", description: r.description || "", category: r.category || "",
      priority: r.priority || "Medium", status: r.status || "Open",
      date: r.date || "", scheduled_date: r.scheduled_date || "", completed_date: r.completed_date || "",
      cost: r.cost ? String(r.cost) : "", contractor: r.contractor || "", notes: r.notes || "",
      warranty_expiration: r.warranty_expiration || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { setMsg({ text: "Title is required", ok: false }); return; }
    setSaving(true); setMsg(null);
    try {
      const payload = { ...form, title: form.title.trim(), cost: Number(form.cost) || 0 };
      if (editId) {
        await updateMaintenance(id, editId, payload);
      } else {
        await createMaintenance(id, payload);
      }
      await refetch();
      resetForm();
      setMsg({ text: editId ? "Record updated" : "Record added", ok: true });
      setTimeout(() => setMsg(null), 2500);
    } catch {
      setMsg({ text: "Failed to save record", ok: false });
    }
    setSaving(false);
  };

  const handleDelete = async (r: MaintenanceData) => {
    try {
      await deleteMaintenance(id, r.id);
      await refetch();
      setMsg({ text: "Record deleted", ok: true });
      setTimeout(() => setMsg(null), 2500);
    } catch {
      setMsg({ text: "Failed to delete record", ok: false });
    }
  };

  if (isLoading) return <LoadingState text="Loading maintenance records..." />;
  if (isError) return <ErrorState title="Failed to load" onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Maintenance{property ? <span className="text-muted-foreground font-normal"> — {property.name}</span> : ""}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{(records || []).length} record{(records || []).length !== 1 ? "s" : ""}</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Add Record
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
            <h3 className="text-base font-semibold">{editId ? "Edit Maintenance Record" : "Add Maintenance Record"}</h3>
            <button onClick={resetForm} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Title *</label>
              <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. HVAC repair" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="">Select...</option>
                <option value="HVAC">HVAC</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Roofing">Roofing</option>
                <option value="Landscaping">Landscaping</option>
                <option value="Appliances">Appliances</option>
                <option value="Structural">Structural</option>
                <option value="Cosmetic">Cosmetic</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Vendor / Contractor</label>
              <input value={form.contractor} onChange={(e) => setForm((p) => ({ ...p, contractor: e.target.value }))}
                placeholder="Company name" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Cost ($)</label>
              <input type="number" step="0.01" value={form.cost} onChange={(e) => setForm((p) => ({ ...p, cost: e.target.value }))}
                placeholder="0.00" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Scheduled Date</label>
              <input type="date" value={form.scheduled_date} onChange={(e) => setForm((p) => ({ ...p, scheduled_date: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Completed Date</label>
              <input type="date" value={form.completed_date} onChange={(e) => setForm((p) => ({ ...p, completed_date: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Warranty Expiration</label>
              <input type="date" value={form.warranty_expiration} onChange={(e) => setForm((p) => ({ ...p, warranty_expiration: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="What was done?" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Internal notes" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSubmit} disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
              <Check className="h-4 w-4" /> {editId ? "Save Changes" : "Add Record"}
            </button>
            <button onClick={resetForm} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Records */}
      {(records || []).length === 0 && !showForm ? (
        <div className="rounded-lg border bg-card py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Wrench className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">No maintenance records yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Track repairs, scheduled work, and vendor costs.
          </p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add Record
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {(records || []).map((r) => (
            <div key={r.id} className="group rounded-lg border bg-card overflow-hidden">
              <div className="flex items-start justify-between px-4 py-3 border-b bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate">{r.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {[r.category, r.contractor].filter(Boolean).join(" · ") || "Maintenance"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.status && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600"}`}>
                      {r.status}
                    </span>
                  )}
                  <ActionsMenu
                    label={`${r.title}`}
                    actions={[
                      { label: "Edit Record", icon: <Pencil className="h-4 w-4" />, onClick: () => startEdit(r) },
                      { label: "Delete", icon: <Trash2 className="h-4 w-4" />, destructive: true, onClick: () => handleDelete(r) },
                    ]}
                  />
                </div>
              </div>
              <div className="px-4 py-3">
                {r.description && <p className="text-sm text-muted-foreground mb-2">{r.description}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  {r.cost ? (
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <DollarSign className="h-3 w-3" />{formatCurrency(r.cost)}
                    </span>
                  ) : null}
                  {r.scheduled_date && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Scheduled: {new Date(r.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  )}
                  {r.completed_date && (
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Completed: {new Date(r.completed_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  )}
                  {r.date && !r.scheduled_date && !r.completed_date && (
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  )}
                  {r.priority && r.priority !== "Medium" && (
                    <span className={`font-medium ${r.priority === "High" || r.priority === "Critical" ? "text-red-600" : ""}`}>
                      {r.priority} priority
                    </span>
                  )}
                  {r.warranty_expiration && (
                    <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" />Warranty: {new Date(r.warranty_expiration).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  )}
                </div>
                {r.notes && <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">{r.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
