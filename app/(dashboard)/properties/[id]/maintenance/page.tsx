"use client";
import { useEffect, useState } from "react";
import { useProperty } from "@/lib/hooks/useProperties";
import { LoadingState } from "@/components/shared/LoadingState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Wrench, Calendar, DollarSign, ShieldCheck } from "lucide-react";

interface MaintenanceData { id: string; title: string; description?: string; date?: string; cost?: number; contractor?: string; warranty_expiration?: string; }

export default function MaintenancePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: property } = useProperty(id);
  const [records, setRecords] = useState<MaintenanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", description: "", date: "", cost: "", contractor: "", warranty_expiration: "" });

  useEffect(() => {
    fetch(`/api/v1/properties/${id}/maintenance`, { credentials: "include" })
      .then(r => r.json()).then(d => setRecords(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const addRecord = async () => {
    await fetch(`/api/v1/properties/${id}/maintenance`, { method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, cost: Number(form.cost) || 0 }) });
    setForm({ title: "", description: "", date: "", cost: "", contractor: "", warranty_expiration: "" });
    const r = await fetch(`/api/v1/properties/${id}/maintenance`, { credentials: "include" });
    setRecords(await r.json());
  };

  if (loading) return <LoadingState text="Loading maintenance records..." />;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Maintenance{property ? <span className="text-muted-foreground font-normal"> — {property.name}</span> : ""}</h2>

      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No maintenance records yet.</p>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">{r.title}</h3>
                </div>
                {r.cost ? <span className="text-sm font-mono font-semibold">{formatCurrency(r.cost)}</span> : null}
              </div>
              {r.description && <p className="text-sm text-muted-foreground mb-2">{r.description}</p>}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {r.date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                {r.contractor && <span className="flex items-center gap-1"><Wrench className="h-3 w-3" />{r.contractor}</span>}
                {r.warranty_expiration && <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" />Warranty: {r.warranty_expiration}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <details className="rounded-lg border bg-card p-4">
        <summary className="text-sm font-semibold cursor-pointer">Add Record</summary>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <input placeholder="Title *" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} className="rounded-md border px-3 py-2 text-sm" />
          <input type="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} className="rounded-md border px-3 py-2 text-sm" />
          <input type="number" placeholder="Cost $" value={form.cost} onChange={e => setForm(p => ({...p, cost: e.target.value}))} className="rounded-md border px-3 py-2 text-sm" />
          <input placeholder="Contractor" value={form.contractor} onChange={e => setForm(p => ({...p, contractor: e.target.value}))} className="rounded-md border px-3 py-2 text-sm" />
          <input type="date" placeholder="Warranty Exp" value={form.warranty_expiration} onChange={e => setForm(p => ({...p, warranty_expiration: e.target.value}))} className="rounded-md border px-3 py-2 text-sm" />
          <button onClick={addRecord} className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90">Save</button>
        </div>
      </details>
    </div>
  );
}
