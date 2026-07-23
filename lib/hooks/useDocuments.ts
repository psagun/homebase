"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listDocuments, uploadDocument, deleteDocument } from "@/lib/api/documents";

export function useDocuments(propertyId: string, category?: string) {
  return useQuery({
    queryKey: ["documents", propertyId, category],
    queryFn: () => listDocuments(propertyId, category),
    enabled: !!propertyId,
  });
}

export function useUploadDocument(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, category, name }: { file: File; category?: string; name?: string }) =>
      uploadDocument(propertyId, file, category, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents", propertyId] }),
  });
}

export function useDeleteDocument(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => deleteDocument(docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents", propertyId] }),
  });
}
