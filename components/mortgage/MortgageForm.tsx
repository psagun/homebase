"use client";

import { useState, useEffect, type FormEvent } from "react";
import type { MortgageCreateData, MortgageData } from "@/lib/api/mortgage";
import { listContacts } from "@/lib/api/contacts";
import { UserCheck } from "lucide-react";

interface MortgageFormProps {
  initialData?: MortgageData;
  onSubmit: (data: MortgageCreateData) => Promise<void>;
  isLoading: boolean;
  onCancel: () => void;
}

export function MortgageForm({ initialData, onSubmit, isLoading, onCancel }: MortgageFormProps) {
  const [lenderName, setLenderName] = useState(initialData?.lender_name || "");
  const [lenderContacts, setLenderContacts] = useState<{ id: string; name: string; company?: string | null; phone?: string | null; email?: string | null }[]>([]);
  const [suggestions, setSuggestions] = useState<typeof lenderContacts>([]);

  // Load lender contacts for smart suggestions
  useEffect(() => {
    listContacts("Mortgage Lender")
      .then((cs) => setLenderContacts(cs))
      .catch(() => {});
  }, []);

  // Suggest matching lender contacts as the user types
  useEffect(() => {
    const q = lenderName.trim().toLowerCase();
    if (!q || q.length < 2) { setSuggestions([]); return; }
    const matches = lenderContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q)
    ).slice(0, 3);
    setSuggestions(matches);
  }, [lenderName, lenderContacts]);
  const [loanNumber, setLoanNumber] = useState(initialData?.loan_number || "");
  const [loanType, setLoanType] = useState(initialData?.loan_type || "Fixed 30yr");
  const [interestRate, setInterestRate] = useState(initialData?.interest_rate?.toString() || "");
  const [originalAmount, setOriginalAmount] = useState(initialData?.original_amount?.toString() || "");
  const [currentBalance, setCurrentBalance] = useState(initialData?.current_balance?.toString() || "");
  const [monthlyPayment, setMonthlyPayment] = useState(initialData?.monthly_payment?.toString() || "");
  const [loanTermMonths, setLoanTermMonths] = useState(initialData?.loan_term_months?.toString() || "");
  const [startDate, setStartDate] = useState(initialData?.start_date || "");
  const [maturityDate, setMaturityDate] = useState(initialData?.maturity_date || "");
  const [portalUrl, setPortalUrl] = useState(initialData?.portal_url || "");
  const [nextDueDate, setNextDueDate] = useState(initialData?.next_due_date || "");
  const [autopayEnabled, setAutopayEnabled] = useState(initialData?.autopay_enabled || false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!lenderName.trim()) {
      setError("Lender name is required.");
      return;
    }

    const data: MortgageCreateData = {
      lender_name: lenderName.trim(),
      loan_number: loanNumber.trim() || undefined,
      loan_type: loanType,
      interest_rate: interestRate ? Number(interestRate) : null,
      original_amount: originalAmount ? Number(originalAmount) : null,
      current_balance: currentBalance ? Number(currentBalance) : null,
      monthly_payment: monthlyPayment ? Number(monthlyPayment) : null,
      loan_term_months: loanTermMonths ? Number(loanTermMonths) : null,
      portal_url: portalUrl.trim() || undefined,
      start_date: startDate || null,
      maturity_date: maturityDate || null,
      next_due_date: nextDueDate || null,
      autopay_enabled: autopayEnabled,
    };

    try {
      await onSubmit(data);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Failed to save mortgage";
      setError(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Lender Name *</label>
          <input type="text" required value={lenderName} onChange={e => setLenderName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="e.g. Rocket Mortgage" />
          {suggestions.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <UserCheck className="h-3 w-3" /> Lender contacts found — click to use their details
              </p>
              {suggestions.map((c) => (
                <button key={c.id} type="button"
                  onClick={() => {
                    setLenderName(c.name);
                    if (c.company && !portalUrl) {
                      // Best-effort: keep portal URL untouched, just fill the name
                    }
                    setSuggestions([]);
                  }}
                  className="flex w-full items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-left text-sm hover:bg-muted transition-colors">
                  <span className="flex items-center gap-2 min-w-0">
                    <UserCheck className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{c.name}</span>
                    {c.company && <span className="text-xs text-muted-foreground truncate">— {c.company}</span>}
                  </span>
                  {c.phone && <span className="text-xs text-muted-foreground shrink-0">{c.phone}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Loan Number</label>
          <input type="text" value={loanNumber} onChange={e => setLoanNumber(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Loan Type</label>
          <select value={loanType} onChange={e => setLoanType(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none">
            <option>Fixed 30yr</option>
            <option>Fixed 15yr</option>
            <option>ARM 5/1</option>
            <option>ARM 7/1</option>
            <option>Interest Only</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
          <input type="number" step="0.001" value={interestRate} onChange={e => setInterestRate(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="6.5" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Autopay</label>
          <label className="flex items-center gap-2 mt-2">
            <input type="checkbox" checked={autopayEnabled} onChange={e => setAutopayEnabled(e.target.checked)}
              className="rounded border-gray-300" />
            <span className="text-sm">Autopay enabled</span>
          </label>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Portal URL</label>
          <input type="url" value={portalUrl} onChange={e => setPortalUrl(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="https://lenderportal.com/login" />
          <p className="text-xs text-muted-foreground mt-0.5">Link to lender's payment portal for the "Make Payment" shortcut</p>
        </div>
      </div>

      <fieldset className="rounded-md border p-4">
        <legend className="text-sm font-semibold px-2">Financial Details</legend>
        <div className="grid gap-4 md:grid-cols-3 mt-2">
          <div>
            <label className="block text-sm font-medium mb-1">Original Amount ($)</label>
            <input type="number" value={originalAmount} onChange={e => setOriginalAmount(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Current Balance ($)</label>
            <input type="number" value={currentBalance} onChange={e => setCurrentBalance(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Monthly Payment ($)</label>
            <input type="number" value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium mb-1">Loan Term (months)</label>
          <input type="number" value={loanTermMonths} onChange={e => setLoanTermMonths(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="360" />
        </div>
      </fieldset>

      <fieldset className="rounded-md border p-4">
        <legend className="text-sm font-semibold px-2">Important Dates</legend>
        <div className="grid gap-4 md:grid-cols-3 mt-2">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Maturity Date</label>
            <input type="date" value={maturityDate} onChange={e => setMaturityDate(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Next Due Date</label>
            <input type="date" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
        </div>
      </fieldset>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isLoading}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {isLoading ? "Saving..." : initialData ? "Save Changes" : "Add Mortgage"}
        </button>
      </div>
    </form>
  );
}
