import { api } from "./client";

export interface InsuranceData {
  id: string;
  property_id: string;
  provider_name: string;
  policy_number?: string | null;
  policy_type?: string | null;
  portal_url?: string | null;
  coverage_amount?: number | null;
  deductible?: number | null;
  annual_premium?: number | null;
  effective_date?: string | null;
  expiration_date?: string | null;
  renewal_date?: string | null;
  agent_name?: string | null;
  agent_phone?: string | null;
  agent_email?: string | null;
  is_active: boolean;
  ended_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsuranceCreateData {
  provider_name: string;
  policy_number?: string;
  policy_type?: string;
  portal_url?: string;
  coverage_amount?: number | null;
  deductible?: number | null;
  annual_premium?: number | null;
  effective_date?: string | null;
  expiration_date?: string | null;
  renewal_date?: string | null;
  agent_name?: string | null;
  agent_phone?: string | null;
  agent_email?: string | null;
}

export function getActivePolicy(propertyId: string): Promise<InsuranceData | null> {
  return api.get<InsuranceData | null>(`/properties/${propertyId}/insurance`);
}

export function createPolicy(propertyId: string, data: InsuranceCreateData): Promise<InsuranceData> {
  return api.post<InsuranceData>(`/properties/${propertyId}/insurance`, data);
}

export function updatePolicy(policyId: string, data: Partial<InsuranceCreateData>): Promise<InsuranceData> {
  return api.patch<InsuranceData>(`/insurance/${policyId}`, data);
}

export function deletePolicy(policyId: string): Promise<void> {
  return api.delete<void>(`/insurance/${policyId}`);
}
