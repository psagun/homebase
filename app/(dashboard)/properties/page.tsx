"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Upload } from "lucide-react";
import { useProperties } from "@/lib/hooks/useProperties";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { PROPERTY_STATUSES, PROPERTY_TYPES } from "@/lib/constants";
import { Building2 } from "lucide-react";

export default function PropertiesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const { data: properties, isLoading, isError, refetch } = useProperties({
    search: search || undefined,
    status: statusFilter || undefined,
    property_type: typeFilter || undefined,
  });

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setImporting(true);
      setImportResult(null);
      try {
        const { importPropertiesCSV } = await import("@/lib/api/csvImport");
        const result = await importPropertiesCSV(file);
        setImportResult(`Imported ${result.imported} properties${result.skipped > 0 ? `, ${result.skipped} skipped` : ""}.`);
        refetch();
      } catch (err: unknown) {
        setImportResult(`Error: ${err instanceof Error ? err.message : "Import failed"}`);
      }
      setImporting(false);
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
          <p className="text-sm text-muted-foreground">
            Manage your real estate portfolio
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleImport} disabled={importing}
            className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Upload className="h-4 w-4" />
            {importing ? "Importing..." : "Import CSV"}
          </button>
          <Link
            href="/properties/new"
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Property
          </Link>
        </div>
      </div>

      {importResult && (
        <div className={`rounded-lg px-4 py-3 text-sm ${importResult.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {importResult}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 w-64">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, address, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none"
        >
          <option value="">All Statuses</option>
          {PROPERTY_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none"
        >
          <option value="">All Types</option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState text="Loading properties..." />
      ) : isError ? (
        <ErrorState title="Failed to load properties" onRetry={() => refetch()} />
      ) : !properties || properties.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-16 w-16" />}
          title="No properties found"
          description={
            search || statusFilter || typeFilter
              ? "Try adjusting your search or filters."
              : "Add your first property to get started."
          }
          action={
            !search && !statusFilter && !typeFilter ? (
              <Link
                href="/properties/new"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Add Property
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 text-xs font-semibold uppercase text-muted-foreground">Property</th>
                  <th className="text-left p-4 text-xs font-semibold uppercase text-muted-foreground">Type</th>
                  <th className="text-left p-4 text-xs font-semibold uppercase text-muted-foreground">Status</th>
                  <th className="text-right p-4 text-xs font-semibold uppercase text-muted-foreground">Value</th>
                  <th className="text-right p-4 text-xs font-semibold uppercase text-muted-foreground">Equity</th>
                  <th className="text-right p-4 text-xs font-semibold uppercase text-muted-foreground">Beds/Baths</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => {
                  const purchase = p.purchase_price || 0;
                  const current = p.current_value || 0;
                  const equityPct = purchase > 0 ? ((current - purchase) / purchase * 100).toFixed(2) : "0.00";
                  const equityNum = parseFloat(equityPct);
                  return (
                    <tr key={p.id} role="link" tabIndex={0}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/properties/${p.id}`}
                      onKeyDown={(e) => { if (e.key === "Enter") window.location.href = `/properties/${p.id}`; }}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.city}, {p.state}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm">{p.property_type}</td>
                      <td className="p-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="p-4 text-right text-sm font-mono">{formatCurrency(current)}</td>
                      <td className={`p-4 text-right text-sm font-mono ${equityNum >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {equityNum >= 0 ? "↑" : "↓"} {Math.abs(equityNum)}%
                      </td>
                      <td className="p-4 text-right text-sm text-muted-foreground">
                        {p.bedrooms && p.bathrooms ? `${p.bedrooms}bd / ${p.bathrooms}ba` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

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
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorMap[status] || "bg-gray-50 text-gray-700"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotMap[status] || "bg-gray-500"}`} />
      {status}
    </span>
  );
}
