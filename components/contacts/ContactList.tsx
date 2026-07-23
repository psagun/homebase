"use client";
import { useState } from "react";
import { Plus, Trash2, Phone, Mail, Building2 } from "lucide-react";
import { useContacts, useCreateContact, useDeleteContact } from "@/lib/hooks/useContacts";
import { ContactForm } from "./ContactForm";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { CONTACT_TYPES } from "@/lib/constants";
import type { ContactCreateData } from "@/lib/api/contacts";

const typeColors: Record<string, string> = {
  "Mortgage Lender": "bg-blue-100 text-blue-700", "Insurance Agent": "bg-purple-100 text-purple-700",
  "Property Manager": "bg-teal-100 text-teal-700", "Tenant": "bg-emerald-100 text-emerald-700",
  "Contractor": "bg-orange-100 text-orange-700", "Realtor": "bg-pink-100 text-pink-700",
  "HOA": "bg-amber-100 text-amber-700", "Tax Authority": "bg-red-100 text-red-700",
  "Utility Provider": "bg-cyan-100 text-cyan-700", "Attorney": "bg-indigo-100 text-indigo-700",
  "Accountant": "bg-slate-100 text-slate-700", "Other": "bg-gray-100 text-gray-700",
};

export function ContactList({ onAddToProperty }: { onAddToProperty?: (id: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("");
  const { data: contacts, isLoading, isError, refetch } = useContacts(filter || undefined);
  const createContact = useCreateContact();
  const deleteContact = useDeleteContact();

  if (showForm) {
    return (
      <div><h3 className="text-lg font-semibold mb-4">New Contact</h3>
        <div className="rounded-lg border bg-card p-6">
          <ContactForm onSubmit={async (data: ContactCreateData) => { await createContact.mutateAsync(data); setShowForm(false); }}
            isLoading={createContact.isPending} onCancel={() => setShowForm(false)} />
        </div>
      </div>
    );
  }

  if (isLoading) return <LoadingState text="Loading contacts..." />;
  if (isError) return <ErrorState title="Failed to load contacts" onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none">
          <option value="">All Types</option>
          {CONTACT_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Contact
        </button>
      </div>

      {!contacts || contacts.length === 0 ? (
        <EmptyState icon={<Building2 className="h-16 w-16" />} title="No contacts" description="Add mortgage lenders, insurance agents, and more." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map(c => (
            <div key={c.id} className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {c.name.charAt(0)}
                  </div>
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
                {c.notes && <p className="mt-1 italic">{c.notes}</p>}
              </div>
              <div className="flex gap-2 mt-3 pt-2 border-t">
                {onAddToProperty && <button onClick={() => onAddToProperty(c.id)} className="text-xs text-primary hover:underline">Link to property</button>}
                <button onClick={() => deleteContact.mutateAsync(c.id)} className="ml-auto text-xs text-red-500 hover:underline flex items-center gap-1"><Trash2 className="h-3 w-3" />Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
