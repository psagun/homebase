import { api } from "./client";

/* ─── Types ─── */

export interface EntityData {
  id: string;
  name: string;
  entity_type?: string | null;
  ein?: string | null;
  state_of_formation?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EntityInvestor {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  ownership_percentage: number;
}

export interface PropertyOwnership {
  property_id: string;
  ownership_type: "Individual" | "Business Entity";
  entity?: EntityData | null;
  investors: EntityInvestor[];
}

export interface EntityCreateData {
  name: string;
  entity_type?: string;
  ein?: string;
  state_of_formation?: string;
  status?: string;
}

export interface EntityUpdateData {
  name?: string;
  entity_type?: string;
  ein?: string;
  state_of_formation?: string;
  status?: string;
}

export interface InvestorAddData {
  name: string;
  email?: string;
  phone?: string;
  ownership_percentage: number;
}

export interface InvestorUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  ownership_percentage?: number;
}

/* ─── Entity CRUD ─── */

export function fetchEntities(): Promise<EntityData[]> {
  return api.get<EntityData[]>("/ownership-entities");
}

export function fetchEntity(id: string): Promise<EntityData> {
  return api.get<EntityData>(`/ownership-entities/${id}`);
}

export function createEntity(data: EntityCreateData): Promise<EntityData> {
  return api.post<EntityData>("/ownership-entities", data);
}

export function updateEntity(id: string, data: EntityUpdateData): Promise<EntityData> {
  return api.patch<EntityData>(`/ownership-entities/${id}`, data);
}

/* ─── Entity Investors ─── */

export function fetchEntityInvestors(entityId: string): Promise<EntityInvestor[]> {
  return api.get<EntityInvestor[]>(`/ownership-entities/${entityId}/investors`);
}

export function addEntityInvestor(
  entityId: string,
  data: InvestorAddData
): Promise<EntityInvestor> {
  return api.post<EntityInvestor>(`/ownership-entities/${entityId}/investors`, data);
}

export function updateEntityInvestor(
  entityId: string,
  investorId: string,
  data: InvestorUpdateData
): Promise<EntityInvestor> {
  return api.patch<EntityInvestor>(
    `/ownership-entities/${entityId}/investors/${investorId}`,
    data
  );
}

export function removeEntityInvestor(
  entityId: string,
  investorId: string
): Promise<void> {
  return api.delete<void>(
    `/ownership-entities/${entityId}/investors/${investorId}`
  );
}

/* ─── Property Ownership ─── */

export function fetchPropertyOwnership(propertyId: string): Promise<PropertyOwnership> {
  return api.get<PropertyOwnership>(`/properties/${propertyId}/ownership`);
}

export function setPropertyEntity(
  propertyId: string,
  entityId: string
): Promise<PropertyOwnership> {
  return api.put<PropertyOwnership>(
    `/properties/${propertyId}/ownership/entity`,
    { ownership_entity_id: entityId }
  );
}

export function removePropertyEntity(propertyId: string): Promise<void> {
  return api.delete<void>(`/properties/${propertyId}/ownership/entity`);
}
