import { api } from "./client";

export interface MaintenanceData {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string | null;
  date?: string | null;
  scheduled_date?: string | null;
  completed_date?: string | null;
  cost?: number | null;
  contractor?: string | null;
  notes?: string | null;
  warranty_expiration?: string | null;
}

export interface MaintenanceInput {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  date?: string;
  scheduled_date?: string;
  completed_date?: string;
  cost?: number | string;
  contractor?: string;
  notes?: string;
  warranty_expiration?: string;
}

export function listMaintenance(propertyId: string): Promise<MaintenanceData[]> {
  return api.get(`/properties/${propertyId}/maintenance`);
}

export function createMaintenance(propertyId: string, data: MaintenanceInput): Promise<MaintenanceData> {
  return api.post(`/properties/${propertyId}/maintenance`, data);
}

export function updateMaintenance(propertyId: string, recordId: string, data: MaintenanceInput): Promise<MaintenanceData> {
  return api.patch(`/properties/${propertyId}/maintenance/${recordId}`, data);
}

export function deleteMaintenance(propertyId: string, recordId: string): Promise<void> {
  return api.delete(`/properties/${propertyId}/maintenance/${recordId}`);
}
