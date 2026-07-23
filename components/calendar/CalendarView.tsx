"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTasks } from "@/lib/hooks/useTasks";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const typeColors: Record<string, string> = {
  "Mortgage Payment": "bg-blue-100 text-blue-700 border-blue-200",
  "Insurance Renewal": "bg-purple-100 text-purple-700 border-purple-200",
  "Property Tax": "bg-amber-100 text-amber-700 border-amber-200",
  "HOA Payment": "bg-pink-100 text-pink-700 border-pink-200",
  "Rent Collection": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Lease Renewal": "bg-teal-100 text-teal-700 border-teal-200",
  "Maintenance": "bg-orange-100 text-orange-700 border-orange-200",
  "Document Expiration": "bg-red-100 text-red-700 border-red-200",
  "Custom": "bg-gray-100 text-gray-700 border-gray-200",
};

const statusDotColors: Record<string, string> = {
  Overdue: "bg-red-500",
  "Due Today": "bg-amber-500",
  Upcoming: "bg-blue-500",
  Completed: "bg-emerald-500",
};

interface CalendarViewProps {
  filter?: string;
}

export function CalendarView({ filter }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: tasks, isLoading, isError, refetch } = useTasks({ task_type: filter || undefined });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const tasksByDate = useMemo(() => {
    const map: Record<string, typeof tasks> = {};
    if (!tasks) return map;
    for (const task of tasks) {
      if (!task.due_date) continue;
      const dateStr = task.due_date;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr]!.push(task);
    }
    return map;
  }, [tasks]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  if (isLoading) return <LoadingState text="Loading calendar..." />;
  if (isError) return <ErrorState title="Failed to load calendar" onRetry={() => refetch()} />;

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  return (
    <div className="rounded-lg border bg-card">
      {/* Month navigation */}
      <div className="flex items-center justify-between p-4 border-b">
        <button onClick={prevMonth} className="rounded-md p-2 hover:bg-muted transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
        <button onClick={nextMonth} className="rounded-md p-2 hover:bg-muted transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {DAYS.map(d => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="min-h-[100px] border-r border-b last:border-r-0" />;

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayTasks = tasksByDate[dateStr] || [];
          const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

          return (
            <div
              key={dateStr}
              className={`min-h-[100px] border-r border-b last:border-r-0 p-1.5 ${
                isToday ? "bg-primary/5" : ""
              }`}
            >
              <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                isToday ? "bg-primary text-white" : "text-muted-foreground"
              }`}>
                {day}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map(task => (
                  <Link
                    key={task.id}
                    href={task.property_id ? `/properties/${task.property_id}` : "/tasks"}
                    className={`block truncate rounded px-1 py-0.5 text-[10px] font-medium border ${typeColors[task.task_type] || "bg-gray-100 text-gray-700"} hover:opacity-80 transition-opacity`}
                    title={`${task.title} (${task.status})`}
                  >
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${statusDotColors[task.status] || "bg-gray-400"}`} />
                    {task.title}
                  </Link>
                ))}
                {dayTasks.length > 3 && (
                  <p className="text-[10px] text-muted-foreground pl-1">+{dayTasks.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
