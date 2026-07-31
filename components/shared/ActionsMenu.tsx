"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

interface ActionsMenuProps {
  actions: MenuAction[];
  /** Accessibility label describing what this menu controls */
  label: string;
  /** Optional align override (defaults to right) */
  align?: "left" | "right";
}

/**
 * A contextual kebab (•••) actions menu.
 *
 * Design notes:
 * - The trigger is a quiet icon button: visible on hover on desktop,
 *   always visible but unobtrusive on touch devices.
 * - Non-destructive actions are grouped at the top; destructive actions
 *   are separated by a divider and use danger styling.
 * - Destructive actions require a confirmation dialog before running.
 * - Fully keyboard accessible: Enter/Space opens, arrows move, Escape closes,
 *   focus returns to the trigger on close.
 */
export function ActionsMenu({ actions, label, align = "right" }: ActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<MenuAction | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const destructive = actions.filter((a) => a.destructive);
  const nonDestructive = actions.filter((a) => !a.destructive);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);

  // Focus first item when opened
  useEffect(() => {
    if (open && itemRefs.current[0]) {
      itemRefs.current[0].focus();
    }
  }, [open]);

  const closeAndRun = (action: MenuAction) => {
    setOpen(false);
    if (action.destructive) {
      setConfirming(action);
    } else {
      action.onClick();
    }
  };

  const runConfirmed = () => {
    const action = confirming;
    setConfirming(null);
    action?.onClick();
  };

  return (
    <div ref={containerRef} className="relative inline-flex" data-actions-menu>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${label} actions`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "rounded-md p-2 text-muted-foreground transition-opacity",
          "hover:bg-muted hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          // Desktop: hidden until card hover or focus; Mobile: always visible
          open
            ? "opacity-100"
            : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:focus-visible:opacity-100"
        )}
        style={{ minWidth: 36, minHeight: 36 }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {/* Menu */}
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={cn(
            "absolute z-50 mt-1 min-w-[180px] rounded-lg border bg-popover p-1 shadow-lg",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {nonDestructive.map((a, i) => (
            <button
              key={a.label}
              ref={(el) => { itemRefs.current[i] = el; }}
              role="menuitem"
              type="button"
              onClick={() => closeAndRun(a)}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-popover-foreground hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
            >
              {a.icon}
              {a.label}
            </button>
          ))}

          {destructive.length > 0 && (
            <>
              <div className="my-1 border-t" role="separator" />
              {destructive.map((a, i) => (
                <button
                  key={a.label}
                  ref={(el) => { itemRefs.current[nonDestructive.length + i] = el; }}
                  role="menuitem"
                  type="button"
                  onClick={() => closeAndRun(a)}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:bg-red-50 dark:hover:bg-red-950/40 dark:focus-visible:bg-red-950/40"
                >
                  {a.icon}
                  {a.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Confirmation dialog for destructive actions */}
      {confirming && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label={`Confirm ${confirming.label.toLowerCase()}`}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirming(null)} />
          {/* Dialog */}
          <div className="relative w-full max-w-sm rounded-xl border bg-popover p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-popover-foreground">
                  {confirming.label}?
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runConfirmed}
                autoFocus
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                {confirming.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
