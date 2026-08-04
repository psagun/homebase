import { api } from "./client";

export interface TransactionData {
  id: string;
  property_id: string;
  user_id: string;
  transaction_type: string;
  category: string;
  amount: number;
  transaction_date: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashFlowData {
  total_income: number;
  total_expenses: number;
  net_cash_flow: number;
  income_by_category: { category: string; amount: number }[];
  expense_by_category: { category: string; amount: number }[];
  transaction_count: number;
}

export interface TransactionCreateData {
  transaction_type: string;
  category: string;
  amount: number;
  transaction_date: string;
  description?: string;
}

export function listTransactions(propertyId: string): Promise<TransactionData[]> {
  return api.get(`/properties/${propertyId}/transactions`);
}

export function getCashFlow(propertyId: string, year?: number): Promise<CashFlowData> {
  const params = year ? `?year=${year}` : "";
  return api.get(`/properties/${propertyId}/transactions/cash-flow${params}`);
}

export function createTransaction(propertyId: string, data: TransactionCreateData): Promise<TransactionData> {
  return api.post(`/properties/${propertyId}/transactions`, data);
}

export function deleteTransaction(txnId: string): Promise<void> {
  return api.delete(`/transactions/${txnId}`);
}

export function updateTransaction(txnId: string, data: Partial<TransactionCreateData>): Promise<TransactionData> {
  return api.patch(`/transactions/${txnId}`, data);
}
