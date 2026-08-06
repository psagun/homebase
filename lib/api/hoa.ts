import { api } from "./client";

export interface HoaFeeData {
  id: string;
  association_name: string;
  fee_amount?: number | null;
  payment_frequency?: string | null;
  next_due_date?: string | null;
  portal_url?: string | null;
  notes?: string | null;
}

export interface HoaFeeInput {
  association_name?: string;
  fee_amount?: number | string;
  payment_frequency?: string;
  next_due_date?: string;
  portal_url?: string;
  notes?: string;
}

export function listHoaFees(propertyId: string): Promise<HoaFeeData[]> {
  return api.get(`/properties/${propertyId}/hoa`);
}

export function createHoaFee(propertyId: string, data: HoaFeeInput): Promise<HoaFeeData> {
  return api.post(`/properties/${propertyId}/hoa`, data);
}

export function updateHoaFee(propertyId: string, feeId: string, data: HoaFeeInput): Promise<HoaFeeData> {
  return api.patch(`/properties/${propertyId}/hoa/${feeId}`, data);
}

export function deleteHoaFee(propertyId: string, feeId: string): Promise<void> {
  return api.delete(`/properties/${propertyId}/hoa/${feeId}`);
}
