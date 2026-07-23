"use client";
import { useEffect, useState } from "react";
import { useProperty } from "@/lib/hooks/useProperties";
import { LoadingState } from "@/components/shared/LoadingState";
import { formatCurrency } from "@/lib/utils";

interface TaxData { id: string; county?: string; tax_authority?: string; parcel_id?: string; annual_tax?: number; payment_frequency?: string; next_due_date?: string; }

export default function TaxesPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: property } = useProperty(id);
  const [taxes, setTaxes] = useState<TaxData[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ county: "", tax_authority: "", parcel_id: "", annual_tax: "", payment_frequency: "Annual", next_due_date: "" });

  useEffect(() => {
    fetch(`/api/v1/properties/${id}/taxes`, { credentials: "include" })
      .then(r => r.json()).then(d => setTaxes(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const addTax = async () => {
    await fetch(`/api/v1/properties/${id}/taxes`, { method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, annual_tax: Number(form.annual_tax) || 0 }) });
    setForm({ county: "", tax_authority: "", parcel_id: "", annual_tax: "", payment_frequency: "Annual", next_due_date: "" });
    const r = await fetch(`/api/v1/properties/${id}/taxes`, { credentials: "include" });
    setTaxes(await r.json());
  };

  if (loading) return <LoadingState text="Loading tax info..." />;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Property Taxes{property ? <span className="text-muted-foreground font-normal"> — {property.name}</span> : ""}</h2>

      {taxes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No tax records yet.</p>
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
        </div>
      ))}

      <details className="rounded-lg border bg-card p-4">
        <summary className="text-sm font-semibold cursor-pointer">Add Tax Record</summary>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          <input placeholder="County" value={form.county} onChange={e => setForm(p => ({...p, county: e.target.value}))} className="rounded-md border px-3 py-2 text-sm" />
          <input placeholder="Tax Authority" value={form.tax_authority} onChange={e => setForm(p => ({...p, tax_authority: e.target.value}))} className="rounded-md border px-3 py-2 text-sm" />
          <input placeholder="Parcel ID" value={form.parcel_id} onChange={e => setForm(p => ({...p, parcel_id: e.target.value}))} className="rounded-md border px-3 py-2 text-sm" />
          <input type="number" placeholder="Annual Tax $" value={form.annual_tax} onChange={e => setForm(p => ({...p, annual_tax: e.target.value}))} className="rounded-md border px-3 py-2 text-sm" />
          <input type="date" value={form.next_due_date} onChange={e => setForm(p => ({...p, next_due_date: e.target.value}))} className="rounded-md border px-3 py-2 text-sm" />
          <button onClick={addTax} className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90">Save</button>
        </div>
      </details>
    </div>
  );
}
