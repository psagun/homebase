"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Search, Bell, Plus, Menu, AlertTriangle, Clock, Info, X, Sun, Moon } from "lucide-react";
import { capitalize } from "@/lib/utils";
import { useNotifications, useMarkNotificationsRead } from "@/lib/hooks/useNotifications";

type Notification = {
  id: string; title: string; type: string; severity: string;
  link: string; read: boolean; date: string;
};

interface HeaderProps { onMenuClick?: () => void; }

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Friendly title: if the last segment looks like a UUID, find a meaningful segment.
  // For /properties/<uuid> → "Property Details", /properties/<uuid>/mortgage → "Mortgage", etc.
  const raw = segments[segments.length - 1] || "";
  const isUuid = /^[0-9a-f-]{36}$/i.test(raw) || /^[0-9a-f]{32}$/i.test(raw);
  const title = isUuid
    ? segments.length >= 4
      ? capitalize(segments[segments.length - 2]!.replace(/-/g, " "))
      : "Property Details"
    : segments.length > 0
      ? capitalize(raw.replace(/-/g, " "))
      : "Dashboard";
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: notifData } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { theme, setTheme } = useTheme();

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const severityIcon = (sev: string) => {
    if (sev === "error") return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (sev === "warning") return <Clock className="h-4 w-4 text-amber-500" />;
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-3 md:px-6 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={onMenuClick} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base md:text-xl font-bold tracking-tight truncate">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            aria-label="Notifications"
            onClick={() => {
              setNotifOpen(!notifOpen);
              if (!notifOpen) markRead.mutate();
            }}
            className="relative rounded-md border p-2 text-muted-foreground hover:bg-muted transition-colors">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-lg border bg-card shadow-lg z-50 max-h-[70vh] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="text-sm font-semibold">Notifications</h3>
                {unreadCount > 0 && <span className="text-xs text-muted-foreground">{unreadCount} unread</span>}
              </div>
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications</div>
                ) : (
                  notifications.map(n => (
                    <Link key={n.id} href={n.link} onClick={() => setNotifOpen(false)}
                      className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors ${!n.read ? "bg-muted/20" : ""}`}>
                      <div className="mt-0.5 flex-shrink-0">{severityIcon(n.severity)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.date}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <Link href="/tasks" onClick={() => setNotifOpen(false)}
                  className="block px-4 py-2.5 text-center text-sm text-primary border-t hover:bg-muted/50">
                  View all
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button onClick={toggleTheme}
          className="rounded-md border p-2 text-muted-foreground hover:bg-muted transition-colors"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <Link href="/properties/new" className="hidden md:flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Add Property
        </Link>
      </div>
    </header>
  );
}
