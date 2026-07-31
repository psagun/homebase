"use client";

import { useEffect, useState } from "react";
import {
  Plus, Pencil, Trash2, Phone, Mail, Globe, X, Check,
  Link2, Link2Off, Search, StickyNote, Users,
} from "lucide-react";
import { usePropertyContacts, useCreateContact, useUpdateContact, useDeleteContact, useLinkContactToProperty, useUnlinkContactFromProperty, useContacts } from "@/lib/hooks/useContacts";
import { useProperty } from "@/lib/hooks/useProperties";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { CONTACT_TYPES } from "@/lib/constants";
import type { ContactData } from "@/lib/api/contacts";

const typeColors: Record<string, string> = {
  "Mortgage Lender": "bg-blue-100 text-blue-700", "Insurance Agent": "bg-purple-100 text-purple-700",
  "Property Manager": "bg-teal-100 text-teal-700", "Tenant": "bg-emerald-100 text-emerald-700",
  "Contractor": "bg-orange-100 text-orange-700", "Realtor": "bg-pink-100 text-pink-700",
  "HOA": "bg-amber-100 text-amber-700", "Tax Authority": "bg-red-100 text-red-700",
  "Utility Provider": "bg-cyan-100 text-cyan-700", "Attorney": "bg-indigo-100 text-indigo-700",
  "Accountant": "bg-slate-100 text-slate-700", "Other": "bg-gray-100 text-gray-700",
};

const EMPTY_FORM = { name: "", company: "", phone: "", email: "", website: "", notes: "", contact_type: "Other" };

export default function PropertyContactsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: property } = useProperty(id);
  const { data: contacts, isLoading, isError, refetch } = usePropertyContacts(id);
  const { data: allContacts } = useContacts();

  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const linkContact = useLinkContactToProperty();
  const unlinkContact = useUnlinkContactFromProperty();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");

  useEffect(() => {
    if (!showForm) return;
    const t = setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
    return () => clearTimeout(t);
  }, [showForm]);

  if (isLoading) return <LoadingState text="Loading contacts..." />;
  if (isError) return <ErrorState title="Failed to load" onRetry={() => refetch()} />;

  const resetForm = () => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(false); };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setMsg({ text: "Name is required", ok: false }); return; }
    setSaving(true); setMsg(null);
    try {
      const payload = { ...form, name: form.name.trim() };
      if (editId) {
        await updateContact.mutateAsync({ id: editId, data: payload });
        setMsg({ text: "Contact updated", ok: true });
      } else {
        await createContact.mutateAsync({ ...payload, property_ids: [id] });
        setMsg({ text: "Contact added", ok: true });
      }
      resetForm();
      setTimeout(() => setMsg(null), 2500);
    } catch {
      setMsg({ text: "Failed to save contact", ok: false });
    }
    setSaving(false);
  };

  const startEdit = (c: ContactData) => {
    setEditId(c.id);
    setForm({
      name: c.name || "", company: c.company || "", phone: c.phone || "",
      email: c.email || "", website: c.website || "", notes: c.notes || "",
      contact_type: c.contact_type || "Other",
    });
    setShowForm(true);
  };

  const handleDelete = async (c: ContactData) => {
    if (!confirm(`Delete ${c.name}? This removes the contact from your directory.`)) return;
    try {
      await deleteContact.mutateAsync(c.id);
      setMsg({ text: "Contact deleted", ok: true });
      setTimeout(() => setMsg(null), 2500);
    } catch {
      setMsg({ text: "Failed to delete contact", ok: false });
    }
  };

  const handleUnlink = async (c: ContactData) => {
    if (!confirm(`Unlink ${c.name} from this property? The contact stays in your directory.`)) return;
    try {
      await unlinkContact.mutateAsync({ contactId: c.id, propertyId: id });
      setMsg({ text: "Contact unlinked", ok: true });
      setTimeout(() => setMsg(null), 2500);
    } catch {
      setMsg({ text: "Failed to unlink contact", ok: false });
    }
  };

  const linkedIds = new Set((contacts || []).map((c) => c.id));
  const unlinked = (allContacts || []).filter((c) => !linkedIds.has(c.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Contacts{property ? <span className="text-muted-foreground font-normal"> — {property.name}</span> : ""}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{contacts?.length || 0} linked contacts</p>
        </div>
        {!showForm && (
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowLinkPicker(true); setShowForm(false); }}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              <Link2 className="h-4 w-4" /> Link Contact
            </button>
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Add Contact
            </button>
          </div>
        )}
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Link picker */}
      {showLinkPicker && (
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Link an Existing Contact</h3>
            <button onClick={() => setShowLinkPicker(false)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={linkSearch} onChange={(e) => setLinkSearch(e.target.value)}
              placeholder="Search your contacts..."
              className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1 border rounded-md p-1">
            {unlinked.filter((c) => c.name.toLowerCase().includes(linkSearch.toLowerCase())).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {unlinked.length === 0 ? "All your contacts are already linked." : "No matching contacts."}
              </p>
            ) : unlinked.filter((c) => c.name.toLowerCase().includes(linkSearch.toLowerCase())).map((c) => (
              <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {c.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.company || c.email || c.contact_type}</p>
                  </div>
                </div>
                <button onClick={async () => {
                  await linkContact.mutateAsync({ contactId: c.id, propertyId: id });
                  setShowLinkPicker(false);
                  setLinkSearch("");
                  setMsg({ text: `${c.name} linked`, ok: true });
                  setTimeout(() => setMsg(null), 2500);
                }}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90">
                  <Link2 className="h-3 w-3" /> Link
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="rounded-lg border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">{editId ? "Edit Contact" : "Add Contact"}</h3>
            <button onClick={resetForm} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
              <input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Contact name" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Company</label>
              <input value={form.company} onChange={(e) => setForm(p => ({ ...p, company: e.target.value }))}
                placeholder="Company / organization" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Contact Type</label>
              <select value={form.contact_type} onChange={(e) => setForm(p => ({ ...p, contact_type: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                {CONTACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="(555) 123-4567" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="name@example.com" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Website</label>
              <input value={form.website} onChange={(e) => setForm(p => ({ ...p, website: e.target.value }))}
                placeholder="https://..." className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={2} placeholder="Notes about this contact..." className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSubmit} disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
              <Check className="h-4 w-4" /> {editId ? "Save Changes" : "Add Contact"}
            </button>
            <button onClick={resetForm} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!contacts || contacts.length === 0) && !showForm && !showLinkPicker && (
        <div className="rounded-lg border bg-card py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">No contacts linked</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Add a new contact or link one from your directory.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Add Contact
            </button>
            <button onClick={() => setShowLinkPicker(true)}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              <Link2 className="h-4 w-4" /> Link Contact
            </button>
          </div>
        </div>
      )}

      {/* Contact cards */}
      {contacts && contacts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {contacts.map((c) => (
            <div key={c.id} className="rounded-lg border bg-card overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {c.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.company || c.contact_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => startEdit(c)} title="Edit contact"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-primary transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleUnlink(c)} title="Unlink from property"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-amber-600 transition-colors">
                    <Link2Off className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(c)} title="Delete contact"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Card body */}
              <div className="px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColors[c.contact_type] || "bg-gray-100 text-gray-700"}`}>
                    {c.contact_type}
                  </span>
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </a>
                  )}
                </div>
                {c.phone && (
                  <a href={`tel:${c.phone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {c.phone}
                  </a>
                )}
                {c.email && (
                  <p className="flex items-center gap-2 text-sm text-foreground">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {c.email}
                  </p>
                )}
                {c.website && (
                  <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Globe className="h-3.5 w-3.5" /> {c.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
                {c.notes && (
                  <p className="flex items-start gap-2 text-xs text-muted-foreground pt-1 border-t mt-2">
                    <StickyNote className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {c.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
