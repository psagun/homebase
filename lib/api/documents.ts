import { api } from "./client";

export interface DocumentData {
  id: string;
  property_id: string;
  user_id: string;
  name: string;
  category: string;
  storage_key: string;
  file_type: string;
  file_size: number;
  expiration_date?: string | null;
  created_at: string;
  updated_at: string;
}

export function listDocuments(propertyId: string, category?: string): Promise<DocumentData[]> {
  const params = category ? `?category=${category}` : "";
  return api.get<DocumentData[]>(`/properties/${propertyId}/documents${params}`);
}

export async function uploadDocument(
  propertyId: string,
  file: File,
  category?: string,
  name?: string
): Promise<DocumentData> {
  const formData = new FormData();
  formData.append("file", file);
  if (category) formData.append("category", category);
  if (name) formData.append("name", name);

  const res = await fetch(`/api/v1/properties/${propertyId}/documents?category=${category || "Other"}${name ? `&name=${encodeURIComponent(name)}` : ""}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export function deleteDocument(docId: string): Promise<void> {
  return api.delete<void>(`/documents/${docId}`);
}
