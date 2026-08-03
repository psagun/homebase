import { api } from "./client";

export interface PaymentConfirmResult {
  status: string;
  message: string;
  next_due_date: string;
  due_date: string;
  source: string;
  recorded_at: string;
}

export interface PaymentHistoryItem {
  id: string;
  payment_type: string;
  property_id: string;
  due_date: string | null;
  next_due_date: string | null;
  confirmed_at: string;
  source: string;
}

export function confirmPayment(
  paymentType: "mortgage" | "insurance" | "tax",
  sourceId: string
): Promise<PaymentConfirmResult> {
  return api.post<PaymentConfirmResult>(
    `/payments/confirm?payment_type=${paymentType}&source_id=${sourceId}`
  );
}

export function fetchPaymentHistory(
  propertyId?: string,
  paymentType?: string
): Promise<PaymentHistoryItem[]> {
  const params = new URLSearchParams();
  if (propertyId) params.set("property_id", propertyId);
  if (paymentType) params.set("payment_type", paymentType);
  const qs = params.toString();
  return api.get<PaymentHistoryItem[]>(`/payments/history${qs ? `?${qs}` : ""}`);
}
