"use client";
import { useState, type FormEvent } from "react";
import { CONTACT_TYPES } from "@/lib/constants";
import type { ContactCreateData, ContactData } from "@/lib/api/contacts";

interface Props {
  initialData?: ContactData;
  onSubmit: (data: ContactCreateData) => Promise<void>;
  isLoading: boolean;
  onCancel: () => void;
}

export function ContactForm({ initialData, onSubmit, isLoading, onCancel }: Props) {
  const [name, setName] = useState(initialData?.name || "");
  const [company, setCompany] = useState(initialData?.company || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [website, setWebsite] = useState(initialData?.website || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [contactType, setContactType] = useState(initialData?.contact_type || "Other");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(null);
    if (!name.trim()) { setError("Name is required."); return; }
    try { await onSubmit({ name: name.trim(), company: company.trim() || undefined, phone: phone.trim() || undefined, email: email.trim() || undefined, website: website.trim() || undefined, notes: notes.trim() || undefined, contact_type: contactType }); }
    catch (err: unknown) { setError(err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Failed to save"); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div>
        <label className="block text-sm font-medium mb-1">Name *</label>
        <input type="text" required value={name} onChange={e => setName(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="Contact name" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select value={contactType} onChange={e => setContactType(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none">
            {CONTACT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Company</label>
          <input type="text" value={company} onChange={e => setCompany(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Website</label>
        <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none" />
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
        <button type="submit" disabled={isLoading}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
          {isLoading ? "Saving..." : initialData ? "Save" : "Add Contact"}
        </button>
      </div>
    </form>
  );
}
