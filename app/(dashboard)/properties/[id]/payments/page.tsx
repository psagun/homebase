"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Landmark, ShieldCheck, Receipt, CreditCard, CalendarCheck, ArrowRight, Undo2, CheckCircle2 } from "lucide-react";
import { usePaymentHistory, useDeletePaymentHistory } from "@/lib/hooks/usePayments";
import { useProperty } from "@/lib/hooks/useProperties";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ActionsMenu } from "@/components/shared/ActionsMenu";
import { formatCurrency, formatDate, formatDateFull, formatRelativeDate, capitalize } from "@/lib/utils";
import type { PaymentHistoryItem, PaymentType } from "@/lib/api/payments";

const TYPE_META: Record<"mortgage" | "insurance" | "tax", { Icon: typeof Landmark; bg: string; color: string; tab: string }> = {
  mortgage: { Icon: Landmark, bg: "#eef2ff", color: "#3b82f6", tab: "/mortgage" },
  insurance: { Icon: ShieldCheck, bg: "#faf5ff", color: "#9333ea", tab: "/insurance" },
  tax: { Icon: Receipt, bg: "#fefce8", color: "#ca8a04", tab: "/taxes" },
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "mortgage", label: "Mortgage" },
  { value: "insurance", label: "Insurance" },
  { value: "tax", label: "Taxes" },
] as const;

export default function PaymentsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: property } = useProperty(id);
  const [filter, setFilter] = useState<PaymentType | "">("");
  const [undoMsg, setUndoMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const { data: records, isLoading, isError, refetch } = usePaymentHistory(id, filter || undefined);
  const deletePayment = useDeletePaymentHistory();

  // Records are ordered newest-first, so the first entry per source_id is
  // its most recent confirmation — the only one that can be undone.
  const undoableSourceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of records ?? []) {
      if (!ids.has(r.source_id)) ids.add(r.source_id);
    }
    return ids;
  }, [records]);

  const summary = useMemo(() => {
    const items = records ?? [];
    const totalPaid = items.reduce((s, r) => s + (r.amount ?? 0), 0);
    const withAmount = items.filter((r) => r.amount != null).length;
    const last = items[0];
    return {
      totalPaid,
      count: items.length,
      lastDate: last?.confirmed_at ?? null,
      nextDue: last?.next_due_date ?? null,
      hasAmounts: withAmount > 0,
    };
  }, [records]);

  if (isLoading) return <LoadingState text="Loading payment history..." />;
  if (isError) return <ErrorState title="Failed to load payment history" onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          Payment History
          {property && <span className="text-muted-foreground font-normal"> — {property.name}</span>}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Every payment you&apos;ve confirmed on the lender, insurer, or tax authority&apos;s website.
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={<CreditCard className="h-4 w-4" />}
          bg="#eef2ff" color="#3b82f6"
          label="Total Confirmed"
          value={summary.hasAmounts ? formatCurrency(summary.totalPaid) : "—"}
          sub={summary.hasAmounts ? `${summary.count} payment${summary.count === 1 ? "" : "s"}` : "No amount on record"}
        />
        <SummaryCard
          icon={<CalendarCheck className="h-4 w-4" />}
          bg="#ecfdf5" color="#10b981"
          label="Payments"
          value={String(summary.count)}
          sub={summary.lastDate ? `Last ${formatRelativeDate(summary.lastDate)}` : "No payments yet"}
        />
        <SummaryCard
          icon={<Landmark className="h-4 w-4" />}
          bg="#faf5ff" color="#8b5cf6"
          label="Last Confirmed"
          value={summary.lastDate ? formatDate(summary.lastDate) : "—"}
          sub={summary.lastDate ? formatRelativeDate(summary.lastDate) : ""}
        />
        <SummaryCard
          icon={<ArrowRight className="h-4 w-4" />}
          bg="#fff7ed" color="#f97316"
          label="Next Cycle Due"
          value={summary.nextDue ? formatDate(summary.nextDue) : "—"}
          sub="After last confirmation"
        />
      </div>

      {/* Undo result message */}
      {undoMsg && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
          undoMsg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400"
                     : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400"
        }`}>
          <CheckCircle2 className={`h-4 w-4 ${undoMsg.ok ? "" : "hidden"}`} />
          {undoMsg.text}
        </div>
      )}

      {/* Type filter */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors border ${
              filter === f.value
                ? "bg-primary text-white border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/20"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {!records || records.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-16 w-16" />}
          title="No confirmed payments yet"
          description="When you pay on the lender's, insurer's, or tax authority's website, confirm it from the corresponding tab and it will appear here as a confirmed payment."
          action={
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href={`/properties/${id}/mortgage`} className="underline hover:text-primary">Mortgage</Link>
              <span>·</span>
              <Link href={`/properties/${id}/insurance`} className="underline hover:text-primary">Insurance</Link>
              <span>·</span>
              <Link href={`/properties/${id}/taxes`} className="underline hover:text-primary">Taxes</Link>
            </div>
          }
        />
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" aria-hidden />
          <div className="space-y-3">
            {records.map((r) => (
              <TimelineEntry
                key={r.id}
                record={r}
                propertyId={id}
                canUndo={undoableSourceIds.has(r.source_id)}
                onUndo={async () => {
                  try {
                    const result = await deletePayment.mutateAsync(r.id);
                    setUndoMsg({ text: result.message, ok: true });
                    setTimeout(() => setUndoMsg(null), 5000);
                  } catch {
                    setUndoMsg({ text: "Failed to undo payment. Please try again.", ok: false });
                    setTimeout(() => setUndoMsg(null), 5000);
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineEntry({ record, propertyId, canUndo, onUndo }: {
  record: PaymentHistoryItem;
  propertyId: string;
  canUndo: boolean;
  onUndo: () => void;
}) {
  const meta = TYPE_META[record.payment_type] ?? TYPE_META.mortgage;
  const { Icon } = meta;

  return (
    <div className="relative flex gap-4">
      {/* Node */}
      <div className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-background" style={{ backgroundColor: meta.bg, color: meta.color }}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link
              href={`/properties/${propertyId}${meta.tab}`}
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
            >
              {capitalize(record.payment_type)} payment
            </Link>
            {record.amount != null && (
              <span className="text-sm font-bold text-emerald-600">{formatCurrency(record.amount)}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground" title={formatDateFull(record.confirmed_at)}>
              Confirmed {formatRelativeDate(record.confirmed_at)}
            </span>
            {canUndo && (
              <ActionsMenu
                label="Payment"
                actions={[
                  {
                    label: "Undo Payment",
                    icon: <Undo2 className="h-4 w-4" />,
                    destructive: true,
                    onClick: onUndo,
                  },
                ]}
              />
            )}
          </div>
        </div>

        {/* Cycle: due → next due */}
        {(record.due_date || record.next_due_date) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {record.due_date && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5">
                <CalendarCheck className="h-3 w-3" />
                Cycle {formatDate(record.due_date)}
              </span>
            )}
            {record.next_due_date && (
              <>
                <ArrowRight className="h-3 w-3" />
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5 dark:bg-emerald-900/30 dark:text-emerald-400">
                  Next due {formatDate(record.next_due_date)}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon, bg, color, label, value, sub }: {
  icon: React.ReactNode; bg: string; color: string; label: string; value: string; sub: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: bg, color }}>{icon}</div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
