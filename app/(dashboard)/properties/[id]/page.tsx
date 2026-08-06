"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DollarSign, CalendarCheck, FileText, ShieldCheck, Wrench, Plus, Landmark, ExternalLink, Building2, Receipt } from "lucide-react";
import { useProperty } from "@/lib/hooks/useProperties";
import { useTasks } from "@/lib/hooks/useTasks";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ConfirmPaymentButton } from "@/components/shared/ConfirmPaymentButton";
import { PayPortalButton } from "@/components/shared/PayPortalButton";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ReminderItem {
  id: string;
  title: string;
  task_type: string;
  due_date?: string | null;
  status: string;
}

function dueDays(r: ReminderItem): number {
  if (!r.due_date) return 0;
  const d = new Date(r.due_date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

function reminderIcon(r: ReminderItem): { icon: React.ReactNode; bg: string; color: string } {
  const t = (r.task_type || "").toLowerCase();
  if (t.includes("mortgage")) return { icon: <Landmark className="h-4 w-4" />, bg: "bg-blue-50 text-blue-600", color: "" };
  if (t.includes("insurance")) return { icon: <ShieldCheck className="h-4 w-4" />, bg: "bg-purple-50 text-purple-600", color: "" };
  if (t.includes("tax")) return { icon: <Receipt className="h-4 w-4" />, bg: "bg-amber-50 text-amber-600", color: "" };
  if (t.includes("hoa")) return { icon: <Building2 className="h-4 w-4" />, bg: "bg-pink-50 text-pink-600", color: "" };
  if (t.includes("rent")) return { icon: <DollarSign className="h-4 w-4" />, bg: "bg-emerald-50 text-emerald-600", color: "" };
  if (t.includes("lease")) return { icon: <FileText className="h-4 w-4" />, bg: "bg-indigo-50 text-indigo-600", color: "" };
  if (t.includes("maintenance")) return { icon: <Wrench className="h-4 w-4" />, bg: "bg-orange-50 text-orange-600", color: "" };
  return { icon: <CalendarCheck className="h-4 w-4" />, bg: "bg-gray-100 text-gray-600", color: "" };
}

export default function PropertyOverviewPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: property, isLoading, isError, refetch } = useProperty(id);
  const [paymentLinks, setPaymentLinks] = useState<{ label: string; url: string; icon: React.ReactNode; type: "mortgage" | "insurance" | "tax"; id: string; dueDate?: string | null }[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<{ mortgage: any; insurance: any; taxes: any[]; tenants: any[] }>({
    mortgage: null, insurance: null, taxes: [], tenants: [],
  });

  // Load this property's active tasks for the reminders section (React Query)
  const { data: tasksData, isLoading: tasksLoading } = useTasks({ property_id: id });
  useEffect(() => {
    const active = (Array.isArray(tasksData) ? tasksData : []).filter(
      (t) => t.status !== "Completed" && t.status !== "Dismissed"
    );
    // Sort: overdue first, then due today, then by due date
    active.sort((a, b) => {
      const rank = (t: ReminderItem) =>
        t.status === "Overdue" ? 0 : t.status === "Due Today" ? 1 : 2;
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return (a.due_date || "").localeCompare(b.due_date || "");
    });
    setReminders(active.slice(0, 5));
    setRemindersLoading(tasksLoading);
  }, [tasksData, tasksLoading]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/properties/${id}/mortgage`, { credentials: "include" }).then(r => r.json()).catch(() => null),
      fetch(`/api/v1/properties/${id}/insurance`, { credentials: "include" }).then(r => r.json()).catch(() => null),
      fetch(`/api/v1/properties/${id}/taxes`, { credentials: "include" }).then(r => r.json()).catch(() => null),
      fetch(`/api/v1/properties/${id}/tenants`, { credentials: "include" }).then(r => r.json()).catch(() => []),
    ]).then(([mortgage, insurance, taxes, tenants]) => {
      setSummaryData({
        mortgage, insurance,
        taxes: Array.isArray(taxes) ? taxes : [],
        tenants: Array.isArray(tenants) ? tenants : [],
      });
      const links: { label: string; url: string; icon: React.ReactNode; type: "mortgage" | "insurance" | "tax"; id: string; dueDate?: string | null }[] = [];
      if (mortgage?.portal_url) links.push({
        label: "Pay Mortgage", url: mortgage.portal_url, icon: <Landmark className="h-4 w-4" />,
        type: "mortgage" as const, id: mortgage.id, dueDate: mortgage.next_due_date,
      });
      if (insurance?.portal_url) links.push({
        label: "Pay Insurance", url: insurance.portal_url, icon: <ShieldCheck className="h-4 w-4" />,
        type: "insurance" as const, id: insurance.id, dueDate: insurance.renewal_date,
      });
      if (Array.isArray(taxes)) {
        const tax = taxes.find((t: any) => t?.portal_url && /^https?:\/\//.test(t.portal_url));
        if (tax?.portal_url) links.push({
          label: "Pay Taxes", url: tax.portal_url, icon: <Receipt className="h-4 w-4" />,
          type: "tax" as const, id: tax.id, dueDate: tax.next_due_date,
        });
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
            value={formatCurrency(summaryData.tenants.reduce((s: number, t: any) => s + Number(t.monthly_rent || 0), 0))}
            subtitle={summaryData.tenants.length ? `${summaryData.tenants.length} tenant${summaryData.tenants.length === 1 ? "" : "s"}` : "No tenant data yet"}
            href={`/properties/${id}/tenants`}
          />
          <SummaryCard
            icon={<Landmark className="h-5 w-5" />}
            iconBg="bg-blue-100 text-blue-600"
            title="Mortgage Payment"
            value={summaryData.mortgage?.monthly_payment ? formatCurrency(Number(summaryData.mortgage.monthly_payment)) : "—"}
            subtitle={summaryData.mortgage?.next_due_date ? `Next due ${formatDate(summaryData.mortgage.next_due_date)}` : "Not set up"}
            href={`/properties/${id}/mortgage`}
          />
          <SummaryCard
            icon={<ShieldCheck className="h-5 w-5" />}
            iconBg="bg-purple-100 text-purple-600"
            title="Insurance Renewal"
            value={summaryData.insurance?.annual_premium ? formatCurrency(Number(summaryData.insurance.annual_premium)) : "—"}
            subtitle={summaryData.insurance?.renewal_date ? `Renews ${formatDate(summaryData.insurance.renewal_date)}` : "Not set up"}
            href={`/properties/${id}/insurance`}
          />
          <SummaryCard
            icon={<FileText className="h-5 w-5" />}
            iconBg="bg-amber-100 text-amber-600"
            title="Property Tax"
            value={summaryData.taxes[0]?.annual_tax ? formatCurrency(Number(summaryData.taxes[0].annual_tax)) : "—"}
            subtitle={summaryData.taxes[0]?.next_due_date ? `Next due ${formatDate(summaryData.taxes[0].next_due_date)}` : "Not set up"}
            href={`/properties/${id}/taxes`}
          />
        </div>
      </div>

      {/* Upcoming Reminders */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Upcoming Reminders</h2>
          <Link href="/tasks" className="text-xs text-primary font-medium hover:underline">View all</Link>
        </div>
        {remindersLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : reminders.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <CalendarCheck className="mr-2 h-5 w-5" />
            No upcoming reminders
          </div>
        ) : (
          <div className="space-y-2">
            {reminders.map((r) => (
              <Link
                key={r.id}
                href="/tasks"
                className="flex items-center gap-3 rounded-md border px-3 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${reminderIcon(r).bg} ${reminderIcon(r).color}`}>
                  {reminderIcon(r).icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.task_type}</p>
                </div>
                <span className={`shrink-0 text-xs font-medium ${r.status === "Overdue" ? "text-red-600" : r.status === "Due Today" ? "text-amber-600" : "text-muted-foreground"}`}>
                  {r.status === "Overdue" ? `${dueDays(r)}d overdue` : r.status === "Due Today" ? "Due today" : dueDays(r) === 0 ? "Due today" : `Due in ${dueDays(r)}d`}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {paymentLinks.length > 0 ? paymentLinks.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <PayPortalButton
                paymentType={link.type}
                sourceId={link.id}
                url={link.url}
                dueDate={link.dueDate}
                label={link.label.replace("Pay ", "")}
              />
              <ConfirmPaymentButton
                paymentType={link.type}
                sourceId={link.id}
                dueDate={link.dueDate}
                label={link.type}
              />
            </div>
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
