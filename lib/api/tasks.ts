import { api } from "./client";

export interface TaskData {
  id: string;
  property_id?: string | null;
  user_id: string;
  title: string;
  description?: string | null;
  task_type: string;
  due_date?: string | null;
  priority: string;
  status: string;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCreateData {
  title: string;
  description?: string;
  property_id?: string;
  task_type?: string;
  due_date?: string | null;
  priority?: string;
}

export interface TaskUpdateData {
  title?: string;
  description?: string | null;
  property_id?: string | null;
  task_type?: string;
  due_date?: string | null;
  priority?: string;
  status?: string;
}

export function listTasks(params?: { status?: string; task_type?: string; priority?: string; property_id?: string; search?: string }): Promise<TaskData[]> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.task_type) sp.set("task_type", params.task_type);
  if (params?.priority) sp.set("priority", params.priority);
  if (params?.property_id) sp.set("property_id", params.property_id);
  if (params?.search) sp.set("search", params.search);
  const qs = sp.toString();
  return api.get(`/tasks/${qs ? `?${qs}` : ""}`);
}

export function createTask(data: TaskCreateData): Promise<TaskData> {
  return api.post("/tasks/", data);
}

export function updateTask(id: string, data: TaskUpdateData): Promise<TaskData> {
  return api.patch(`/tasks/${id}`, data);
}

export function deleteTask(id: string): Promise<void> {
  return api.delete(`/tasks/${id}`);
}
