"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listContacts, createContact, deleteContact, updateContact, getPropertyContacts, linkContactToProperty, unlinkContactFromProperty, type ContactCreateData } from "@/lib/api/contacts";

export function useContacts(type?: string) {
  return useQuery({ queryKey: ["contacts", type], queryFn: () => listContacts(type) });
}

export function usePropertyContacts(propertyId: string) {
  return useQuery({ queryKey: ["contacts", "property", propertyId], queryFn: () => getPropertyContacts(propertyId), enabled: !!propertyId });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ContactCreateData) => createContact(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contacts", "property"] });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contacts", "property"] });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContactCreateData> }) => updateContact(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contacts", "property"] });
    },
  });
}

export function useLinkContactToProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, propertyId }: { contactId: string; propertyId: string }) =>
      linkContactToProperty(contactId, propertyId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["contacts", "property", vars.propertyId] });
    },
  });
}

export function useUnlinkContactFromProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, propertyId }: { contactId: string; propertyId: string }) =>
      unlinkContactFromProperty(contactId, propertyId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["contacts", "property", vars.propertyId] });
    },
  });
}
