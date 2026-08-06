import { api } from "./client";

export interface TaxData {
  id: string;
  county?: string | null;
  tax_authority?: string | null;
  parcel_id?: string | null;
  portal_url?: string | null;
  annual_tax?: number | null;
  payment_frequency?: string | null;
  next_due_date?: string | null;
}

export interface TaxInput {
  county?: string;
  tax_authority?: string;
  parcel_id?: string;
  portal_url?: string;
  annual_tax?: number | string;
  payment_frequency?: string;
  next_due_date?: string;
}

export function listTaxes(propertyId: string): Promise<TaxData[]> {
  return api.get(`/properties/${propertyId}/taxes`);
}

export function createTax(propertyId: string, data: TaxInput): Promise<TaxData> {
  return api.post(`/properties/${propertyId}/taxes`, data);
}

export function updateTax(propertyId: string, taxId: string, data: TaxInput): Promise<TaxData> {
  return api.patch(`/properties/${propertyId}/taxes/${taxId}`, data);
}

export function deleteTax(propertyId: string, taxId: string): Promise<void> {
  return api.delete(`/properties/${propertyId}/taxes/${taxId}`);
}
