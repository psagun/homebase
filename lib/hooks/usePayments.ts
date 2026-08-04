"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPaymentHistory, type PaymentType } from "@/lib/api/payments";

export function usePaymentHistory(propertyId?: string, paymentType?: PaymentType) {
  return useQuery({
    queryKey: ["payments", "history", propertyId ?? "all", paymentType ?? "all"],
    queryFn: () => fetchPaymentHistory(propertyId, paymentType),
  });
}
