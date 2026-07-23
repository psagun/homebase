"use client";

import { useState, useEffect, type FormEvent } from "react";
import { TRANSACTION_CATEGORIES } from "@/lib/constants";
import type { TransactionCreateData } from "@/lib/api/transactions";

interface Props {
  propertyId: string;
  onSuccess: () => void;
}

export function TransactionForm({ propertyId, onSuccess }: Props) {
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [category, setCategory] = useState("Rent");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0] || "");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = txType === "income" ? TRANSACTION_CATEGORIES.income : TRANSACTION_CATEGORIES.expense;

  useEffect(() => { setCategory(categories[0] || "Rent"); }, [txType]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!amount || Number(amount) <= 0) { setError("Amount must be positive."); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/properties/${propertyId}/transactions`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_type: txType, category, amount: Number(amount),
          transaction_date: date, description: description.trim() || undefined,
        } as TransactionCreateData),
      });
      if (!res.ok) throw new Error("Failed to save");
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
      <button type="submit" disabled={loading} className="w-full rounded-md bg-primary py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
        {loading ? "Adding..." : "Add Transaction"}
      </button>
    </form>
  );
}
