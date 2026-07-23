"use client";
import { ContactList } from "@/components/contacts/ContactList";

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Contacts</h1><p className="text-sm text-muted-foreground mt-1">Manage your network of lenders, agents, contractors, and more.</p></div>
      <ContactList />
    </div>
  );
}
