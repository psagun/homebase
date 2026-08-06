"use client";

import { useState, useEffect, type FormEvent } from "react";
import { TRANSACTION_CATEGORIES } from "@/lib/constants";
import { createTransaction, updateTransaction, type TransactionCreateData, type TransactionData } from "@/lib/api/transactions";

interface Props {
  propertyId: string;
  onSuccess: () => void;
  /** When provided, the form edits this transaction instead of creating one */
  initialData?: TransactionData | null;
  onCancelEdit?: () => void;
}

export function TransactionForm({ propertyId, onSuccess, initialData, onCancelEdit }: Props) {
  const [txType, setTxType] = useState<"income" | "expense">((initialData?.transaction_type as "income" | "expense") || "income");
  const [category, setCategory] = useState(initialData?.category || "Rent");
  const [amount, setAmount] = useState(initialData?.amount ? String(initialData.amount) : "");
  const [date, setDate] = useState(initialData?.transaction_date || new Date().toISOString().split("T")[0] || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = txType === "income" ? TRANSACTION_CATEGORIES.income : TRANSACTION_CATEGORIES.expense;

  useEffect(() => {
    if (!initialData) setCategory(categories[0] || "Rent");
  }, [txType, initialData]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!amount || Number(amount) <= 0) { setError("Amount must be positive."); return; }
    setLoading(true);
    try {
      const payload = {
        transaction_type: txType, category, amount: Number(amount),
        transaction_date: date, description: description.trim() || undefined,
      };
      if (initialData) {
        await updateTransaction(initialData.id, payload);
      } else {
        await createTransaction(propertyId, payload);
      }
      setAmount(""); setDescription(""); onSuccess();
    } catch (err: unknown) {
      setError(err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Failed to save");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 border rounded-lg bg-card">
      {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setTxType("income")} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${txType === "income" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>Income</button>
        <button type="button" onClick={() => setTxType("expense")} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${txType === "expense" ? "bg-red-600 text-white" : "bg-muted text-muted-foreground"}`}>Expense</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium mb-1 block">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm outline-none">
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Amount ($)</label>
          <input type="number" step="0.01" min="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium mb-1 block">Date</label>
          <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm outline-none" placeholder="Optional" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
          {loading ? (initialData ? "Saving..." : "Adding...") : initialData ? "Save Changes" : "Add Transaction"}
        </button>
        {initialData && onCancelEdit && (
          <button type="button" onClick={onCancelEdit}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
