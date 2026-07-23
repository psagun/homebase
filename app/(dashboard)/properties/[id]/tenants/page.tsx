"use client";
import { useEffect, useState } from "react";
import { useProperty } from "@/lib/hooks/useProperties";
import { LoadingState } from "@/components/shared/LoadingState";
import { formatCurrency } from "@/lib/utils";
import { Phone, Mail, Calendar } from "lucide-react";

interface TenantData { id: string; name: string; email?: string; phone?: string; move_in_date?: string; lease_start?: string; lease_end?: string; monthly_rent?: number; security_deposit?: number; }

export default function TenantsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: property } = useProperty(id);
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", phone: "", monthly_rent: "", lease_start: "", lease_end: "" });

  useEffect(() => {
    fetch(`/api/v1/properties/${id}/tenants`, { credentials: "include" })
      .then(r => r.json()).then(d => setTenants(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const addTenant = async () => {
    await fetch(`/api/v1/properties/${id}/tenants`, { method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, monthly_rent: Number(form.monthly_rent) || 0 }) });
    setForm({ name: "", email: "", phone: "", monthly_rent: "", lease_start: "", lease_end: "" });
    const r = await fetch(`/api/v1/properties/${id}/tenants`, { credentials: "include" });
    setTenants(await r.json());
  };

  if (loading) return <LoadingState text="Loading tenants..." />;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Tenants{property ? <span className="text-muted-foreground font-normal"> — {property.name}</span> : ""}</h2>

      {tenants.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No tenants yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tenants.map(t => (
            <div key={t.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">{t.name.charAt(0)}</div>
                <div><p className="font-semibold">{t.name}</p>{t.monthly_rent ? <p className="text-sm text-emerald-600">{formatCurrency(t.monthly_rent)}/mo</p> : null}</div>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {t.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{t.email}</p>}
                {t.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{t.phone}</p>}
                {t.lease_start && <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />Lease: {new Date(t.lease_start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} → {t.lease_end ? new Date(t.lease_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Ongoing"}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <details className="rounded-lg border bg-card p-4">
        <summary className="text-sm font-semibold cursor-pointer">Add Tenant</summary>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <input placeholder="Name *" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className="rounded-md border px-3 py-2 text-sm" />
          <input placeholder="Email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} className="rounded-md border px-3 py-2 text-sm" />
          <input placeholder="Phone" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} className="rounded-md border px-3 py-2 text-sm" />
          <input type="number" placeholder="Monthly Rent $" value={form.monthly_rent} onChange={e => setForm(p => ({...p, monthly_rent: e.target.value}))} className="rounded-md border px-3 py-2 text-sm" />
          <input type="date" value={form.lease_start} onChange={e => setForm(p => ({...p, lease_start: e.target.value}))} className="rounded-md border px-3 py-2 text-sm" />
          <input type="date" value={form.lease_end} onChange={e => setForm(p => ({...p, lease_end: e.target.value}))} className="rounded-md border px-3 py-2 text-sm" />
          <button onClick={addTenant} className="col-span-2 rounded-md bg-primary py-2 text-sm text-white hover:bg-primary/90">Add Tenant</button>
        </div>
      </details>
    </div>
  );
}
