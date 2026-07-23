"use client";

import { TaskList } from "@/components/tasks/TaskList";

export default function TasksPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tasks & Reminders</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage deadlines, renewals, and to-dos across your portfolio.</p>
      </div>
      <TaskList />
    </div>
  );
}
