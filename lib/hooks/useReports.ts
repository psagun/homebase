"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchPnl,
  fetchCashFlow,
  fetchYtd,
  fetchAnnual,
  type ReportsFilter,
  type PnlReport,
  type CashFlowReport,
  type YtdReport,
  type AnnualReport,
} from "@/lib/api/reports";

export function usePnl(filter: ReportsFilter = {}) {
  return useQuery<PnlReport>({
    queryKey: ["reports", "pnl", filter],
    queryFn: () => fetchPnl(filter),
  });
}

export function useCashFlow(filter: ReportsFilter = {}) {
  return useQuery<CashFlowReport>({
    queryKey: ["reports", "cash-flow", filter],
    queryFn: () => fetchCashFlow(filter),
  });
}

export function useYtd(property_id?: string) {
  return useQuery<YtdReport>({
    queryKey: ["reports", "ytd", { property_id }],
    queryFn: () => fetchYtd(property_id),
  });
}

export function useAnnual(year?: number, property_id?: string) {
  return useQuery<AnnualReport>({
    queryKey: ["reports", "annual", { year, property_id }],
    queryFn: () => fetchAnnual(year, property_id),
  });
}
