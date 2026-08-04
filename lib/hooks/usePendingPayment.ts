"use client";

import { useEffect, useState } from "react";

const KEY = (type: string, id: string) => `pending_payment_${type}_${id}`;

/**
 * Tracks "user clicked Pay and went to the provider's site" in sessionStorage.
 *
 * When the user clicks a Pay button we remember which payment cycle they were
 * about to pay. When they return to the page, the confirm dialog can open
 * automatically — and it knows exactly which due date to confirm.
 */
export function usePendingPayment(paymentType: string, sourceId: string) {
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    try {
      setPending(sessionStorage.getItem(KEY(paymentType, sourceId)));
    } catch {
      setPending(null);
    }
  }, [paymentType, sourceId]);

  const markPending = (dueDate?: string) => {
    try {
      sessionStorage.setItem(KEY(paymentType, sourceId), dueDate || "1");
    } catch {}
    setPending(dueDate || "1");
  };

  const clearPending = () => {
    try {
      sessionStorage.removeItem(KEY(paymentType, sourceId));
    } catch {}
    setPending(null);
  };

  return { pending, markPending, clearPending };
}
