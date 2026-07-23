"use client";

import { useState, type FormEvent } from "react";
import type { InsuranceCreateData, InsuranceData } from "@/lib/api/insurance";

interface Props {
  initialData?: InsuranceData;
  onSubmit: (data: InsuranceCreateData) => Promise<void>;
  isLoading: boolean;
  onCancel: () => void;
}

export function InsuranceForm({ initialData, onSubmit, isLoading, onCancel }: Props) {
  const [provider, setProvider] = useState(initialData?.provider_name || "");
  const [policyNumber, setPolicyNumber] = useState(initialData?.policy_number || "");
  const [policyType, setPolicyType] = useState(initialData?.policy_type || "HO-3");
  const [coverage, setCoverage] = useState(initialData?.coverage_amount?.toString() || "");
  const [deductible, setDeductible] = useState(initialData?.deductible?.toString() || "");
  const [premium, setPremium] = useState(initialData?.annual_premium?.toString() || "");
  const [effDate, setEffDate] = useState(initialData?.effective_date || "");
  const [expDate, setExpDate] = useState(initialData?.expiration_date || "");
  const [renewDate, setRenewDate] = useState(initialData?.renewal_date || "");
  const [portalUrl, setPortalUrl] = useState(initialData?.portal_url || "");
  const [agentName, setAgentName] = useState(initialData?.agent_name || "");
  const [agentPhone, setAgentPhone] = useState(initialData?.agent_phone || "");
  const [agentEmail, setAgentEmail] = useState(initialData?.agent_email || "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!provider.trim()) { setError("Provider name is required."); return; }
    try {
      await onSubmit({
        provider_name: provider.trim(),
        policy_number: policyNumber.trim() || undefined,
        policy_type: policyType,
        coverage_amount: coverage ? Number(coverage) : null,
        deductible: deductible ? Number(deductible) : null,
        annual_premium: premium ? Number(premium) : null,
        effective_date: effDate || null,
        expiration_date: expDate || null,
        renewal_date: renewDate || null,
        portal_url: portalUrl.trim() || undefined,
        agent_name: agentName.trim() || null,
        agent_phone: agentPhone.trim() || null,
        agent_email: agentEmail.trim() || null,
      });
    } catch (err: unknown) {
      setError(err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Failed to save");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Provider *</label>
          <input type="text" required value={provider} onChange={e => setProvider(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="e.g. State Farm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Policy Number</label>
          <input type="text" value={policyNumber} onChange={e => setPolicyNumber(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Policy Type</label>
          <input type="text" value={policyType} onChange={e => setPolicyType(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="e.g. HO-3, DP-1" />
        </div>
      </div>

      <fieldset className="rounded-md border p-4">
        <legend className="text-sm font-semibold px-2">Coverage</legend>
        <div className="grid gap-4 md:grid-cols-3 mt-2">
          <div>
            <label className="block text-sm font-medium mb-1">Coverage Amount ($)</label>
            <input type="number" value={coverage} onChange={e => setCoverage(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deductible ($)</label>
            <input type="number" value={deductible} onChange={e => setDeductible(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Annual Premium ($)</label>
            <input type="number" value={premium} onChange={e => setPremium(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-md border p-4">
        <legend className="text-sm font-semibold px-2">Dates</legend>
        <div className="grid gap-4 md:grid-cols-3 mt-2">
          <div><label className="block text-sm font-medium mb-1">Effective</label>
            <input type="date" value={effDate} onChange={e => setEffDate(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" /></div>
          <div><label className="block text-sm font-medium mb-1">Expiration</label>
            <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" /></div>
          <div><label className="block text-sm font-medium mb-1">Renewal</label>
            <input type="date" value={renewDate} onChange={e => setRenewDate(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" /></div>
        </div>
      </fieldset>

      <div className="md:col-span-3">
          <label className="block text-sm font-medium mb-1">Payment Portal URL</label>
          <input type="url" value={portalUrl} onChange={e => setPortalUrl(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="https://providerportal.com/pay" />
          <p className="text-xs text-muted-foreground mt-0.5">Link for the \"Make Payment\" shortcut on the overview page</p>
        </div>
      <fieldset className="rounded-md border p-4">
        <legend className="text-sm font-semibold px-2">Agent Information</legend>
        <div className="grid gap-4 md:grid-cols-3 mt-2">
          <div><label className="block text-sm font-medium mb-1">Name</label>
            <input type="text" value={agentName} onChange={e => setAgentName(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" /></div>
          <div><label className="block text-sm font-medium mb-1">Phone</label>
            <input type="text" value={agentPhone} onChange={e => setAgentPhone(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" /></div>
          <div><label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={agentEmail} onChange={e => setAgentEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" /></div>
        </div>
      </fieldset>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
        <button type="submit" disabled={isLoading}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
          {isLoading ? "Saving..." : initialData ? "Save Changes" : "Add Policy"}
        </button>
      </div>
    </form>
  );
}
