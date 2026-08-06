import { api } from "./client";

export interface TenantData {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  move_in_date?: string | null;
  lease_start?: string | null;
  lease_end?: string | null;
  monthly_rent?: number | null;
  security_deposit?: number | null;
}

export interface TenantInput {
  name?: string;
  email?: string;
  phone?: string;
  move_in_date?: string;
  lease_start?: string;
  lease_end?: string;
  monthly_rent?: number | string;
  security_deposit?: number | string;
}

export function listTenants(propertyId: string): Promise<TenantData[]> {
  return api.get(`/properties/${propertyId}/tenants`);
}

export function createTenant(propertyId: string, data: TenantInput): Promise<TenantData> {
  return api.post(`/properties/${propertyId}/tenants`, data);
}

export function updateTenant(propertyId: string, tenantId: string, data: TenantInput): Promise<TenantData> {
  return api.patch(`/properties/${propertyId}/tenants/${tenantId}`, data);
}

export function deleteTenant(propertyId: string, tenantId: string): Promise<void> {
  return api.delete(`/properties/${propertyId}/tenants/${tenantId}`);
}
