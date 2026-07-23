"use client";

import { use, useState } from "react";
import { Plus, Pencil, Landmark } from "lucide-react";
import { useMortgage, useCreateMortgage, useUpdateMortgage, useDeleteMortgage } from "@/lib/hooks/useMortgage";
import { useProperty } from "@/lib/hooks/useProperties";
import { MortgageForm } from "@/components/mortgage/MortgageForm";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency, formatDateFull } from "@/lib/utils";
import type { MortgageCreateData } from "@/lib/api/mortgage";

export default function MortgagePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: property } = useProperty(id);
  const { data: mortgage, isLoading, isError, refetch } = useMortgage(id);
  const createMortgage = useCreateMortgage(id);
  const updateMortgage = useUpdateMortgage(id);
  const deleteMortgage = useDeleteMortgage(id);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) return <LoadingState text="Loading mortgage info..." />;
  if (isError) return <ErrorState title="Failed to load mortgage" onRetry={() => refetch()} />;

  const handleCreate = async (data: MortgageCreateData) => {
    await createMortgage.mutateAsync(data);
    setShowForm(false);
  };

  const handleUpdate = async (data: MortgageCreateData) => {
    if (mortgage) {
      await updateMortgage.mutateAsync({ id: mortgage.id, data });
      setIsEditing(false);
    }
  };

  // Show form (add or edit mode)
  if (showForm || isEditing) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {isEditing ? "Edit Mortgage" : "Add Mortgage"}
          {property && <span className="text-muted-foreground font-normal"> — {property.name}</span>}
        </h2>
        <div className="rounded-lg border bg-card p-6">
          <MortgageForm
            initialData={isEditing ? mortgage || undefined : undefined}
            onSubmit={isEditing ? handleUpdate : handleCreate}
            isLoading={createMortgage.isPending || updateMortgage.isPending}
            onCancel={() => { setShowForm(false); setIsEditing(false); }}
          />
        </div>
      </div>
    );
  }

  // Empty state — no mortgage
  if (!mortgage) {
    return (
      <EmptyState
        icon={<Landmark className="h-16 w-16" />}
        title="No mortgage set up"
        description={property ? `Add mortgage details for ${property.name} to track payments and lender information.` : undefined}
        action={
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            Add Mortgage
          </button>
        }
      />
    );
  }

  // Mortgage details view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mortgage Details</h2>
        <div className="flex gap-2">
          <button onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        </div>
      </div>

      {/* Lender Info */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Lender Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DetailItem label="Lender" value={mortgage.lender_name} />
          <DetailItem label="Loan Number" value={mortgage.loan_number || "—"} />
          <DetailItem label="Loan Type" value={mortgage.loan_type || "—"} />
          <DetailItem label="Interest Rate" value={mortgage.interest_rate ? `${mortgage.interest_rate}%` : "—"} />
        </div>
      </div>

      {/* Financial */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Financial Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DetailItem label="Original Amount" value={mortgage.original_amount ? formatCurrency(Number(mortgage.original_amount)) : "—"} />
          <DetailItem label="Current Balance" value={mortgage.current_balance ? formatCurrency(Number(mortgage.current_balance)) : "—"} />
          <DetailItem label="Monthly Payment" value={mortgage.monthly_payment ? formatCurrency(Number(mortgage.monthly_payment)) : "—"} />
          <DetailItem label="Loan Term" value={mortgage.loan_term_months ? `${mortgage.loan_term_months} months` : "—"} />
        </div>
      </div>

      {/* Dates */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Payment Schedule</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DetailItem label="Start Date" value={mortgage.start_date ? formatDateFull(mortgage.start_date) : "—"} />
          <DetailItem label="Maturity Date" value={mortgage.maturity_date ? formatDateFull(mortgage.maturity_date) : "—"} />
          <DetailItem label="Next Due Date" value={mortgage.next_due_date ? formatDateFull(mortgage.next_due_date) : "—"} />
          <DetailItem label="Autopay" value={mortgage.autopay_enabled ? "Enabled" : "Disabled"} valueClass={mortgage.autopay_enabled ? "text-emerald-600" : "text-muted-foreground"} />
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${valueClass || ""}`}>{value}</p>
    </div>
  );
}
