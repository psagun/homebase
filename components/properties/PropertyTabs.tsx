"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Overview", href: "" },
  { label: "Ownership", href: "/ownership" },
  { label: "Mortgage", href: "/mortgage" },
  { label: "Insurance", href: "/insurance" },
  { label: "Taxes", href: "/taxes" },
  { label: "HOA", href: "/hoa" },
  { label: "Tenants", href: "/tenants" },
  { label: "Contacts", href: "/contacts" },
  { label: "Documents", href: "/documents" },
  { label: "Maintenance", href: "/maintenance" },
  { label: "Financials", href: "/financials" },
  { label: "Payments", href: "/payments" },
] as const;

export function PropertyTabs({ propertyId }: { propertyId: string }) {
  const pathname = usePathname();
  const currentTab = pathname.split(`/properties/${propertyId}`)[1] || "";

  return (
    <nav className="flex gap-0.5 overflow-x-auto scrollbar-none border-b">
      {TABS.map((tab) => {
        const href = tab.href
          ? `/properties/${propertyId}${tab.href}`
          : `/properties/${propertyId}`;
        const isActive =
          tab.href === ""
            ? currentTab === "" || currentTab === "/"
            : currentTab === tab.href;

        return (
          <Link
            key={tab.label}
            href={href}
            className={`whitespace-nowrap rounded-t-md px-3 md:px-4 py-2.5 text-xs md:text-sm font-medium transition-colors border-b-2 ${
              isActive
                ? "border-primary bg-background text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
