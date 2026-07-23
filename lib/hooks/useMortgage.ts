"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getActiveMortgage,
  getMortgageHistory,
  createMortgage,
  updateMortgage,
  deleteMortgage,
  type MortgageCreateData,
  type MortgageUpdateData,
} from "@/lib/api/mortgage";

export function useMortgage(propertyId: string) {
  return useQuery({
    queryKey: ["mortgage", propertyId],
    queryFn: () => getActiveMortgage(propertyId),
    enabled: !!propertyId,
  });
}

export function useMortgageHistory(propertyId: string) {
  return useQuery({
    queryKey: ["mortgage", propertyId, "history"],
    queryFn: () => getMortgageHistory(propertyId),
    enabled: !!propertyId,
  });
}

export function useCreateMortgage(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MortgageCreateData) => createMortgage(propertyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mortgage", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["mortgage", propertyId, "history"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateMortgage(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MortgageUpdateData }) =>
      updateMortgage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mortgage", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["mortgage", propertyId, "history"] });
    },
  });
}

export function useDeleteMortgage(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMortgage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mortgage", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["mortgage", propertyId, "history"] });
    },
  });
}
