"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardSummary,
  fetchDashboardProperties,
  type DashboardSummary,
  type PropertyRow,
} from "@/lib/api/dashboard";

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ["dashboard", "summary"],
    queryFn: fetchDashboardSummary,
  });
}

export function useDashboardProperties() {
  return useQuery<PropertyRow[]>({
    queryKey: ["dashboard", "properties"],
    queryFn: fetchDashboardProperties,
  });
}
