"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActivePolicy, createPolicy, updatePolicy, deletePolicy, type InsuranceCreateData } from "@/lib/api/insurance";

export function useInsurance(propertyId: string) {
  return useQuery({ queryKey: ["insurance", propertyId], queryFn: () => getActivePolicy(propertyId), enabled: !!propertyId });
}

export function useCreateInsurance(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InsuranceCreateData) => createPolicy(propertyId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["insurance", propertyId] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
}

export function useUpdateInsurance(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsuranceCreateData> }) => updatePolicy(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insurance", propertyId] }),
  });
}

export function useDeleteInsurance(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (policyId: string) => deletePolicy(policyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insurance", propertyId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
