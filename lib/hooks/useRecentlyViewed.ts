"use client";

import { useQuery } from "@tanstack/react-query";
import type { PropertyData } from "@/lib/api/properties";

export async function recordPropertyView(propertyId: string, _propertyName?: string) {
  // Fire-and-forget server-side persist; failures are non-fatal
  try {
    await fetch(`/api/v1/recently-viewed/${propertyId}`, {
      method: "POST",
      credentials: "include",
    });
  } catch {}
}

export function useRecentlyViewed() {
  const { data, isLoading } = useQuery({
    queryKey: ["recently-viewed"],
    queryFn: async () => {
      const r = await fetch("/api/v1/recently-viewed/", { credentials: "include" });
      if (!r.ok) return [] as PropertyData[];
      return (await r.json()) as PropertyData[];
    },
    staleTime: 60_000,
  });
  return { properties: data ?? [], isLoading };
}
