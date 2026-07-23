"use client";

import { useRouter } from "next/navigation";
import { PropertyForm } from "@/components/properties/PropertyForm";
import { useCreateProperty } from "@/lib/hooks/useProperties";
import type { PropertyCreateData } from "@/lib/api/properties";

export default function NewPropertyPage() {
  const router = useRouter();
  const createProperty = useCreateProperty();

  const handleSubmit = async (data: PropertyCreateData) => {
    await createProperty.mutateAsync(data);
    router.push("/properties");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Add Property</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter the details of your new property.
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6">
        <PropertyForm
          onSubmit={handleSubmit}
          isLoading={createProperty.isPending}
          mode="create"
        />
      </div>
    </div>
  );
}
