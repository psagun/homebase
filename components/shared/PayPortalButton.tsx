"use client";

import { ExternalLink } from "lucide-react";
import { usePendingPayment } from "@/lib/hooks/usePendingPayment";

interface PayPortalButtonProps {
  paymentType: "mortgage" | "insurance" | "tax" | "hoa";
  sourceId: string;
  url: string;
  /** The record's current due date — stored so the confirm dialog knows which cycle to confirm */
  dueDate?: string | null;
  label?: string;
}

/**
 * "Pay" button that opens the provider's payment website in a new tab AND
 * stores a pending flag. When the user returns to HomeBase, the
 * ConfirmPaymentButton for the same record auto-opens its dialog.
 */
export function PayPortalButton({ paymentType, sourceId, url, dueDate, label }: PayPortalButtonProps) {
  const { markPending } = usePendingPayment(paymentType, sourceId);

  // Only allow http(s) URLs — protects all consumers from open redirects
  const safeUrl = /^https?:\/\//i.test(url) ? url : undefined;
  if (!safeUrl) return null;

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => markPending(dueDate || undefined)}
      className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all"
    >
      <ExternalLink className="h-4 w-4" />
      {label || "Pay Now"}
    </a>
  );
}
