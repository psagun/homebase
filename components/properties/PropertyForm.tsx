"use client";

import { useState, type FormEvent } from "react";
import { PROPERTY_STATUSES, PROPERTY_TYPES } from "@/lib/constants";
import type { PropertyCreateData, PropertyData } from "@/lib/api/properties";

interface PropertyFormProps {
  initialData?: PropertyData;
  onSubmit: (data: any) => Promise<void>;
  isLoading: boolean;
  mode: "create" | "edit";
}

export function PropertyForm({ initialData, onSubmit, isLoading, mode }: PropertyFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [addressLine1, setAddressLine1] = useState(initialData?.address_line_1 || "");
  const [addressLine2, setAddressLine2] = useState(initialData?.address_line_2 || "");
  const [city, setCity] = useState(initialData?.city || "");
  const [state, setState] = useState(initialData?.state || "");
  const [postalCode, setPostalCode] = useState(initialData?.postal_code || "");
  const [country, setCountry] = useState(initialData?.country || "US");
  const [propertyType, setPropertyType] = useState(initialData?.property_type || "Single Family");
  const [status, setStatus] = useState(initialData?.status || "Vacant");
  const [purchasePrice, setPurchasePrice] = useState(initialData?.purchase_price?.toString() || "");
  const [currentValue, setCurrentValue] = useState(initialData?.current_value?.toString() || "");
  const [bedrooms, setBedrooms] = useState(initialData?.bedrooms?.toString() || "");
  const [bathrooms, setBathrooms] = useState(initialData?.bathrooms?.toString() || "");
  const [yearBuilt, setYearBuilt] = useState(initialData?.year_built?.toString() || "");
  const [lotSize, setLotSize] = useState(initialData?.lot_size?.toString() || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !addressLine1.trim() || !city.trim() || !state.trim() || !postalCode.trim()) {
      setError("Name, address, city, state, and postal code are required.");
      return;
    }

    const data: PropertyCreateData = {
      name: name.trim(),
      address_line_1: addressLine1.trim(),
      address_line_2: addressLine2.trim() || undefined,
      city: city.trim(),
      state: state.trim(),
      postal_code: postalCode.trim(),
      country: country || "US",
      property_type: propertyType,
      status,
      purchase_price: purchasePrice ? Number(purchasePrice) : null,
      current_value: currentValue ? Number(currentValue) : null,
      bedrooms: bedrooms ? Number(bedrooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      year_built: yearBuilt ? Number(yearBuilt) : null,
      lot_size: lotSize ? Number(lotSize) : null,
      notes: notes.trim() || null,
    };

    try {
      await onSubmit(data);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Failed to save property";
      setError(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Name & Type */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Property Name *</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="e.g. Sunset Villa" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select value={propertyType} onChange={e => setPropertyType(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none">
              {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none">
              {PROPERTY_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium mb-1">Address Line 1 *</label>
        <input type="text" required value={addressLine1} onChange={e => setAddressLine1(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="123 Main Street" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Address Line 2</label>
        <input type="text" value={addressLine2} onChange={e => setAddressLine2(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="Unit, Suite, etc." />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">City *</label>
          <input type="text" required value={city} onChange={e => setCity(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">State *</label>
          <input type="text" required value={state} onChange={e => setState(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="CA" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Postal Code *</label>
          <input type="text" required value={postalCode} onChange={e => setPostalCode(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
        </div>
      </div>

      {/* Financial */}
      <fieldset className="rounded-md border p-4">
        <legend className="text-sm font-semibold px-2">Financial Details</legend>
        <div className="grid gap-4 md:grid-cols-2 mt-2">
          <div>
            <label className="block text-sm font-medium mb-1">Purchase Price ($)</label>
            <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="450000" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Current Value ($)</label>
            <input type="number" value={currentValue} onChange={e => setCurrentValue(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="525000" />
          </div>
        </div>
      </fieldset>

      {/* Details */}
      <fieldset className="rounded-md border p-4">
        <legend className="text-sm font-semibold px-2">Property Details</legend>
        <div className="grid gap-4 md:grid-cols-4 mt-2">
          <div>
            <label className="block text-sm font-medium mb-1">Bedrooms</label>
            <input type="number" value={bedrooms} onChange={e => setBedrooms(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bathrooms</label>
            <input type="number" step="0.5" value={bathrooms} onChange={e => setBathrooms(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Year Built</label>
            <input type="number" value={yearBuilt} onChange={e => setYearBuilt(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Lot Size</label>
            <input type="number" step="0.01" value={lotSize} onChange={e => setLotSize(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="acres" />
          </div>
        </div>
      </fieldset>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="Any additional information..." />
      </div>

      <div className="flex gap-3 justify-end">
        <a href="/properties" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</a>
        <button type="submit" disabled={isLoading}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {isLoading ? "Saving..." : mode === "create" ? "Create Property" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
