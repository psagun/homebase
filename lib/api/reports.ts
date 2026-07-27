import { api } from "./client";

/* ─── Types ─── */

export interface PnlCategory {
  category: string;
  amount: number;
}

export interface PnlReport {
  from_date: string;
  to_date: string;
  total_income: number;
  total_expenses: number;
  gross_profit: number;
  profit_margin_percentage: number;
  income_by_category: PnlCategory[];
  expense_by_category: PnlCategory[];
  transaction_count: number;
  maintenance_included: boolean;
  total_maintenance_cost: number;
}

export interface CashFlowMonth {
  month: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
}

export interface CashFlowReport {
  from_date: string;
  to_date: string;
  monthly: CashFlowMonth[];
  totals: {
    income: number;
    expenses: number;
    net: number;
  };
  months: number;
}

export interface YtdComparison {
  income: number;
  expenses: number;
  net: number;
}

export interface YtdChange {
  amount: number;
  percentage: number;
}

export interface YtdReport {
  year: number;
  prior_year: number;
  current: YtdComparison;
  prior: YtdComparison;
  change: {
    income: YtdChange;
    expenses: YtdChange;
    net: YtdChange;
  };
}

export interface AnnualMonthCategory {
  category: string;
  amount: number;
}

export interface AnnualMonth {
  month: number;
  label: string;
  income: number;
  expenses: number;
  net: number;
  transaction_count: number;
  income_by_category: AnnualMonthCategory[];
  expense_by_category: AnnualMonthCategory[];
}

export interface AnnualReport {
  year: number;
  total_income: number;
  total_expenses: number;
  net_income: number;
  monthly: AnnualMonth[];
}

/* ─── Fetch functions ─── */

export interface ReportsFilter {
  from_date?: string;
  to_date?: string;
  property_id?: string;
  year?: number;
}

export function fetchPnl(filter: ReportsFilter = {}): Promise<PnlReport> {
  const params = new URLSearchParams();
  if (filter.from_date) params.set("from_date", filter.from_date);
  if (filter.to_date) params.set("to_date", filter.to_date);
  if (filter.property_id) params.set("property_id", filter.property_id);
  const qs = params.toString();
  return api.get<PnlReport>(`/reports/pnl${qs ? `?${qs}` : ""}`);
}

export function fetchCashFlow(filter: ReportsFilter = {}): Promise<CashFlowReport> {
  const params = new URLSearchParams();
  if (filter.from_date) params.set("from_date", filter.from_date);
  if (filter.to_date) params.set("to_date", filter.to_date);
  if (filter.property_id) params.set("property_id", filter.property_id);
  const qs = params.toString();
  return api.get<CashFlowReport>(`/reports/cash-flow${qs ? `?${qs}` : ""}`);
}

export function fetchYtd(property_id?: string): Promise<YtdReport> {
  const params = property_id ? `?property_id=${property_id}` : "";
  return api.get<YtdReport>(`/reports/ytd${params}`);
}

export function fetchAnnual(year?: number, property_id?: string): Promise<AnnualReport> {
  const params = new URLSearchParams();
  if (year) params.set("year", String(year));
  if (property_id) params.set("property_id", property_id);
  const qs = params.toString();
  return api.get<AnnualReport>(`/reports/annual${qs ? `?${qs}` : ""}`);
}
