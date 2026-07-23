import { api } from "./client";

export interface PropertyData {
  id: string;
  user_id: string;
  name: string;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  property_type: string;
  status: string;
  purchase_date?: string | null;
  purchase_price?: number | null;
  current_value?: number | null;
  lot_size?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  year_built?: number | null;
  notes?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyCreateData {
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  property_type?: string;
  status?: string;
  purchase_date?: string | null;
  purchase_price?: number | null;
  current_value?: number | null;
  lot_size?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  year_built?: number | null;
  notes?: string | null;
}

export interface PropertyUpdateData {
  name?: string;
  address_line_1?: string;
  address_line_2?: string | null;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  property_type?: string;
  status?: string;
  purchase_date?: string | null;
  purchase_price?: number | null;
  current_value?: number | null;
  lot_size?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  year_built?: number | null;
  notes?: string | null;
}

export interface PropertyListParams {
  search?: string;
  status?: string;
  property_type?: string;
}

export function listProperties(params?: PropertyListParams): Promise<PropertyData[]> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.property_type) searchParams.set("property_type", params.property_type);
  const qs = searchParams.toString();
  return api.get<PropertyData[]>(`/properties/${qs ? `?${qs}` : ""}`);
}

export function getProperty(id: string): Promise<PropertyData> {
  return api.get<PropertyData>(`/properties/${id}`);
}

export function createProperty(data: PropertyCreateData): Promise<PropertyData> {
  return api.post<PropertyData>("/properties/", data);
}

export function updateProperty(id: string, data: PropertyUpdateData): Promise<PropertyData> {
  return api.patch<PropertyData>(`/properties/${id}`, data);
}

export function deleteProperty(id: string): Promise<void> {
  return api.delete<void>(`/properties/${id}`);
}
