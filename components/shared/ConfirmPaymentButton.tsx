"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { confirmPayment, fetchPaymentHistory } from "@/lib/api/payments";
import { usePendingPayment } from "@/lib/hooks/usePendingPayment";

interface ConfirmPaymentButtonProps {
  paymentType: "mortgage" | "insurance" | "tax" | "hoa";
  sourceId: string;
  /** The record's CURRENT due date — this is the payment cycle being confirmed */
  dueDate?: string | null;
  /** Friendly label for the payment type, e.g. "mortgage" */
  label?: string;
  /** Callback fired after a successful confirmation (e.g. to refresh data) */
  onConfirmed?: (nextDueDate: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
  mortgage: "mortgage",
  insurance: "insurance",
  tax: "tax",
  hoa: "hoa",
};

/**
 * "Confirm Payment" for a specific payment cycle.
 *
 * Flow (per spec):
 *  1. User clicks "Pay" → provider site opens in a new tab, and a pending
 *     flag is stored with the exact due date.
 *  2. When the user returns to HomeBase, the dialog opens automatically
 *     asking: "Did you successfully complete your {type} payment due on {date}?"
 *  3. "Yes" records the confirmation for THAT cycle. The backend verifies the
 *     due date still matches, so confirming twice (or confirming the next
 *     cycle by accident) is rejected.
 *  4. After confirmation the button shows "Confirmed ✓" and is inactive until
 *     the next payment cycle.
 */
export function ConfirmPaymentButton({
  paymentType,
  sourceId,
  dueDate,
  label,
  onConfirmed,
}: ConfirmPaymentButtonProps) {
  const { pending, markPending, clearPending } = usePendingPayment(paymentType, sourceId);
  const [dialog, setDialog] = useState<"confirm" | "done" | null>(null);
  const [saving, setSaving] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const typeLabel = label || TYPE_LABEL[paymentType] || "payment";
  const formattedDue = dueDate ? new Date(dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

  // Check payment history: if this cycle was already confirmed (the record's
  // current due date equals the next_due_date of the last confirmation), keep
  // the "Confirmed" state even across page reloads / refetches.
  useEffect(() => {
    if (!dueDate || !sourceId) return;
    fetchPaymentHistory(undefined, paymentType)
      .then((history) => {
        const mine = history.filter((h) => h.source_id === sourceId);
        const latest = mine.sort((a, b) => (a.confirmed_at < b.confirmed_at ? 1 : -1))[0];
        if (latest && latest.next_due_date === dueDate) {
          setConfirmed(true);
        }
      })
      .catch(() => {});
  }, [dueDate, sourceId, paymentType]);

  // Auto-open the dialog when the user returns from the provider's site
  useEffect(() => {
    if (pending && dueDate && !confirmed) {
      setDialog("confirm");
    }
  }, [pending, dueDate, confirmed]);

  const handleYes = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const result = await confirmPayment(paymentType, sourceId, dueDate || undefined);
      setResultMsg(result.message);
      setDialog("done");
      setConfirmed(true);
      clearPending();
      onConfirmed?.(result.next_due_date);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record the payment.";
      setErrorMsg(msg);
      // If the cycle was already confirmed, don't show a stale pending state
      if (msg.includes("already been confirmed")) {
        setConfirmed(true);
        clearPending();
      }
    }
    setSaving(false);
  };

  // Triggered by the Pay button — opens the provider site and arms the pending flag
  const handlePay = () => {
    markPending(dueDate || undefined);
  };

  return (
    <>
      {confirmed ? (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Confirmed{formattedDue ? ` — next due ${formattedDue}` : ""}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setDialog("confirm")}
          title={formattedDue ? `Confirm the payment due ${formattedDue}` : "Confirm this payment"}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Confirm
        </button>
      )}

      {dialog === "confirm" && (
        <div role="alertdialog" aria-modal="true" aria-label="Confirm Payment" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDialog(null)} />
          <div className="relative w-full max-w-sm rounded-xl border bg-popover p-6 shadow-xl">
            <h3 className="text-base font-semibold text-popover-foreground">Confirm Payment</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Did you successfully complete your {typeLabel} payment{formattedDue ? ` due on ${formattedDue}` : ""} on the provider&apos;s website?
            </p>

            {errorMsg && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</p>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleYes}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {saving ? "Recording..." : "Yes, Payment Completed"}
              </button>
              <button
                type="button"
                onClick={() => { setDialog(null); clearPending(); }}
                className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                <XCircle className="h-4 w-4 text-muted-foreground" />
                No, Not Yet
              </button>
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="rounded-md px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              HomeBase doesn&apos;t verify external payments — this records your confirmation only.
            </p>
          </div>
        </div>
      )}

      {dialog === "done" && (
        <div role="alertdialog" aria-modal="true" aria-label="Payment recorded" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-full max-w-sm rounded-xl border bg-popover p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-popover-foreground">Payment Recorded</h3>
                <p className="mt-1 text-sm text-muted-foreground">{resultMsg}</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
              >
                <ExternalLink className="h-4 w-4" /> Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
