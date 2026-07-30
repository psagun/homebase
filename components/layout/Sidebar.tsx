"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  CheckSquare,
  Calendar,
  FileText,
  Receipt,
  BarChart3,
  Users,
  Settings,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="h-4 w-4" />,
  Building2: <Building2 className="h-4 w-4" />,
  CheckSquare: <CheckSquare className="h-4 w-4" />,
  Calendar: <Calendar className="h-4 w-4" />,
  FileText: <FileText className="h-4 w-4" />,
  Receipt: <Receipt className="h-4 w-4" />,
  BarChart3: <BarChart3 className="h-4 w-4" />,
  Users: <Users className="h-4 w-4" />,
  Settings: <Settings className="h-4 w-4" />,
};

const NAV_SECTIONS = [
  {
    label: "Main",
    items: ["Dashboard", "Properties", "Tasks & Reminders"],
  },
  {
    label: "Planning",
    items: ["Calendar", "Documents", "Transactions", "Reports"],
  },
  {
    label: "Directory",
    items: ["Contacts"],
  },
];

import { X } from "lucide-react";
import { useAuth } from "@/lib/auth/useAuth";
import { useRouter } from "next/navigation";

interface SidebarProps {
  userName?: string;
  userEmail?: string;
  role?: string;
  onClose?: () => void;
}

const INVESTOR_NAV_SECTIONS = [
  { label: "Main", items: ["Dashboard", "Properties"] },
  { label: "Reports", items: ["Documents", "Reports"] },
  { label: "Account", items: ["Settings"] },
];

export function Sidebar({ userName, userEmail, role, onClose }: SidebarProps) {
  const navSections = role === "investor" ? INVESTOR_NAV_SECTIONS : NAV_SECTIONS;
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [propertyCount, setPropertyCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/v1/dashboard/summary", { credentials: "include" })
      .then(res => res.json())
      .then(data => setPropertyCount(data.total_properties ?? null))
      .catch(() => {});
  }, []);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[240px] flex-col bg-sidebar-bg">
      {/* Brand */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">H</div>
          <span className="text-lg font-semibold text-white">HomeBase</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-md p-1 text-sidebar-text hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">
              {section.label}
            </p>
            {section.items.map((label) => {
              const item = NAV_ITEMS.find((n) => n.label === label);
              if (!item) return null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-primary text-white"
                      : "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active"
                  )}
                >
                  {iconMap[item.icon]}
                  <span>{item.label}</span>
                  {item.label === "Properties" && propertyCount !== null && (
                    <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/70">
                      {propertyCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User card + logout */}
      <div className="border-t border-white/10 p-4 space-y-2">
        <Link href="/settings" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-sidebar-hover transition-colors cursor-pointer">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-sm font-semibold text-white overflow-hidden">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName || "User"}</p>
            <p className="text-xs text-sidebar-text">{userEmail || "Investor"}</p>
          </div>
        </Link>
        <button
          onClick={async () => { await logout(); router.push("/login"); }}
          className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm text-sidebar-text hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
