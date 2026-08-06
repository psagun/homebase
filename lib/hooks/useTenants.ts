"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listTenants, type TenantInput } from "@/lib/api/tenants";

export function useTenants(propertyId: string) {
  return useQuery({
    queryKey: ["tenants", propertyId],
    queryFn: () => listTenants(propertyId),
    enabled: !!propertyId,
  });
}

export function useInvalidateTenants(propertyId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["tenants", propertyId] });
  };
}

export type { TenantInput };
