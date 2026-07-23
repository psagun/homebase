"use client";

import { useRef, useState } from "react";
import { Upload, Trash2, FileText, Download } from "lucide-react";
import { useDocuments, useUploadDocument, useDeleteDocument } from "@/lib/hooks/useDocuments";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { DOCUMENT_CATEGORIES } from "@/lib/constants";

const categoryIcons: Record<string, string> = {
  Property: "🏠", Mortgage: "🏦", Insurance: "🛡️", Tax: "📋",
  Lease: "📝", Maintenance: "🔧", HOA: "🤝", Other: "📄",
};

export function DocumentList({ propertyId }: { propertyId: string }) {
  const [category, setCategory] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: docs, isLoading, isError, refetch } = useDocuments(propertyId, category || undefined);
  const uploadDoc = useUploadDocument(propertyId);
  const deleteDoc = useDeleteDocument(propertyId);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadDoc.mutateAsync({ file, category: category || "Other" });
    } catch {}
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this document?")) await deleteDoc.mutateAsync(id);
  };

  if (isLoading) return <LoadingState text="Loading documents..." />;
  if (isError) return <ErrorState title="Failed to load documents" onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none">
          <option value="">All Categories</option>
          {DOCUMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" />
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
          <Upload className="h-4 w-4" />{uploading ? "Uploading..." : "Upload Document"}
        </button>
      </div>

      {!docs || docs.length === 0 ? (
        <EmptyState icon={<FileText className="h-16 w-16" />} title="No documents"
          description="Upload documents like leases, insurance policies, or tax records." />
      ) : (
        <div className="rounded-lg border bg-card">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="text-lg">{categoryIcons[doc.category] || "📄"}</span>
                <div>
                  <p className="text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">{doc.category} • {doc.file_type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/api/v1/documents/${doc.id}/download`} download
                  className="rounded-md border p-2 text-muted-foreground hover:bg-muted">
                  <Download className="h-4 w-4" />
                </a>
                <button onClick={() => handleDelete(doc.id)}
                  className="rounded-md border p-2 text-red-500 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
