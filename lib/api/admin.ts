import { api } from "./client";

export interface Investor {
  id: string;
  name: string;
  email: string;
  role: string;
  property_ids: string[];
  temp_password?: string | null;
}

export interface InvestorCreateData {
  name: string;
  email: string;
  property_ids: string[];
}

export interface InvestorUpdateData {
  name?: string;
  property_ids?: string[];
}

export function fetchInvestors(): Promise<Investor[]> {
  return api.get<Investor[]>("/admin/investors");
}

export function createInvestor(data: InvestorCreateData): Promise<Investor> {
  return api.post<Investor>("/admin/investors", data);
}

export function updateInvestor(id: string, data: InvestorUpdateData): Promise<Investor> {
  return api.patch<Investor>(`/admin/investors/${id}`, data);
}

export function resetInvestorPassword(id: string): Promise<{ temp_password: string }> {
  return api.post<{ temp_password: string }>(`/admin/investors/${id}/reset-password`);
}

export function deleteInvestor(id: string): Promise<void> {
  return api.delete<void>(`/admin/investors/${id}`);
}

export interface PropertySuggestion {
  id: string;
  name: string;
  entity_id: string;
  entity_name: string;
}

export interface SuggestResult {
  entities: { id: string; name: string }[];
  property_ids: string[];
  properties: PropertySuggestion[];
}

export function suggestPropertiesForEmail(email: string): Promise<SuggestResult> {
  return api.get<SuggestResult>(
    `/admin/investors/suggest-properties?email=${encodeURIComponent(email)}`
  );
}
