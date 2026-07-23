"use client";

import { useEffect, useState } from "react";
import type { PropertyData } from "@/lib/api/properties";

const STORAGE_KEY = "homebase_recently_viewed";

function getLocalIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

export async function recordPropertyView(propertyId: string, propertyName: string) {
  // Local fallback
  if (typeof window !== "undefined") {
    try {
      const ids = getLocalIds().filter((id) => id !== propertyId);
      ids.unshift(propertyId);
      setLocalIds(ids.slice(0, 6));
    } catch {}
  }

  // Server-side persist
  try {
    await fetch(`/api/v1/recently-viewed/${propertyId}`, {
      method: "POST",
      credentials: "include",
    });
  } catch {}
}

export function useRecentlyViewed() {
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try server first
    fetch("/api/v1/recently-viewed/", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((serverData) => {
        if (serverData && serverData.length > 0) {
          setProperties(serverData);
          setIsLoading(false);
          return;
        }
        // Fallback to localStorage
        const ids = getLocalIds();
        if (ids.length === 0) {
          setIsLoading(false);
          return;
        }
        Promise.allSettled(
          ids.map((id) =>
            fetch(`/api/v1/properties/${id}`, { credentials: "include" }).then((r) =>
              r.ok ? r.json() : null
            )
          )
        ).then((results) => {
          const props = results
            .filter((r): r is PromiseFulfilledResult<PropertyData> => r.status === "fulfilled" && r.value !== null)
            .map((r) => r.value);
          setProperties(props);
          setIsLoading(false);
        });
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  return { properties, isLoading };
}
