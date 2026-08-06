"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listTaxes, type TaxInput } from "@/lib/api/taxes";

export function useTaxes(propertyId: string) {
  return useQuery({
    queryKey: ["taxes", propertyId],
    queryFn: () => listTaxes(propertyId),
    enabled: !!propertyId,
  });
}

/** Invalidate the property's tax cache (after create/update/delete). */
export function useInvalidateTaxes(propertyId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["taxes", propertyId] });
  };
}

export type { TaxInput };
