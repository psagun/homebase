import { api } from "./client";

export interface ReminderItem {
  id: string;
  title: string;
  task_type: string;
  due_date?: string | null;
  priority: string;
  status: string;
  property_id?: string | null;
}

export interface DashboardSummary {
  total_properties: number;
  total_value: number;
  total_equity: number;
  total_monthly_income: number;
  total_monthly_expenses: number;
  net_monthly_income: number;
  average_roi: number;
  occupancy_rate: number;
  value_change_percentage: number;
  occupied_count: number;
  vacant_count: number;
  total_purchase_price: number;
  properties_by_status: { status: string; count: number }[];
  value_by_type: { type: string; value: number }[];
  recent_properties: RecentProperty[];
  reminders: ReminderItem[];
  overdue_count: number;
  due_today_count: number;
  mortgage_count: number;
  total_monthly_mortgage_payment: number;
  next_insurance_renewal: string | null;
}

export interface RecentProperty {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string;
  property_type: string;
  current_value: number;
}

export interface PropertyRow {
  id: string;
  name: string;
  address_line_1: string;
  city: string;
  state: string;
  property_type: string;
  status: string;
  current_value: number;
  purchase_price: number;
  equity_change_percentage: number;
  bedrooms: number | null;
  bathrooms: number | null;
  year_built: number | null;
}

export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return api.get<DashboardSummary>("/dashboard/summary");
}

export function fetchDashboardProperties(): Promise<PropertyRow[]> {
  return api.get<PropertyRow[]>("/dashboard/properties");
}
