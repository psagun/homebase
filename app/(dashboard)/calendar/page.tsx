"use client";

import { useState } from "react";
import { CalendarView } from "@/components/calendar/CalendarView";
import { TASK_TYPES } from "@/lib/constants";

export default function CalendarPage() {
  const [filter, setFilter] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">Deadlines across all properties</p>
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none">
          <option value="">All Types</option>
          {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <CalendarView filter={filter} />
    </div>
  );
}
