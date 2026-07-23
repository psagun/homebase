"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Building2, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/v1/dashboard/summary", { credentials: "include" })
      .then(r => r.json()).then(d => setStats(d)).catch(() => {});
  }, []);

  const reports = [
    { title: "Portfolio Summary", desc: "Total value, equity, and ROI across all properties", icon: <BarChart3 className="h-5 w-5" />, color: "bg-blue-100 text-blue-600", href: "/dashboard" },
    { title: "Property List", desc: "View and manage all properties", icon: <Building2 className="h-5 w-5" />, color: "bg-emerald-100 text-emerald-600", href: "/properties" },
    { title: "Overdue Tasks", desc: "Tasks that need immediate attention", icon: <AlertTriangle className="h-5 w-5" />, color: stats?.overdue_count > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600", href: "/tasks" },
    { title: "Cash Flow", desc: "Income and expenses across all properties", icon: <DollarSign className="h-5 w-5" />, color: "bg-purple-100 text-purple-600", href: "/transactions" },
    { title: "Performance", desc: "ROI and equity growth metrics", icon: <TrendingUp className="h-5 w-5" />, color: "bg-amber-100 text-amber-600", href: "/calendar" },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Reports</h1><p className="text-sm text-muted-foreground mt-1">Portfolio insights and data exports</p></div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">Properties</p><p className="text-2xl font-bold">{stats.total_properties}</p></div>
          <div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">Total Value</p><p className="text-2xl font-bold">{formatCurrency(stats.total_value)}</p></div>
          <div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">Total Equity</p><p className="text-2xl font-bold">{formatCurrency(stats.total_equity)}</p></div>
          <div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">Avg ROI</p><p className="text-2xl font-bold">{stats.average_roi}%</p></div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map(r => (
          <Link key={r.title} href={r.href} className="rounded-lg border bg-card p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-md ${r.color}`}>{r.icon}</div>
              <div><h3 className="font-semibold">{r.title}</h3><p className="text-sm text-muted-foreground">{r.desc}</p></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
