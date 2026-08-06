"use client";

import Link from "next/link";
import { FolderOpen, ChevronRight } from "lucide-react";
import { useDashboardProperties } from "@/lib/hooks/useDashboard";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";

export default function DocumentsPage() {
  const { data: properties, isLoading, isError, refetch } = useDashboardProperties();

  if (isLoading) return <LoadingState text="Loading documents..." />;
  if (isError) return <ErrorState title="Failed to load properties" onRetry={() => refetch()} />;

  if (!properties || properties.length === 0) {
    return (
      <EmptyState
        icon={<FolderOpen className="h-16 w-16" />}
        title="No properties yet"
        description="Add a property to start organizing its documents."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Documents</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Browse documents by property — leases, insurance policies, tax records, and more.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map((p: any) => (
          <Link
            key={p.id}
            href={`/properties/${p.id}/documents`}
            className="group bg-card rounded-xl border border-border shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-primary transition-colors">
                <FolderOpen className="h-5 w-5" />
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground line-clamp-1">{p.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {[p.city, p.state].filter(Boolean).join(", ") || "—"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
