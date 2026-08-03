"use client";

import { useState } from "react";
import { Plus, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { useInsurance, useCreateInsurance, useUpdateInsurance, useDeleteInsurance } from "@/lib/hooks/useInsurance";
import { useProperty } from "@/lib/hooks/useProperties";
import { InsuranceForm } from "@/components/insurance/InsuranceForm";
import { ActionsMenu } from "@/components/shared/ActionsMenu";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/utils";
import type { InsuranceCreateData } from "@/lib/api/insurance";

export default function InsurancePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: property } = useProperty(id);
  const { data: policy, isLoading, isError, refetch } = useInsurance(id);
  const createPolicy = useCreateInsurance(id);
  const updatePolicy = useUpdateInsurance(id);
  const deletePolicy = useDeleteInsurance(id);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);

  if (isLoading) return <LoadingState text="Loading insurance info..." />;
  if (isError) return <ErrorState title="Failed to load insurance" onRetry={() => refetch()} />;

  const handleSave = async (data: InsuranceCreateData) => {
    if (editing && policy) await updatePolicy.mutateAsync({ id: policy.id, data });
    else await createPolicy.mutateAsync(data);
    setShowForm(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!policy) return;
    try {
      await deletePolicy.mutateAsync(policy.id);
    } catch { /* handled by query client */ }
  };

  if (showForm || editing) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">{editing ? "Edit Policy" : "Add Insurance Policy"}{property && <span className="text-muted-foreground font-normal"> — {property.name}</span>}</h2>
        <div className="rounded-lg border bg-card p-6">
          <InsuranceForm initialData={editing ? policy || undefined : undefined} onSubmit={handleSave} isLoading={createPolicy.isPending || updatePolicy.isPending} onCancel={() => { setShowForm(false); setEditing(false); }} />
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <EmptyState icon={<ShieldCheck className="h-16 w-16" />} title="No insurance set up"
        description={property ? `Add an insurance policy for ${property.name}.` : undefined}
        action={<button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"><Plus className="h-4 w-4" />Add Policy</button>} />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Insurance Policy</h2>
        <ActionsMenu
          label="Insurance policy"
          actions={[
            { label: "Edit Policy", icon: <Pencil className="h-4 w-4" />, onClick: () => setEditing(true) },
            { label: "Delete Policy", icon: <Trash2 className="h-4 w-4" />, destructive: true, onClick: handleDelete },
          ]}
        />
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Policy Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Item label="Provider" value={policy.provider_name} />
          <Item label="Policy #" value={policy.policy_number || "—"} />
          <Item label="Type" value={policy.policy_type || "—"} />
          <Item label="Coverage" value={policy.coverage_amount ? formatCurrency(Number(policy.coverage_amount)) : "—"} />
          <Item label="Deductible" value={policy.deductible ? formatCurrency(Number(policy.deductible)) : "—"} />
          <Item label="Annual Premium" value={policy.annual_premium ? formatCurrency(Number(policy.annual_premium)) : "—"} />
          <Item label="Effective" value={policy.effective_date ? new Date(policy.effective_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"} />
          <Item label="Expiration" value={policy.expiration_date ? new Date(policy.expiration_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"} />
          <Item label="Renewal" value={policy.renewal_date ? new Date(policy.renewal_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"} />
        </div>
      </div>

      {policy.agent_name && (
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Agent Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Item label="Name" value={policy.agent_name} />
            <Item label="Phone" value={policy.agent_phone || "—"} />
            <Item label="Email" value={policy.agent_email || "—"} />
          </div>
        </div>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}
