"use client";

import { useState, useMemo } from "react";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { usePnl, useCashFlow, useYtd, useAnnual } from "@/lib/hooks/useReports";
import { useProperties } from "@/lib/hooks/useProperties";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Wrench,
  Calendar,
  AlertTriangle,
} from "lucide-react";

type Tab = "pnl" | "cashflow" | "ytd" | "annual";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("pnl");
  const [propertyFilter, setPropertyFilter] = useState("");

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const yearStart = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  }, []);

  const [fromDate, setFromDate] = useState(yearStart);
  const [toDate, setToDate] = useState(today);
  const [annualYear, setAnnualYear] = useState(new Date().getFullYear().toString());

  const { data: properties, isLoading: propsLoading } = useProperties();

  const pid = propertyFilter || undefined;
  const pnlFilter = { from_date: fromDate, to_date: toDate, property_id: pid };
  const cfFilter = { from_date: fromDate, to_date: toDate, property_id: pid };

  const { data: pnl, isLoading: pnlLoading, isError: pnlError, refetch: refetchPnl } = usePnl(pnlFilter);
  const { data: cashFlow, isLoading: cfLoading, isError: cfError, refetch: refetchCf } = useCashFlow(cfFilter);
  const { data: ytd, isLoading: ytdLoading, isError: ytdError, refetch: refetchYtd } = useYtd(pid);
  const { data: annual, isLoading: annualLoading, isError: annualError, refetch: refetchAnnual } = useAnnual(Number(annualYear) || undefined, pid);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "pnl", label: "P&L", icon: <Receipt className="h-4 w-4" /> },
    { id: "cashflow", label: "Cash Flow", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "ytd", label: "YTD", icon: <TrendingUp className="h-4 w-4" /> },
    { id: "annual", label: "Annual", icon: <Calendar className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">P&L, cash flow, and portfolio performance</p>
        </div>

        {/* Property filter */}
        <select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none min-w-[180px]"
          disabled={propsLoading}
        >
          <option value="">All Properties</option>
          {properties?.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "pnl" && (
        <PnlTab
          fromDate={fromDate} toDate={toDate}
          onFromChange={setFromDate} onToChange={setToDate}
          data={pnl} isLoading={pnlLoading} isError={pnlError} onRetry={refetchPnl}
        />
      )}
      {activeTab === "cashflow" && (
        <CashFlowTab
          fromDate={fromDate} toDate={toDate}
          onFromChange={setFromDate} onToChange={setToDate}
          data={cashFlow} isLoading={cfLoading} isError={cfError} onRetry={refetchCf}
        />
      )}
      {activeTab === "ytd" && (
        <YtdTab data={ytd} isLoading={ytdLoading} isError={ytdError} onRetry={refetchYtd} />
      )}
      {activeTab === "annual" && (
        <AnnualTab
          year={annualYear} onYearChange={setAnnualYear}
          data={annual} isLoading={annualLoading} isError={annualError} onRetry={refetchAnnual}
        />
      )}
    </div>
  );
}

/* ─── Date filter bar ─── */

function DateFilterBar({
  fromDate, toDate, onFromChange, onToChange,
}: {
  fromDate: string; toDate: string;
  onFromChange: (v: string) => void; onToChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">From</label>
        <input type="date" value={fromDate} onChange={(e) => onFromChange(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none w-40" />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">To</label>
        <input type="date" value={toDate} onChange={(e) => onToChange(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none w-40" />
      </div>
    </div>
  );
}

/* ─── P&L Tab ─── */

function PnlTab({
  fromDate, toDate, onFromChange, onToChange,
  data, isLoading, isError, onRetry,
}: {
  fromDate: string; toDate: string;
  onFromChange: (v: string) => void; onToChange: (v: string) => void;
  data?: any; isLoading: boolean; isError: boolean; onRetry: () => void;
}) {
  if (isLoading) return <LoadingState text="Loading P&L..." />;
  if (isError) return <ErrorState title="Failed to load P&L" onRetry={onRetry} />;
  if (!data || data.transaction_count === 0) {
    return (
      <div className="space-y-4">
        <DateFilterBar {...{ fromDate, toDate, onFromChange, onToChange }} />
        <EmptyState icon={<Receipt className="h-16 w-16" />} title="No transactions in this period"
          description="Add income or expenses to see your P&L statement." />
      </div>
    );
  }

  const isProfitable = data.gross_profit >= 0;

  return (
    <div className="space-y-4">
      <DateFilterBar {...{ fromDate, toDate, onFromChange, onToChange }} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={<ArrowUpRight className="h-4 w-4" />} bg="#ecfdf5" color="#10b981"
          label="Total Income" value={formatCurrency(data.total_income)} />
        <SummaryCard icon={<ArrowDownRight className="h-4 w-4" />} bg="#fef2f2" color="#ef4444"
          label="Total Expenses" value={formatCurrency(data.total_expenses)} />
        <SummaryCard icon={<PiggyBank className="h-4 w-4" />}
          bg={isProfitable ? "#eef2ff" : "#fef2f2"}
          color={isProfitable ? "#3b82f6" : "#ef4444"}
          label="Net Profit" value={formatCurrency(data.gross_profit)} />
        <SummaryCard icon={<TrendingUp className="h-4 w-4" />}
          bg="#faf5ff" color="#8b5cf6"
          label="Margin" value={`${data.profit_margin_percentage}%`} />
      </div>

      {/* Income / Expense breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CategoryTable title="Income" categories={data.income_by_category} color="#10b981" total={data.total_income} />
        <CategoryTable title="Expenses" categories={data.expense_by_category} color="#ef4444" total={data.total_expenses} />
      </div>

      {/* Maintenance note */}
      {data.maintenance_included && (
        <div className="flex items-center gap-2 rounded-lg border bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <Wrench className="h-4 w-4 shrink-0" />
          <span>Includes <strong>{formatCurrency(data.total_maintenance_cost)}</strong> in maintenance costs from this period.</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground">{data.transaction_count} transactions in this period</p>
    </div>
  );
}

/* ─── Cash Flow Tab ─── */

function CashFlowTab({
  fromDate, toDate, onFromChange, onToChange,
  data, isLoading, isError, onRetry,
}: {
  fromDate: string; toDate: string;
  onFromChange: (v: string) => void; onToChange: (v: string) => void;
  data?: any; isLoading: boolean; isError: boolean; onRetry: () => void;
}) {
  if (isLoading) return <LoadingState text="Loading cash flow..." />;
  if (isError) return <ErrorState title="Failed to load cash flow" onRetry={onRetry} />;
  if (!data || data.months === 0) {
    return (
      <div className="space-y-4">
        <DateFilterBar {...{ fromDate, toDate, onFromChange, onToChange }} />
        <EmptyState icon={<BarChart3 className="h-16 w-16" />} title="No cash flow data"
          description="Add transactions to see monthly cash flow." />
      </div>
    );
  }

  const maxVal = Math.max(...data.monthly.map((m: any) => Math.max(m.income, m.expenses, Math.abs(m.net))), 1);
  const chartHeight = 200;

  return (
    <div className="space-y-4">
      <DateFilterBar {...{ fromDate, toDate, onFromChange, onToChange }} />

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard icon={<ArrowUpRight className="h-4 w-4" />} bg="#ecfdf5" color="#10b981"
          label="Total Income" value={formatCurrency(data.totals.income)} />
        <SummaryCard icon={<ArrowDownRight className="h-4 w-4" />} bg="#fef2f2" color="#ef4444"
          label="Total Expenses" value={formatCurrency(data.totals.expenses)} />
        <SummaryCard icon={<DollarSign className="h-4 w-4" />}
          bg={data.totals.net >= 0 ? "#eef2ff" : "#fef2f2"}
          color={data.totals.net >= 0 ? "#3b82f6" : "#ef4444"}
          label="Net Cash Flow" value={formatCurrency(data.totals.net)} />
      </div>

      {/* Bar chart */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-sm font-semibold mb-4">Monthly Income vs Expenses</h3>
        <svg width="100%" height={chartHeight} viewBox={`0 0 ${Math.max(data.monthly.length * 80, 200)} ${chartHeight}`} className="overflow-visible">
          {data.monthly.map((m: any, i: number) => {
            const x = i * 80 + 10;
            const barW = 24;
            const incH = Math.max((m.income / maxVal) * (chartHeight - 30), 0);
            const expH = Math.max((m.expenses / maxVal) * (chartHeight - 30), 0);
            return (
              <g key={m.month}>
                <rect x={x} y={chartHeight - 25 - incH} width={barW} height={incH} rx={3}
                  fill="#10b981" opacity={0.85}>
                  <title>{m.label}: Income {formatCurrency(m.income)}</title>
                </rect>
                <rect x={x + barW + 4} y={chartHeight - 25 - expH} width={barW} height={expH} rx={3}
                  fill="#ef4444" opacity={0.85}>
                  <title>{m.label}: Expenses {formatCurrency(m.expenses)}</title>
                </rect>
                <text x={x + barW / 2} y={chartHeight - 5} textAnchor="middle"
                  className="text-[10px] fill-muted-foreground">
                  {m.label.split(" ")[0]}
                </text>
              </g>
            );
          })}
          <line x1={0} y1={chartHeight - 25} x2={Math.max(data.monthly.length * 80, 200)} y2={chartHeight - 25}
            stroke="#e8eaed" strokeWidth={1} />
        </svg>
        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-3 w-3 rounded bg-emerald-500" /> Income
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-3 w-3 rounded bg-red-500" /> Expenses
          </div>
        </div>
      </div>

      {/* Monthly table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Month</th>
              <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Income</th>
              <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Expenses</th>
              <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Net</th>
            </tr>
          </thead>
          <tbody>
            {data.monthly.map((m: any) => (
              <tr key={m.month} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-3 text-sm font-medium">{m.label}</td>
                <td className="p-3 text-right text-sm font-mono text-emerald-600">{formatCurrency(m.income)}</td>
                <td className="p-3 text-right text-sm font-mono text-red-600">{formatCurrency(m.expenses)}</td>
                <td className={`p-3 text-right text-sm font-mono font-semibold ${m.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {m.net >= 0 ? "+" : ""}{formatCurrency(m.net)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── YTD Tab ─── */

function YtdTab({
  data, isLoading, isError, onRetry,
}: {
  data?: any; isLoading: boolean; isError: boolean; onRetry: () => void;
}) {
  if (isLoading) return <LoadingState text="Loading YTD report..." />;
  if (isError) return <ErrorState title="Failed to load YTD report" onRetry={onRetry} />;
  if (!data) {
    return <EmptyState icon={<TrendingUp className="h-16 w-16" />} title="No YTD data available" />;
  }

  const { current, prior, change } = data;
  const hasPriorData = prior.income > 0 || prior.expenses > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>Comparing <strong>{data.year}</strong> vs <strong>{data.prior_year}</strong> (YTD)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ComparisonCard
          title="Income"
          current={current.income} prior={prior.income}
          change={change.income}
          format={formatCurrency}
          icon={<ArrowUpRight className="h-5 w-5" />}
          color="#10b981"
          bg="#ecfdf5"
          hasPrior={hasPriorData}
        />
        <ComparisonCard
          title="Expenses"
          current={current.expenses} prior={prior.expenses}
          change={change.expenses}
          format={formatCurrency}
          icon={<ArrowDownRight className="h-5 w-5" />}
          color="#ef4444"
          bg="#fef2f2"
          hasPrior={hasPriorData}
        />
        <ComparisonCard
          title="Net"
          current={current.net} prior={prior.net}
          change={change.net}
          format={formatCurrency}
          icon={<PiggyBank className="h-5 w-5" />}
          color={current.net >= 0 ? "#3b82f6" : "#ef4444"}
          bg={current.net >= 0 ? "#eef2ff" : "#fef2f2"}
          hasPrior={hasPriorData}
        />
      </div>

      {!hasPriorData && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>No transaction data from {data.prior_year} for comparison.</span>
        </div>
      )}
    </div>
  );
}

/* ─── Annual Tab ─── */

function AnnualTab({
  year, onYearChange,
  data, isLoading, isError, onRetry,
}: {
  year: string; onYearChange: (v: string) => void;
  data?: any; isLoading: boolean; isError: boolean; onRetry: () => void;
}) {
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(thisYear - i));

  if (isLoading) return <LoadingState text="Loading annual report..." />;
  if (isError) return <ErrorState title="Failed to load annual report" onRetry={onRetry} />;
  if (!data || data.monthly.every((m: any) => m.transaction_count === 0)) {
    return (
      <div className="space-y-4">
        <YearSelector year={year} years={years} onChange={onYearChange} />
        <EmptyState icon={<Calendar className="h-16 w-16" />} title={`No data for ${year}`}
          description="Add transactions to see annual breakdowns." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <YearSelector year={year} years={years} onChange={onYearChange} />

      {/* Annual summary */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard icon={<ArrowUpRight className="h-4 w-4" />} bg="#ecfdf5" color="#10b981"
          label="Total Income" value={formatCurrency(data.total_income)} />
        <SummaryCard icon={<ArrowDownRight className="h-4 w-4" />} bg="#fef2f2" color="#ef4444"
          label="Total Expenses" value={formatCurrency(data.total_expenses)} />
        <SummaryCard icon={<PiggyBank className="h-4 w-4" />}
          bg={data.net_income >= 0 ? "#eef2ff" : "#fef2f2"}
          color={data.net_income >= 0 ? "#3b82f6" : "#ef4444"}
          label="Net Income" value={formatCurrency(data.net_income)} />
      </div>

      {/* Monthly net chart */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-sm font-semibold mb-4">Monthly Net Income</h3>
        <SparklineChart data={data.monthly} />
      </div>

      {/* Monthly table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Month</th>
              <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Income</th>
              <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Expenses</th>
              <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Net</th>
              <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Txns</th>
            </tr>
          </thead>
          <tbody>
            {data.monthly.map((m: any) => (
              <tr key={m.month} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-3 text-sm font-medium">{m.label}</td>
                <td className="p-3 text-right text-sm font-mono text-emerald-600">{formatCurrency(m.income)}</td>
                <td className="p-3 text-right text-sm font-mono text-red-600">{formatCurrency(m.expenses)}</td>
                <td className={`p-3 text-right text-sm font-mono font-semibold ${m.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {m.net >= 0 ? "+" : ""}{formatCurrency(m.net)}
                </td>
                <td className="p-3 text-right text-sm text-muted-foreground">{m.transaction_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Shared sub-components ─── */

function YearSelector({ year, years, onChange }: { year: string; years: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <select value={year} onChange={(e) => onChange(e.target.value)}
        className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none">
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

function SummaryCard({
  icon, bg, color, label, value,
}: {
  icon: React.ReactNode; bg: string; color: string; label: string; value: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: bg, color }}>
          {icon}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function CategoryTable({
  title, categories, color, total,
}: {
  title: string; categories: { category: string; amount: number }[]; color: string; total: number;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b bg-muted/50 px-4 py-3">
        <h3 className="text-sm font-semibold" style={{ color }}>{title}</h3>
      </div>
      {categories.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">No {title.toLowerCase()}</div>
      ) : (
        <div className="divide-y">
          {categories.map((cat) => {
            const pct = ((cat.amount / total) * 100).toFixed(1);
            return (
              <div key={cat.category} className="flex items-center justify-between px-4 py-2.5">
                <div className="text-sm">{cat.category}</div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono font-semibold">{formatCurrency(cat.amount)}</span>
                  <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between border-t border-dashed px-4 py-2.5 bg-muted/20">
            <span className="text-sm font-semibold">Total {title}</span>
            <span className="text-sm font-mono font-bold">{formatCurrency(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ComparisonCard({
  title, current, prior, change, format, icon, color, bg, hasPrior,
}: {
  title: string; current: number; prior: number; change: { amount: number; percentage: number };
  format: (n: number) => string; icon: React.ReactNode; color: string; bg: string; hasPrior: boolean;
}) {
  const isPositive = change.percentage >= 0;
  const isIncomeOrNet = title === "Income" || title === "Net";
  const isGood = isIncomeOrNet ? isPositive : !isPositive;
  const formattedChange = `${isPositive ? "+" : ""}${change.percentage}%`;

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md" style={{ background: bg, color }}>
          {icon}
        </div>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>

      <p className="text-2xl font-bold">{format(current)}</p>
      <p className="text-xs text-muted-foreground mt-0.5">Current YTD</p>

      {hasPrior && (
        <div className="mt-3 pt-3 border-t border-dashed space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Prior YTD</span>
            <span className="text-sm font-mono">{format(prior)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Change</span>
            <span className={`text-sm font-mono font-semibold ${isGood ? "text-emerald-600" : "text-red-600"}`}>
              {formattedChange}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function SparklineChart({ data }: { data: { label: string; net: number }[] }) {
  const maxVal = Math.max(...data.map((m) => Math.abs(m.net)), 1);
  const width = Math.max(data.length * 60, 200);
  const height = 120;
  const midY = height / 2;
  const barW = 20;
  const barPadding = (60 - barW) / 2;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <line x1={0} y1={midY} x2={width} y2={midY} stroke="#e8eaed" strokeWidth={1} strokeDasharray="4 2" />
      {data.map((m, i) => {
        const x = i * 60 + barPadding;
        const barH = Math.max(Math.abs((m.net / maxVal) * (height / 2 - 10)), 0);
        const y = m.net >= 0 ? midY - barH : midY;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={Math.max(barH, 2)} rx={2}
              fill={m.net >= 0 ? "#10b981" : "#ef4444"} opacity={0.8}>
              <title>{m.label}: {formatCurrency(m.net)}</title>
            </rect>
            <text x={x + barW / 2} y={height - 5} textAnchor="middle" className="text-[9px] fill-muted-foreground">
              {m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
