"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { confirmPayment } from "@/lib/api/payments";

interface ConfirmPaymentButtonProps {
  paymentType: "mortgage" | "insurance" | "tax";
  sourceId: string;
  /** Callback fired after a successful confirmation (e.g. to refresh data) */
  onConfirmed?: (nextDueDate: string) => void;
}

/**
 * "Confirm Payment" action shown next to external payment portal buttons.
 *
 * HomeBase never processes payments — the user pays on the provider's
 * website, then explicitly confirms completion here. This button opens
 * the standard confirmation dialog; only an explicit "Yes" advances the
 * due date (via the /payments/confirm endpoint).
 */
export function ConfirmPaymentButton({ paymentType, sourceId, onConfirmed }: ConfirmPaymentButtonProps) {
  const [dialog, setDialog] = useState<"confirm" | "done" | null>(null);
  const [saving, setSaving] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const handleYes = async () => {
    setSaving(true);
    try {
      const result = await confirmPayment(paymentType, sourceId);
      setResultMsg(result.message);
      setDialog("done");
      onConfirmed?.(result.next_due_date);
    } catch {
      setResultMsg("Failed to record the payment. Please try again.");
      setDialog("done");
    }
    setSaving(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setDialog("confirm")}
        className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
      >
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        Confirm Payment
      </button>

      {dialog === "confirm" && (
        <div role="alertdialog" aria-modal="true" aria-label="Confirm Payment" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDialog(null)} />
          <div className="relative w-full max-w-sm rounded-xl border bg-popover p-6 shadow-xl">
            <h3 className="text-base font-semibold text-popover-foreground">Confirm Payment</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Did you successfully complete your payment on the provider&apos;s website?
            </p>
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
                onClick={() => setDialog(null)}
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
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setDialog(null); }}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Close
              </a>
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
