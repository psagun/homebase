"use client";

import { useState } from "react";
import { Plus, Circle, CheckCircle2, Clock, AlertTriangle, Archive } from "lucide-react";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/lib/hooks/useTasks";
import { TaskForm } from "./TaskForm";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { TASK_TYPES, TASK_PRIORITIES } from "@/lib/constants";
import type { TaskCreateData } from "@/lib/api/tasks";

const statusIcons: Record<string, React.ReactNode> = {
  "Overdue": <AlertTriangle className="h-4 w-4 text-red-500" />,
  "Due Today": <Clock className="h-4 w-4 text-amber-500" />,
  "Upcoming": <Circle className="h-4 w-4 text-blue-500" />,
  "Completed": <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
};

const priorityColors: Record<string, string> = {
  Critical: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-blue-100 text-blue-700",
  Low: "bg-gray-100 text-gray-700",
};

export function TaskList({ propertyId }: { propertyId?: string }) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("");
  const { data: tasks, isLoading, isError, refetch } = useTasks(propertyId ? { property_id: propertyId } : { status: filter || undefined });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleCreate = async (data: TaskCreateData) => {
    await createTask.mutateAsync(data);
    setShowForm(false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateTask.mutateAsync({ id, data: { status } });
  };

  if (showForm) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-4">New Task</h3>
        <div className="rounded-lg border bg-card p-6">
          <TaskForm onSubmit={handleCreate} isLoading={createTask.isPending} onCancel={() => setShowForm(false)} />
        </div>
      </div>
    );
  }

  if (isLoading) return <LoadingState text="Loading tasks..." />;
  if (isError) return <ErrorState title="Failed to load tasks" onRetry={() => refetch()} />;

  const overdueCount = tasks?.filter(t => t.status === "Overdue").length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none">
            <option value="">All Tasks</option>
            <option value="Overdue">Overdue {overdueCount > 0 ? `(${overdueCount})` : ""}</option>
            <option value="Due Today">Due Today</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Completed">Completed</option>
          </select>
          {overdueCount > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
              {overdueCount} overdue
            </span>
          )}
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Task
        </button>
      </div>

      {!tasks || tasks.length === 0 ? (
        <EmptyState icon={<CheckCircle2 className="h-16 w-16" />} title="No tasks" description="Create tasks for mortgage payments, insurance renewals, and more." />
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className={`flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors ${task.status === "Overdue" ? "border-red-200 bg-red-50/30" : task.status === "Due Today" ? "border-amber-200 bg-amber-50/30" : ""}`}>
              <button onClick={() => handleStatusChange(task.id, task.status === "Completed" ? "Upcoming" : "Completed")} className="flex-shrink-0">
                {statusIcons[task.status] || <Circle className="h-4 w-4 text-muted-foreground" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.status === "Completed" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {task.property_name && (
                    <span className="text-xs text-muted-foreground/70">{task.property_name}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{task.task_type}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityColors[task.priority] || ""}`}>{task.priority}</span>
                  {task.due_date && (
                    <span className={`text-xs ${task.status === "Overdue" ? "text-red-600 font-medium" : task.status === "Due Today" ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                      {task.due_date}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {task.status !== "Dismissed" && task.status !== "Completed" && (
                  <button onClick={() => handleStatusChange(task.id, "Dismissed")} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" title="Dismiss">
                    <Archive className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => deleteTask.mutateAsync(task.id)} className="rounded-md p-1.5 text-red-400 hover:bg-red-50" title="Delete">
                  <span className="text-xs">✕</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
