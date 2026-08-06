"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listMaintenance, type MaintenanceInput } from "@/lib/api/maintenance";

export function useMaintenance(propertyId: string) {
  return useQuery({
    queryKey: ["maintenance", propertyId],
    queryFn: () => listMaintenance(propertyId),
    enabled: !!propertyId,
  });
}

export function useInvalidateMaintenance(propertyId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["maintenance", propertyId] });
  };
}

export type { MaintenanceInput };
