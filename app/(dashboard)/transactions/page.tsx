"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface TransactionItem {
  id: string; property_id: string; property_name: string; user_name: string;
  transaction_type: string; category: string; amount: number;
  transaction_date: string; description?: string;
}

export default function TransactionsPage() {
  const [txns, setTxns] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/v1/all", { credentials: "include" })
      .then(r => { if (!r.ok) throw Error(); return r.json(); })
      .then(d => setTxns(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState text="Loading transactions..." />;
  if (error) return <ErrorState title="Failed to load" />;

  const totalIncome = txns.filter(t => t.transaction_type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = txns.filter(t => t.transaction_type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Transactions</h1><p className="text-sm text-muted-foreground mt-1">All financial activity across your portfolio</p></div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase">Total Income</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase">Total Expenses</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase">Net</p>
          <p className={`text-xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(totalIncome - totalExpenses)}</p>
        </div>
      </div>

      {txns.length === 0 ? (
        <EmptyState icon={<DollarSign className="h-16 w-16" />} title="No transactions" description="Transactions from all properties will appear here." />
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Date</th>
                <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Property</th>
                <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Category</th>
                <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Added By</th>
                <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody>
              {txns.map(t => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 text-sm">{formatShortDate(t.transaction_date)}</td>
                  <td className="p-3"><Link href={`/properties/${t.property_id}`} className="text-sm text-primary hover:underline">{t.property_name}</Link></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {t.transaction_type === "income" ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" /> : <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
                      <span className="text-sm">{t.category}</span>
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground ml-6">{t.description}</p>}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{t.user_name}</td>
                  <td className={`p-3 text-right text-sm font-mono font-semibold ${t.transaction_type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                    {t.transaction_type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
