"use client";

import { useEffect, useRef, useState } from "react";
import {
  Upload, Trash2, FileText, Download, Pencil, Eye, RefreshCw, X, Check,
} from "lucide-react";
import { listDocuments, uploadDocument, deleteDocument, renameDocument, replaceDocument, previewDocument } from "@/lib/api/documents";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ActionsMenu } from "@/components/shared/ActionsMenu";
import { formatShortDate } from "@/lib/utils";

interface DocumentData {
  id: string;
  name: string;
  category: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface DocumentManagerProps {
  propertyId: string;
  /** Configurable category list (empty = show all). Uploads use the selected category. */
  categories?: string[];
  /** Optional label for the upload button (e.g. "Upload") */
  uploadLabel?: string;
}

const DEFAULT_CATEGORIES = ["Property", "Mortgage", "Insurance", "Tax", "Lease", "Maintenance", "HOA", "Other"];

const categoryIcons: Record<string, string> = {
  Property: "🏠", Mortgage: "🏦", Insurance: "🛡️", Tax: "📋",
  Lease: "📝", Maintenance: "🔧", HOA: "🤝", Other: "📄",
  "Certificate of Formation": "📜", "Operating Agreement": "🤝", "EIN Letter": "📄", "Tax Document": "📋",
};

export function DocumentManager({ propertyId, categories, uploadLabel = "Upload Document" }: DocumentManagerProps) {
  const cats = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  const [category, setCategory] = useState("");
  const [docs, setDocs] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [preview, setPreview] = useState<{ url: string; name: string; file_type: string; id: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const data = await listDocuments(propertyId, category || undefined);
      setDocs(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [propertyId, category]);

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 2500);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadPct(0);
    // Simulate progress (fetch doesn't expose upload progress without XHR)
    const timer = setInterval(() => setUploadPct((p) => Math.min(p + 12, 90)), 200);
    try {
      await uploadDocument(propertyId, file, category || "Other");
      flash("Document uploaded");
      await load();
    } catch {
      flash("Upload failed", false);
    }
    clearInterval(timer);
    setUploadPct(100);
    setTimeout(() => { setUploading(false); setUploadPct(0); }, 400);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRename = (doc: DocumentData) => {
    setRenamingId(doc.id);
    setRenameValue(doc.name);
  };

  const submitRename = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      await renameDocument(id, renameValue.trim());
      flash("Document renamed");
      setRenamingId(null);
      await load();
    } catch {
      flash("Rename failed", false);
    }
  };

  const handleReplace = async (doc: DocumentData) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.docx,.xlsx,.jpg,.jpeg,.png";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        await replaceDocument(doc.id, file);
        flash("Document replaced");
        await load();
      } catch {
        flash("Replace failed", false);
      }
    };
    input.click();
  };

  const handlePreview = async (doc: DocumentData) => {
    try {
      const result = await previewDocument(doc.id);
      setPreview({ ...result, id: doc.id });
    } catch {
      flash("Preview unavailable", false);
    }
  };

  if (loading) return <LoadingState text="Loading documents..." />;
  if (error) return <ErrorState title="Failed to load documents" onRetry={() => { setError(false); setLoading(true); load(); }} />;

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none">
          <option value="">All Categories</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden"
          accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" />
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
          <Upload className="h-4 w-4" />
          {uploading ? `Uploading... ${uploadPct}%` : uploadLabel}
        </button>
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${uploadPct}%` }} />
        </div>
      )}

      {/* Documents list */}
      {docs.length === 0 ? (
        <EmptyState icon={<FileText className="h-16 w-16" />} title="No documents"
          description="Upload documents to keep them organized with this property." />
      ) : (
        <div className="rounded-lg border bg-card">
          {docs.map((doc) => (
            <div key={doc.id} className="group flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-muted/30">
              {/* Rename inline */}
              {renamingId === doc.id ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                    autoFocus className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none flex-1" />
                  <button onClick={() => submitRename(doc.id)} title="Save name"
                    className="rounded-md bg-primary p-1.5 text-white">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setRenamingId(null)} title="Cancel"
                    className="rounded-md border p-1.5 text-muted-foreground hover:bg-muted">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-lg shrink-0">{categoryIcons[doc.category] || "📄"}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.category} • {doc.file_type.replace(".", "").toUpperCase()}
                      {doc.file_size > 0 ? ` • ${(doc.file_size / 1024).toFixed(0)} KB` : ""}
                      {" • "}{formatShortDate(doc.created_at)}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              {renamingId !== doc.id && (
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handlePreview(doc)} title="Preview"
                    className="rounded-md border p-2 text-muted-foreground hover:bg-muted">
                    <Eye className="h-4 w-4" />
                  </button>
                  <a href={`/api/v1/documents/${doc.id}/download`} download title="Download"
                    className="rounded-md border p-2 text-muted-foreground hover:bg-muted">
                    <Download className="h-4 w-4" />
                  </a>
                  <ActionsMenu
                    label={`${doc.name}`}
                    actions={[
                      { label: "Rename", icon: <Pencil className="h-4 w-4" />, onClick: () => startRename(doc) },
                      { label: "Replace File", icon: <RefreshCw className="h-4 w-4" />, onClick: () => handleReplace(doc) },
                      { label: "Delete", icon: <Trash2 className="h-4 w-4" />, destructive: true, onClick: async () => {
                        try {
                          await deleteDocument(doc.id);
                          flash("Document deleted");
                          await load();
                        } catch {
                          flash("Delete failed", false);
                        }
                      } },
                    ]}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div role="dialog" aria-modal="true" aria-label={`Preview: ${preview.name}`}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPreview(null)} />
          <div className="relative w-full max-w-3xl rounded-xl border bg-popover shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-semibold truncate">{preview.name}</p>
              <button onClick={() => setPreview(null)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-[70vh] w-full bg-muted/30">
              {preview.file_type === ".pdf" ? (
                <iframe src={preview.url} sandbox="allow-scripts allow-same-origin" className="h-full w-full" title={preview.name} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <FileText className="h-16 w-16 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Preview not available for this file type</p>
                  <a href={`/api/v1/documents/${preview.id}/download`}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
                    <Download className="h-4 w-4" /> Download
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
