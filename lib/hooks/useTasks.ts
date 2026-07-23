"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTasks, createTask, updateTask, deleteTask, type TaskCreateData, type TaskUpdateData } from "@/lib/api/tasks";

export function useTasks(params?: { status?: string; task_type?: string; priority?: string; property_id?: string; search?: string }) {
  return useQuery({ queryKey: ["tasks", params], queryFn: () => listTasks(params) });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TaskCreateData) => createTask(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskUpdateData }) => updateTask(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
