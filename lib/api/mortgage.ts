import { api } from "./client";

export interface MortgageData {
  id: string;
  property_id: string;
  lender_name: string;
  loan_number?: string | null;
  loan_type?: string | null;
  interest_rate?: number | null;
  original_amount?: number | null;
  current_balance?: number | null;
  monthly_payment?: number | null;
  loan_term_months?: number | null;
  start_date?: string | null;
  maturity_date?: string | null;
  next_due_date?: string | null;
  portal_url?: string | null;
  autopay_enabled: boolean;
  is_active: boolean;
  ended_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MortgageCreateData {
  lender_name: string;
  loan_number?: string;
  loan_type?: string;
  portal_url?: string;
  interest_rate?: number | null;
  original_amount?: number | null;
  current_balance?: number | null;
  monthly_payment?: number | null;
  loan_term_months?: number | null;
  start_date?: string | null;
  maturity_date?: string | null;
  next_due_date?: string | null;
  autopay_enabled?: boolean;
}

export interface MortgageUpdateData {
  lender_name?: string;
  loan_number?: string;
  loan_type?: string;
  interest_rate?: number | null;
  original_amount?: number | null;
  current_balance?: number | null;
  monthly_payment?: number | null;
  loan_term_months?: number | null;
  start_date?: string | null;
  maturity_date?: string | null;
  next_due_date?: string | null;
  autopay_enabled?: boolean;
}

export function getActiveMortgage(propertyId: string): Promise<MortgageData | null> {
  return api.get<MortgageData | null>(`/properties/${propertyId}/mortgage`);
}

export function getMortgageHistory(propertyId: string): Promise<MortgageData[]> {
  return api.get<MortgageData[]>(`/properties/${propertyId}/mortgage/history`);
}

export function createMortgage(propertyId: string, data: MortgageCreateData): Promise<MortgageData> {
  return api.post<MortgageData>(`/properties/${propertyId}/mortgage`, data);
}

export function updateMortgage(mortgageId: string, data: MortgageUpdateData): Promise<MortgageData> {
  return api.patch<MortgageData>(`/mortgages/${mortgageId}`, data);
}

export function deleteMortgage(mortgageId: string): Promise<void> {
  return api.delete<void>(`/mortgages/${mortgageId}`);
}
