"use client";

import { useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, Plus, Trash2 } from "lucide-react";
import { useTransactions, useCashFlow, useCreateTransaction, useDeleteTransaction } from "@/lib/hooks/useTransactions";
import { useProperty } from "@/lib/hooks/useProperties";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency, formatShortDate } from "@/lib/utils";

export default function FinancialsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [showForm, setShowForm] = useState(false);
  const { data: property } = useProperty(id);
  const { data: txns, isLoading, isError, refetch } = useTransactions(id);
  const { data: cashFlow } = useCashFlow(id);
  const deleteTxn = useDeleteTransaction(id);

  if (isLoading) return <LoadingState text="Loading financials..." />;
  if (isError) return <ErrorState title="Failed to load" onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Financials{property ? <span className="text-muted-foreground font-normal"> — {property.name}</span> : ""}</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
          <Plus className="h-4 w-4" />{showForm ? "Cancel" : "Add Transaction"}
        </button>
      </div>

      {showForm && <TransactionForm propertyId={id} onSuccess={() => { setShowForm(false); refetch(); }} />}

      {/* Cash Flow Summary */}
      {cashFlow && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <TrendingUp className="h-4 w-4" /><span className="text-xs font-semibold uppercase">Total Income</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(cashFlow.total_income)}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <TrendingDown className="h-4 w-4" /><span className="text-xs font-semibold uppercase">Total Expenses</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(cashFlow.total_expenses)}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <DollarSign className="h-4 w-4" /><span className="text-xs font-semibold uppercase">Net Cash Flow</span>
            </div>
            <p className={`text-xl font-bold ${cashFlow.net_cash_flow >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(cashFlow.net_cash_flow)}
            </p>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {cashFlow && (cashFlow.income_by_category.length > 0 || cashFlow.expense_by_category.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          {cashFlow.income_by_category.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold text-emerald-600 mb-3">Income by Category</h3>
              <div className="space-y-2">
                {cashFlow.income_by_category.map((item: any) => (
                  <div key={item.category} className="flex justify-between text-sm">
                    <span>{item.category}</span>
                    <span className="font-mono font-medium text-emerald-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {cashFlow.expense_by_category.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold text-red-600 mb-3">Expenses by Category</h3>
              <div className="space-y-2">
                {cashFlow.expense_by_category.map((item: any) => (
                  <div key={item.category} className="flex justify-between text-sm">
                    <span>{item.category}</span>
                    <span className="font-mono font-medium text-red-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transaction List */}
      {!txns || txns.length === 0 ? (
        <EmptyState icon={<DollarSign className="h-16 w-16" />} title="No transactions" description="Add income and expenses to track cash flow." />
      ) : (
        <div className="rounded-lg border bg-card">
          {txns.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${t.transaction_type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {t.transaction_type === "income" ? "I" : "E"}
                </div>
                <div>
                  <p className="text-sm font-medium">{t.category}{t.description ? ` — ${t.description}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{formatShortDate(t.transaction_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-mono font-semibold ${t.transaction_type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                  {t.transaction_type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                </span>
                <button onClick={() => deleteTxn.mutateAsync(t.id)} className="rounded-md p-1 text-muted-foreground hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
