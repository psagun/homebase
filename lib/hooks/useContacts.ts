"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listContacts, createContact, deleteContact, getPropertyContacts, type ContactCreateData } from "@/lib/api/contacts";

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}
