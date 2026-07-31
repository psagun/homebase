"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit3, Trash2 } from "lucide-react";
import { useProperty, useUpdateProperty, useDeleteProperty } from "@/lib/hooks/useProperties";
import { recordPropertyView } from "@/lib/hooks/useRecentlyViewed";
import { PropertyTabs } from "@/components/properties/PropertyTabs";
import { EditPropertySheet } from "@/components/properties/EditPropertySheet";
import { ActionsMenu } from "@/components/shared/ActionsMenu";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useRouter } from "next/navigation";
import type { PropertyUpdateData } from "@/lib/api/properties";

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    Occupied: "bg-emerald-50 text-emerald-700",
    Vacant: "bg-amber-50 text-amber-700",
    "For Sale": "bg-blue-50 text-blue-700",
    "Under Maintenance": "bg-red-50 text-red-700",
  };
  const dotMap: Record<string, string> = {
    Occupied: "bg-emerald-500",
    Vacant: "bg-amber-500",
    "For Sale": "bg-blue-500",
    "Under Maintenance": "bg-red-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${colorMap[status] || "bg-gray-50 text-gray-700"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotMap[status] || "bg-gray-500"}`} />
      {status}
    </span>
  );
}

export default function PropertyLayout({ params, children }: { params: { id: string }; children: React.ReactNode }) {
  const { id } = params;
  const router = useRouter();
  const { data: property, isLoading, isError, refetch } = useProperty(id);
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();
  const [showEditSheet, setShowEditSheet] = useState(false);

  // Record this property view for the recent list — must be before any early returns
  useEffect(() => {
    if (property) {
      recordPropertyView(id, property.name);
    }
  }, [id, property]);

  if (isLoading) return <LoadingState text="Loading property..." />;
  if (isError) return (
    <ErrorState title="Property not found" message="This property may have been removed or you don't have access." onRetry={() => refetch()} />
  );
  if (!property) return null;

  const handleUpdate = async (data: PropertyUpdateData) => {
    await updateProperty.mutateAsync({ id, data });
    setShowEditSheet(false);
    refetch();
  };

  const handleDelete = async () => {
    await deleteProperty.mutateAsync(id);
    router.push("/properties");
  };

  return (
    <div>
      {/* Back link */}
      <Link
        href="/properties"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Properties
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between rounded-lg border bg-card p-5 mb-1">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-xl font-bold text-primary">
            {property.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{property.name}</h1>
              <StatusBadge status={property.status} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {property.address_line_1}
              {property.address_line_2 ? `, ${property.address_line_2}` : ""}
              , {property.city}, {property.state} {property.postal_code}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ActionsMenu
            label="Property"
            actions={[
              { label: "Edit Property", icon: <Edit3 className="h-4 w-4" />, onClick: () => setShowEditSheet(true) },
              { label: "Archive", icon: <Trash2 className="h-4 w-4" />, destructive: true, onClick: handleDelete },
            ]}
          />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b mb-6">
        <PropertyTabs propertyId={id} />
      </div>

      {/* Tab content */}
      <div>{children}</div>

      {/* Edit sheet */}
      <EditPropertySheet
        property={property}
        isOpen={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        onSave={handleUpdate}
        isSaving={updateProperty.isPending}
      />
    </div>
  );
}
