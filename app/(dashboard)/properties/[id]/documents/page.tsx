"use client";

import { DocumentManager } from "@/components/documents/DocumentManager";
import { useProperty } from "@/lib/hooks/useProperties";
import { DOCUMENT_CATEGORIES } from "@/lib/constants";

export default function DocumentsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: property } = useProperty(id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          Documents{property ? <span className="text-muted-foreground font-normal"> — {property.name}</span> : ""}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Leases, policies, tax records, and more.
        </p>
      </div>
      <DocumentManager propertyId={id} categories={[...DOCUMENT_CATEGORIES]} />
    </div>
  );
}
