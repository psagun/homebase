"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTransactions, getCashFlow, createTransaction, deleteTransaction, type TransactionCreateData } from "@/lib/api/transactions";

export function useTransactions(propertyId: string) {
  return useQuery({ queryKey: ["transactions", propertyId], queryFn: () => listTransactions(propertyId), enabled: !!propertyId });
}

export function useCashFlow(propertyId: string, year?: number) {
  return useQuery({ queryKey: ["transactions", propertyId, "cashflow", year], queryFn: () => getCashFlow(propertyId, year), enabled: !!propertyId });
}

export function useCreateTransaction(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TransactionCreateData) => createTransaction(propertyId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transactions", propertyId] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
}

export function useDeleteTransaction(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", propertyId] }),
  });
}

export function useUpdateTransaction(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<import("@/lib/api/transactions").TransactionCreateData> }) =>
      import("@/lib/api/transactions").then((m) => m.updateTransaction(id, data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions", propertyId] });
      qc.invalidateQueries({ queryKey: ["cash-flow", propertyId] });
    },
  });
}
