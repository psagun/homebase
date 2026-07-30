"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchInvestors, createInvestor, updateInvestor,
  resetInvestorPassword, deleteInvestor,
  type Investor, type InvestorCreateData, type InvestorUpdateData,
} from "@/lib/api/admin";

export function useInvestors() {
  return useQuery<Investor[]>({ queryKey: ["admin", "investors"], queryFn: fetchInvestors });
}

export function useCreateInvestor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InvestorCreateData) => createInvestor(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "investors"] }),
  });
}

export function useUpdateInvestor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InvestorUpdateData }) => updateInvestor(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "investors"] }),
  });
}

export function useResetInvestorPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resetInvestorPassword(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "investors"] }),
  });
}

export function useDeleteInvestor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInvestor(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "investors"] }),
  });
}
