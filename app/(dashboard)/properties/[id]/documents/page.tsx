"use client";

import { DocumentList } from "@/components/documents/DocumentList";
import { useProperty } from "@/lib/hooks/useProperties";

export default function DocumentsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: property } = useProperty(id);
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Documents{property ? <span className="text-muted-foreground font-normal"> — {property.name}</span> : ""}</h2>
      <DocumentList propertyId={id} />
    </div>
  );
}
