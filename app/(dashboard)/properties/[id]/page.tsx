"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DollarSign, CalendarCheck, FileText, ShieldCheck, Wrench, Plus, Landmark, ExternalLink, Building2, Receipt } from "lucide-react";
import { useProperty } from "@/lib/hooks/useProperties";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatCurrency } from "@/lib/utils";

export default function PropertyOverviewPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: property, isLoading, isError, refetch } = useProperty(id);
  const [paymentLinks, setPaymentLinks] = useState<{ label: string; url: string; icon: React.ReactNode }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/properties/${id}/mortgage`, { credentials: "include" }).then(r => r.json()).catch(() => null),
      fetch(`/api/v1/properties/${id}/insurance`, { credentials: "include" }).then(r => r.json()).catch(() => null),
      fetch(`/api/v1/properties/${id}/taxes`, { credentials: "include" }).then(r => r.json()).catch(() => null),
    ]).then(([mortgage, insurance, taxes]) => {
      const links: { label: string; url: string; icon: React.ReactNode }[] = [];
      if (mortgage?.portal_url) links.push({ label: "Pay Mortgage", url: mortgage.portal_url, icon: <Landmark className="h-4 w-4" /> });
      if (insurance?.portal_url) links.push({ label: "Pay Insurance", url: insurance.portal_url, icon: <ShieldCheck className="h-4 w-4" /> });
      if (Array.isArray(taxes)) {
        const tax = taxes.find((t: any) => t?.portal_url);
        if (tax?.portal_url) links.push({ label: "Pay Taxes", url: tax.portal_url, icon: <Receipt className="h-4 w-4" /> });
      }
      setPaymentLinks(links);
    });
  }, [id]);

  if (isLoading) return <LoadingState text="Loading property details..." />;

  if (isError) {
    return (
      <ErrorState
        title="Property not found"
        message="This property may have been removed or you don't have access."
        onRetry={() => refetch()}
      />
    );
  }

  if (!property) return null;

  const purchase = property.purchase_price || 0;
  const current = property.current_value || 0;
  const equity = current - purchase;
  const equityPct = purchase > 0 ? ((current - purchase) / purchase * 100).toFixed(2) : "0.00";

  return (
    <div className="space-y-6">
      {/* Property Details Grid */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="text-base font-semibold mb-4">Property Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <DetailItem label="Type" value={property.property_type} />
          <DetailItem label="Purchase Price" value={formatCurrency(purchase)} />
          <DetailItem label="Current Value" value={formatCurrency(current)} />
          <DetailItem
            label="Estimated Equity"
            value={`${formatCurrency(equity)} (${equity >= 0 ? "+" : ""}${equityPct}%)`}
            className={equity >= 0 ? "text-emerald-600" : "text-red-600"}
          />
          <DetailItem label="Lot Size" value={property.lot_size ? `${property.lot_size} acres` : "—"} />
          <DetailItem label="Bedrooms" value={property.bedrooms?.toString() || "—"} />
          <DetailItem label="Bathrooms" value={property.bathrooms?.toString() || "—"} />
          <DetailItem label="Year Built" value={property.year_built?.toString() || "—"} />
          <DetailItem label="Purchase Date" value={property.purchase_date ? new Date(property.purchase_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"} />
          <DetailItem label="Country" value={property.country} />
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div>
        <h2 className="text-base font-semibold mb-3">Quick Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            icon={<DollarSign className="h-5 w-5" />}
            iconBg="bg-emerald-100 text-emerald-600"
            title="Monthly Rent"
            value="$0"
            subtitle="No tenant data yet"
            href={`/properties/${id}/tenants`}
          />
          <SummaryCard
            icon={<Landmark className="h-5 w-5" />}
            iconBg="bg-blue-100 text-blue-600"
            title="Mortgage Payment"
            value="$0"
            subtitle="Not set up"
            href={`/properties/${id}/mortgage`}
          />
          <SummaryCard
            icon={<ShieldCheck className="h-5 w-5" />}
            iconBg="bg-purple-100 text-purple-600"
            title="Insurance Renewal"
            value="—"
            subtitle="Not set up"
            href={`/properties/${id}/insurance`}
          />
          <SummaryCard
            icon={<FileText className="h-5 w-5" />}
            iconBg="bg-amber-100 text-amber-600"
            title="Property Tax"
            value="—"
            subtitle="Not set up"
            href={`/properties/${id}/taxes`}
          />
        </div>
      </div>

      {/* Upcoming Reminders */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Upcoming Reminders</h2>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Coming in Phase 8
          </span>
        </div>
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <CalendarCheck className="mr-2 h-5 w-5" />
          No upcoming reminders
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {paymentLinks.length > 0 ? paymentLinks.map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 bg-[#00D632] hover:bg-[#00b82a]">
              <ExternalLink className="h-4 w-4" /> {link.label}
            </a>
          )) : (
            <ActionButton icon={<DollarSign className="h-4 w-4" />} label="Make Payment" />
          )}
          <ActionButton icon={<FileText className="h-4 w-4" />} label="Add Document" />
          <ActionButton icon={<Wrench className="h-4 w-4" />} label="Record Expense" />
          <ActionButton icon={<Plus className="h-4 w-4" />} label="Create Task" />
        </div>
      </div>

      {/* Notes */}
      {property.notes && (
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-base font-semibold mb-2">Notes</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{property.notes}</p>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${className || ""}`}>{value}</p>
    </div>
  );
}

function SummaryCard({
  icon,
  iconBg,
  title,
  value,
  subtitle,
  href,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  value: string;
  subtitle: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border bg-card p-4 hover:shadow-sm hover:border-primary/20 transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${iconBg}`}>
          {icon}
        </div>
        <p className="text-sm font-medium">{title}</p>
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </Link>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      disabled
      className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground opacity-60 cursor-not-allowed"
      title="Coming in a future phase"
    >
      {icon}
      {label}
    </button>
  );
}
