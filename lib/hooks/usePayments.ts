"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPaymentHistory, deletePaymentHistory, type PaymentType } from "@/lib/api/payments";

export function usePaymentHistory(propertyId?: string, paymentType?: PaymentType) {
  return useQuery({
    queryKey: ["payments", "history", propertyId ?? "all", paymentType ?? "all"],
    queryFn: () => fetchPaymentHistory(propertyId, paymentType),
  });
}

export function useDeletePaymentHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePaymentHistory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", "history"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
