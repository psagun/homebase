"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { PropertyForm } from "./PropertyForm";
import type { PropertyData, PropertyUpdateData } from "@/lib/api/properties";

interface EditPropertySheetProps {
  property: PropertyData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PropertyUpdateData) => Promise<void>;
  isSaving: boolean;
}

export function EditPropertySheet({
  property,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: EditPropertySheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit property"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background shadow-xl transition-transform"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold">Edit Property</h2>
              <p className="text-sm text-muted-foreground">{property.name}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <PropertyForm
              initialData={property}
              onSubmit={onSave}
              isLoading={isSaving}
              mode="edit"
            />
          </div>
        </div>
      </div>
    </>
  );
}
