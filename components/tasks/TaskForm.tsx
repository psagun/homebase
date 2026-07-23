"use client";

import { useState, type FormEvent } from "react";
import { TASK_TYPES, TASK_PRIORITIES } from "@/lib/constants";
import type { TaskCreateData, TaskData } from "@/lib/api/tasks";

interface Props {
  initialData?: TaskData;
  onSubmit: (data: TaskCreateData) => Promise<void>;
  isLoading: boolean;
  onCancel: () => void;
}

export function TaskForm({ initialData, onSubmit, isLoading, onCancel }: Props) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [taskType, setTaskType] = useState(initialData?.task_type || "Custom");
  const [priority, setPriority] = useState(initialData?.priority || "Medium");
  const [dueDate, setDueDate] = useState(initialData?.due_date || "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError("Title is required."); return; }
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        task_type: taskType,
        priority,
        due_date: dueDate || null,
      });
    } catch (err: unknown) {
      setError(err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Failed to save");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div>
        <label className="block text-sm font-medium mb-1">Title *</label>
        <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="e.g. Pay mortgage for Sunset Villa" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select value={taskType} onChange={e => setTaskType(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none">
            {TASK_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Priority</label>
          <select value={priority} onChange={e => setPriority(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none">
            {TASK_PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Due Date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
          className="w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
        <button type="submit" disabled={isLoading}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
          {isLoading ? "Saving..." : initialData ? "Save" : "Create Task"}
        </button>
      </div>
    </form>
  );
}
