"use client";

import { useQuery } from "@tanstack/react-query";
import { listHoaFees, type HoaFeeInput } from "@/lib/api/hoa";

export function useHoaFees(propertyId: string) {
  return useQuery({
    queryKey: ["hoa", propertyId],
    queryFn: () => listHoaFees(propertyId),
    enabled: !!propertyId,
  });
}

export type { HoaFeeInput };
