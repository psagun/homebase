import { api } from "./client";

export interface ContactData {
  id: string;
  user_id: string;
  name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  notes?: string | null;
  contact_type: string;
  created_at: string;
  updated_at: string;
  property_ids?: string[] | null;
}

export interface ContactCreateData {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
  contact_type?: string;
  property_ids?: string[];
}

export function listContacts(type?: string): Promise<ContactData[]> {
  return api.get(`/contacts/${type ? `?contact_type=${type}` : ""}`);
}

export function getContact(id: string): Promise<ContactData> {
  return api.get(`/contacts/${id}`);
}

export function createContact(data: ContactCreateData): Promise<ContactData> {
  return api.post("/contacts/", data);
}

export function updateContact(id: string, data: Partial<ContactCreateData>): Promise<ContactData> {
  return api.patch(`/contacts/${id}`, data);
}

export function deleteContact(id: string): Promise<void> {
  return api.delete(`/contacts/${id}`);
}

export function getPropertyContacts(propertyId: string): Promise<ContactData[]> {
  return api.get(`/contacts/property/${propertyId}`);
}

export function linkContactToProperty(contactId: string, propertyId: string): Promise<ContactData> {
  return api.post(`/contacts/${contactId}/link/${propertyId}`);
}

export function unlinkContactFromProperty(contactId: string, propertyId: string): Promise<void> {
  return api.delete(`/contacts/${contactId}/unlink/${propertyId}`);
}
