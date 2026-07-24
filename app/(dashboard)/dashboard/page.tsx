"use client";

import Link from "next/link";
import { useDashboardSummary, useDashboardProperties } from "@/lib/hooks/useDashboard";
import { useRecentlyViewed } from "@/lib/hooks/useRecentlyViewed";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/lib/auth/useAuth";
import { formatCurrency } from "@/lib/utils";
import {
  Home, TrendingUp, DollarSign, Receipt,
  AlertTriangle, Clock, ChevronRight, Bell,
  Landmark, ShieldCheck, Building2, FileText, Wrench, Percent,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  Occupied: "#10b981", Vacant: "#f59e0b", "For Sale": "#3b82f6",
  "Under Maintenance": "#ef4444",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useDashboardSummary();
  const { data: properties, isLoading: propsLoading, isError: propsError, refetch: refetchProps } = useDashboardProperties();
  const { properties: recentViewed, isLoading: recentLoading } = useRecentlyViewed();

  if (statsLoading || propsLoading) return <LoadingState text="Loading portfolio data..." />;
  if (statsError || propsError) return (
    <ErrorState title="Failed to load dashboard" onRetry={() => { refetchStats(); refetchProps(); }} />
  );
  if (!stats || stats.total_properties === 0) return (
    <div>
      <EmptyState icon={<Home className="h-16 w-16" />} title="No properties yet" description="Add your first property to get started."
        action={<Link href="/properties/new" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">+ Add Property</Link>} />
    </div>
  );

  const total = stats.properties_by_status.reduce((s: number, i: any) => s + i.count, 0);
  const hasTransactions = stats.total_monthly_income > 0 || stats.net_monthly_income !== 0;

  const getRI = (type: string, status: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("mortgage")) return { Icon: Landmark, bg: "#eef2ff", color: "#3b82f6" };
    if (t.includes("insurance")) return { Icon: ShieldCheck, bg: "#faf5ff", color: "#9333ea" };
    if (t.includes("tax")) return { Icon: Receipt, bg: "#fefce8", color: "#ca8a04" };
    if (t.includes("hoa")) return { Icon: Building2, bg: "#fdf2f8", color: "#db2777" };
    if (t.includes("rent")) return { Icon: DollarSign, bg: "#ecfdf5", color: "#059669" };
    if (t.includes("lease")) return { Icon: FileText, bg: "#f5f3ff", color: "#7c3aed" };
    if (t.includes("maintenance")) return { Icon: Wrench, bg: "#fff7ed", color: "#ea580c" };
    if (status === "Overdue") return { Icon: AlertTriangle, bg: "#fef2f2", color: "#dc2626" };
    if (status === "Due Today") return { Icon: Clock, bg: "#fffbeb", color: "#d97706" };
    return { Icon: Bell, bg: "#eef2ff", color: "#3b82f6" };
  };

  return (
    <div className="space-y-4 w-full">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-[#1a1d2b]">Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋</h1>
        <p className="text-sm text-[#8b8fa3] mt-0.5">Here&apos;s what&apos;s happening with your properties.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <SumCard icon={<Home className="h-4 w-4" />} bg="#eef2ff" color="#3b82f6" label="Total Properties" value={String(stats.total_properties)} sub={`${stats.occupancy_rate}% occupied`} subColor="#10b981" />
        <SumCard icon={<DollarSign className="h-4 w-4" />} bg="#ecfdf5" color="#10b981" label="Total Value" value={formatCurrency(stats.total_value)} sub={`${stats.value_change_percentage >= 0 ? "+" : ""}${stats.value_change_percentage}%`} subColor="#10b981" />
        <SumCard icon={<TrendingUp className="h-4 w-4" />} bg="#faf5ff" color="#8b5cf6" label="Total Equity" value={formatCurrency(stats.total_equity)} sub={`${stats.total_equity >= 0 ? "+" : "-"}$${Math.abs(stats.total_equity).toLocaleString()}`} subColor="#10b981" />
        <SumCard icon={<Receipt className="h-4 w-4" />} bg="#fff7ed" color="#f97316" label="Monthly Rent" value={hasTransactions ? formatCurrency(stats.total_monthly_income) : "—"} sub={hasTransactions ? "+12% from last month" : "No data yet"} subColor={hasTransactions ? "#10b981" : "#8b8fa3"} />
        <SumCard icon={<TrendingUp className="h-4 w-4" />} bg="#eef2ff" color="#3b82f6" label="Cash Flow (MTD)" value={hasTransactions ? formatCurrency(stats.net_monthly_income) : "—"} sub={hasTransactions ? "Track your income" : "Add transactions"} subColor="#8b8fa3" />
      </div>

      {/* 3-column row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* UPCOMING REMINDERS */}
        <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm flex flex-col">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#e8eaed]">
            <h2 className="text-sm font-semibold text-[#1a1d2b]">Upcoming Reminders</h2>
            <Link href="/tasks" className="text-xs text-[#3b82f6] font-medium hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-[#e8eaed]">
            {stats.reminders && stats.reminders.length > 0 ? (
              stats.reminders.slice(0, 5).map((r: any) => {
                const dd = r.due_date ? new Date(r.due_date) : null;
                const td = new Date(); td.setHours(0, 0, 0, 0);
                let rel = "", diff = 0;
                if (dd) { diff = Math.ceil((dd.getTime() - td.getTime()) / 86400000); if (diff < 0) rel = `Overdue by ${Math.abs(diff)}d`; else if (diff === 0) rel = "Due today"; else rel = `Due in ${diff}d`; }
                const relCls = diff < 0 ? "text-red-500" : diff === 0 ? "text-amber-600" : diff <= 3 ? "text-orange-500" : diff <= 7 ? "text-blue-500" : "text-gray-400";
                const { Icon, bg, color } = getRI(r.task_type, r.status);
                return (
                  <Link key={r.id} href={r.property_id ? `/properties/${r.property_id}` : "/tasks"}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-[#f8f9fc] transition-colors group">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: bg, color }}><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#1a1d2b] line-clamp-2 group-hover:text-[#3b82f6] transition-colors">{r.title}</p>
                      <p className="text-xs text-[#8b8fa3]">{r.task_type}</p>
                      {r.property_name && (
                        <p className="text-[10px] text-[#8b8fa3]/70 mt-0.5">{r.property_name}</p>
                      )}
                    </div>
                    <span className={`shrink-0 whitespace-nowrap text-xs font-semibold ${relCls}`}>{rel}</span>
                    <ChevronRight className="h-4 w-4 text-[#c4c6d0] group-hover:text-[#3b82f6] transition-colors shrink-0" />
                  </Link>
                );
              })
            ) : <div className="py-10 text-center text-sm text-[#8b8fa3]">All caught up!</div>}
          </div>
        </div>

        {/* CASH FLOW THIS MONTH */}
        <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#1a1d2b]">Cash Flow This Month</h2>
            <Link href="/transactions" className="text-xs text-[#3b82f6] font-medium hover:underline">View report</Link>
          </div>
          {hasTransactions ? (
            <>
              <p className="text-3xl font-bold text-[#1a1d2b]">{formatCurrency(stats.net_monthly_income)}</p>
              <p className="text-xs text-[#8b8fa3] mt-0.5 mb-3">Net cash flow across all properties</p>
              <div className="flex-1 min-h-[120px]">
                <svg viewBox="0 0 320 110" className="w-full h-full overflow-visible" preserveAspectRatio="xMidYMid meet">
                  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.01} /></linearGradient></defs>
                  {[85, 60, 35, 10].map((y, i) => (<g key={y}><line x1="0" y1={y} x2="310" y2={y} stroke="#e8eaed" strokeWidth="0.5" /><text x="-4" y={y+2} textAnchor="end" className="text-[7px]" fill="#8b8fa3">{["$15k","$10k","$5k","$0"][i]}</text></g>))}
                  <polygon points="0,90 10,75 50,55 90,65 130,40 170,45 210,27 250,37 290,19 310,23 310,110 0,110" fill="url(#g)" />
                  <polyline points="10,75 50,55 90,65 130,40 170,45 210,27 250,37 290,19 310,23" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  {[[10,75],[50,55],[90,65],[130,40],[170,45],[210,27],[250,37],[290,19],[310,23]].map(([x,y],i) => <circle key={i} cx={x} cy={y} r="2" fill="white" stroke="#3b82f6" strokeWidth="1.2" />)}
                  {["Jun 1","Jun 8","Jun 15","Jun 22","Jun 29"].map((l,i) => <text key={i} x={30+i*70} y="106" textAnchor="middle" className="text-[7px]" fill="#8b8fa3">{l}</text>)}
                </svg>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-[#8b8fa3]">Add transactions to see cash flow</p>
            </div>
          )}
        </div>

        {/* PROPERTIES BY STATUS */}
        <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-5 flex flex-col">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-[#1a1d2b]">Properties by Status</h2>
          </div>
          {stats.properties_by_status.length > 0 ? (
            <div className="flex items-center gap-5 flex-1">
              <div className="w-[120px] h-[120px] shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle r="13" cx="18" cy="18" fill="none" stroke="#e8eaed" strokeWidth="6" />
                  {(() => { let o = 0; return stats.properties_by_status.map((item: any) => { const p = item.count / total; const c = 2*Math.PI*13; const l = c*p; const e = <circle key={item.status} r="13" cx="18" cy="18" fill="none" stroke={STATUS_COLORS[item.status]||"#6b7280"} strokeWidth="6" strokeDasharray={`${l} ${c-l}`} strokeDashoffset={-o} />; o += l; return e; }); })()}
                </svg>
              </div>
              <div className="flex-1 space-y-3 min-w-0">
                {stats.properties_by_status.map((item: any) => (
                  <div key={item.status} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.status] || "#6b7280" }} />
                    <span className="text-sm text-[#1a1d2b] flex-1">{item.status}</span>
                    <span className="text-sm font-semibold text-[#1a1d2b] tabular-nums">{item.count}</span>
                    <span className="text-xs text-[#8b8fa3] w-9 text-right">({((item.count/total)*100).toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="py-8 text-center text-sm text-[#8b8fa3]">No data</div>}
        </div>
      </div>

      {/* Recently Viewed Properties — merge viewed + API, always 5, ordered by most recent first */}
      {(() => {
        // Merge recently viewed + API recent, dedupe by id, take 5
        const merged: any[] = [];
        const seen = new Set<string>();
        for (const p of recentViewed) {
          if (!seen.has(p.id)) { merged.push(p); seen.add(p.id); }
        }
        if (merged.length < 5) {
          for (const p of (stats.recent_properties || [])) {
            if (merged.length >= 5) break;
            if (!seen.has(p.id)) { merged.push(p); seen.add(p.id); }
          }
        }
        const display = merged.slice(0, 5);
        if (display.length === 0) return null;
        return (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#1a1d2b]">
              {recentViewed.length > 0 ? "Recently Viewed" : "Recent Properties"}
            </h2>
            <Link href="/properties" className="text-xs text-[#3b82f6] font-medium hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {display.map((p: any, idx: number) => {
              const type = (p.property_type || "").toLowerCase();
              let buildingSvg = null;
              let skyGrad = "from-sky-300 to-blue-400";
              if (type.includes("single") || type.includes("house")) {
                skyGrad = "from-sky-300 via-blue-300 to-blue-400";
                buildingSvg = (<svg viewBox="0 0 400 150" className="absolute bottom-0 left-0 w-full" preserveAspectRatio="none"><rect x="120" y="38" width="160" height="115" fill="#fff" rx="3" opacity="0.95"/><polygon points="100,45 200,10 300,45" fill="#e74c3c" opacity="0.95"/><rect x="135" y="55" width="35" height="35" fill="#87ceeb" opacity="0.7" rx="1"/><rect x="185" y="55" width="35" height="35" fill="#87ceeb" opacity="0.7" rx="1"/><rect x="235" y="55" width="35" height="35" fill="#87ceeb" opacity="0.7" rx="1"/><rect x="180" y="110" width="40" height="45" fill="#5c4033" rx="2"/><circle cx="88" cy="65" r="28" fill="#4ade80" opacity="0.7"/><circle cx="310" cy="90" r="22" fill="#4ade80" opacity="0.6"/></svg>);
              } else if (type.includes("commercial") || type.includes("office") || type.includes("retail")) {
                skyGrad = "from-slate-300 to-blue-500";
                buildingSvg = (<svg viewBox="0 0 400 150" className="absolute bottom-0 left-0 w-full" preserveAspectRatio="none"><rect x="60" y="10" width="280" height="142" fill="#d1d5db" opacity="0.95" rx="2"/><rect x="75" y="15" width="50" height="35" fill="#60a5fa" opacity="0.6"/><rect x="140" y="15" width="50" height="35" fill="#60a5fa" opacity="0.6"/><rect x="205" y="15" width="50" height="35" fill="#60a5fa" opacity="0.6"/><rect x="270" y="15" width="50" height="35" fill="#60a5fa" opacity="0.6"/><rect x="75" y="60" width="50" height="35" fill="#60a5fa" opacity="0.6"/><rect x="140" y="60" width="50" height="35" fill="#60a5fa" opacity="0.6"/><rect x="205" y="60" width="50" height="35" fill="#60a5fa" opacity="0.6"/><rect x="270" y="60" width="50" height="35" fill="#60a5fa" opacity="0.6"/><rect x="145" y="110" width="40" height="45" fill="#374151" rx="2"/></svg>);
              } else if (type.includes("land") || type.includes("ranch")) {
                skyGrad = "from-amber-200 to-sky-300";
                buildingSvg = (<svg viewBox="0 0 400 150" className="absolute bottom-0 left-0 w-full" preserveAspectRatio="none"><ellipse cx="200" cy="160" rx="280" ry="60" fill="#4ade80" opacity="0.5"/><circle cx="80" cy="100" r="35" fill="#4ade80" opacity="0.6"/><circle cx="320" cy="95" r="30" fill="#4ade80" opacity="0.5"/><rect x="170" y="65" width="60" height="88" fill="#fef3c7" opacity="0.9" rx="2"/><polygon points="160,72 200,45 240,72" fill="#92400e" opacity="0.85"/><rect x="190" y="120" width="20" height="35" fill="#78350f" rx="1"/></svg>);
              } else if (type.includes("multi") || type.includes("townhome") || type.includes("apartment")) {
                skyGrad = "from-blue-200 to-indigo-300";
                buildingSvg = (<svg viewBox="0 0 400 150" className="absolute bottom-0 left-0 w-full" preserveAspectRatio="none"><rect x="80" y="45" width="60" height="108" fill="#f1f5f9" opacity="0.95" rx="2"/><rect x="145" y="25" width="60" height="128" fill="#e2e8f0" opacity="0.95" rx="2"/><rect x="210" y="35" width="60" height="118" fill="#f1f5f9" opacity="0.95" rx="2"/><rect x="275" y="50" width="60" height="103" fill="#e2e8f0" opacity="0.95" rx="2"/><circle cx="85" cy="75" r="22" fill="#4ade80" opacity="0.5"/><circle cx="320" cy="85" r="18" fill="#4ade80" opacity="0.4"/></svg>);
              } else {
                skyGrad = "from-sky-300 to-blue-400";
                buildingSvg = (<svg viewBox="0 0 400 150" className="absolute bottom-0 left-0 w-full" preserveAspectRatio="none"><rect x="130" y="40" width="140" height="113" fill="#fff" opacity="0.95" rx="2"/><polygon points="110,47 200,15 290,47" fill="#64748b" opacity="0.9"/><rect x="145" y="57" width="30" height="30" fill="#87ceeb" opacity="0.6" rx="1"/><rect x="190" y="57" width="30" height="30" fill="#87ceeb" opacity="0.6" rx="1"/><rect x="235" y="57" width="30" height="30" fill="#87ceeb" opacity="0.6" rx="1"/><rect x="190" y="108" width="35" height="47" fill="#78350f" rx="1"/></svg>);
              }
              return (
                <Link key={p.id} href={`/properties/${p.id}`}
                  className="group bg-white rounded-xl border border-[#e8eaed] shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                  <div className={`h-28 relative overflow-hidden bg-gradient-to-br ${skyGrad}`}>
                    {buildingSvg}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                    <span className="absolute bottom-2 left-3 text-sm font-bold text-white drop-shadow-lg">{formatCurrency(p.current_value)}</span>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-[#1a1d2b] line-clamp-1 group-hover:text-[#3b82f6] transition-colors">{p.name}</p>
                    <p className="text-xs text-[#8b8fa3] truncate">{p.city}, {p.state}</p>
                    <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      p.status === "Occupied" ? "bg-emerald-50 text-emerald-700" :
                      p.status === "Vacant" ? "bg-amber-50 text-amber-700" :
                      p.status === "For Sale" ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"
                    }`}>{p.status}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ); })()}
    </div>
  );
}

function SumCard({ icon, bg, color, label, value, sub, subColor }: {
  icon: React.ReactNode; bg: string; color: string; label: string; value: string; sub: string; subColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-3 md:p-4 flex items-center gap-3 md:gap-4">
      <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: bg, color }}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[#8b8fa3] uppercase tracking-wide">{label}</p>
        <p className="text-sm md:text-lg font-bold text-[#1a1d2b] mt-0.5">{value}</p>
        <p className="text-xs font-medium mt-0.5" style={{ color: subColor }}>{sub}</p>
      </div>
    </div>
  );
}
