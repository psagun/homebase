import { api } from "./client";

export interface PaymentConfirmResult {
  status: string;
  message: string;
  next_due_date: string;
  due_date: string;
  source: string;
  recorded_at: string;
}

export type PaymentType = "mortgage" | "insurance" | "tax";

export interface PaymentHistoryItem {
  id: string;
  payment_type: PaymentType;
  property_id: string;
  property_name: string | null;
  source_id: string;
  amount: number | null;
  due_date: string | null;
  next_due_date: string | null;
  confirmed_at: string;
  source: string;
}

export function confirmPayment(
  paymentType: PaymentType,
  sourceId: string,
  dueDate?: string
): Promise<PaymentConfirmResult> {
  const params = new URLSearchParams();
  params.set("payment_type", paymentType);
  params.set("source_id", sourceId);
  if (dueDate) params.set("due_date", dueDate);
  return api.post<PaymentConfirmResult>(`/payments/confirm?${params.toString()}`);
}

export function fetchPaymentHistory(
  propertyId?: string,
  paymentType?: PaymentType
): Promise<PaymentHistoryItem[]> {
  const params = new URLSearchParams();
  if (propertyId) params.set("property_id", propertyId);
  if (paymentType) params.set("payment_type", paymentType);
  const qs = params.toString();
  return api.get<PaymentHistoryItem[]>(`/payments/history${qs ? `?${qs}` : ""}`);
}
