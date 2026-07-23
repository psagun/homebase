"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Phone, Mail, Link as LinkIcon, Unlink } from "lucide-react";
import { usePropertyContacts } from "@/lib/hooks/useContacts";
import { useProperty } from "@/lib/hooks/useProperties";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { CONTACT_TYPES } from "@/lib/constants";

const typeColors: Record<string, string> = {
  "Mortgage Lender": "bg-blue-100 text-blue-700", "Insurance Agent": "bg-purple-100 text-purple-700",
  "Property Manager": "bg-teal-100 text-teal-700", "Tenant": "bg-emerald-100 text-emerald-700",
  "Contractor": "bg-orange-100 text-orange-700", "Realtor": "bg-pink-100 text-pink-700",
  "HOA": "bg-amber-100 text-amber-700", "Tax Authority": "bg-red-100 text-red-700",
  "Utility Provider": "bg-cyan-100 text-cyan-700", "Attorney": "bg-indigo-100 text-indigo-700",
  "Accountant": "bg-slate-100 text-slate-700", "Other": "bg-gray-100 text-gray-700",
};

export default function PropertyContactsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: property } = useProperty(id);
  const { data: contacts, isLoading, isError, refetch } = usePropertyContacts(id);

  if (isLoading) return <LoadingState text="Loading contacts..." />;
  if (isError) return <ErrorState title="Failed to load" onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Contacts{property ? <span className="text-muted-foreground font-normal"> — {property.name}</span> : ""}</h2>
        <Link href="/contacts" className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Manage Contacts
        </Link>
      </div>

      {!contacts || contacts.length === 0 ? (
        <EmptyState icon={<LinkIcon className="h-16 w-16" />} title="No contacts linked"
          description="Go to the global contacts page to add and link contacts to this property."
          action={<Link href="/contacts" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
            <Plus className="h-4 w-4" />Go to Contacts</Link>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {contacts.map(c => (
            <div key={c.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{c.name.charAt(0)}</div>
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    {c.company && <p className="text-xs text-muted-foreground">{c.company}</p>}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColors[c.contact_type] || "bg-gray-100"}`}>{c.contact_type}</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {c.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</p>}
                {c.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
