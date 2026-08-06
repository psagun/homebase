"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface NotificationItem {
  id: string;
  title: string;
  type: string;
  severity: string;
  link: string;
  read: boolean;
  date: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const r = await fetch("/api/v1/notifications", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load notifications");
      const d = await r.json();
      return {
        notifications: (d.notifications || []) as NotificationItem[],
        unreadCount: d.unread_count || 0,
      };
    },
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await fetch("/api/v1/notifications/read", { method: "POST", credentials: "include" });
    },
    onSuccess: () => {
      qc.setQueryData(["notifications"], (old: { notifications: NotificationItem[]; unreadCount: number } | undefined) =>
        old ? { ...old, unreadCount: 0 } : old
      );
    },
  });
}
