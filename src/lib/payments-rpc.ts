// Payments — database-first action layer.
//
// Cash payments are inserted by the `record_payment_with_audit` SECURITY DEFINER
// RPC so that:
//   * created_by comes from auth.uid() (never from the client),
//   * shift_id is resolved server-side from the open cashier shift,
//   * an audit_log row is always written,
//   * a client-generated idempotency key + UNIQUE index makes double submits safe.
// The local Zustand store is only updated AFTER Postgres accepts the payment.

import { supabase } from "@/integrations/supabase/client";
import { useHotelStore, type Payment, type PaymentMethod, type PaymentStatus } from "@/store/hotel-store";
import { uid } from "@/lib/crypto";

export type PaymentRpcResult =
  | { ok: true; payment: Payment; duplicate: boolean }
  | { ok: false; error: string };

export function newIdempotencyKey(): string {
  return uid();
}

function friendly(message: string): string {
  if (/no_open_shift/i.test(message)) return "No open cashier shift. Open a shift before taking payments.";
  if (/insufficient_privilege|42501/i.test(message)) return "You are not allowed to record payments.";
  if (/idempotency_key_required/i.test(message)) return "Payment reference missing, please retry.";
  if (/invalid_amount/i.test(message)) return "Enter a valid amount greater than zero.";
  if (/Failed to fetch|NetworkError/i.test(message)) return "No connection to the server — payment was not saved.";
  return message;
}

interface RecordPaymentInput {
  reservationId: string;
  amount: number;
  method: PaymentMethod;
  status?: PaymentStatus;
  guestId?: string;
  notes?: string;
  idempotencyKey: string;
  proofPath?: string;
  proofName?: string;
}

export async function recordPayment(input: RecordPaymentInput): Promise<PaymentRpcResult> {
  const store = useHotelStore.getState();
  const openShift = store.shifts.find((s) => s.status === "open");

  const meta = {
    reservationId: input.reservationId,
    method: input.method,
    status: input.status ?? "paid",
    proofPath: input.proofPath ?? null,
    proofName: input.proofName ?? null,
    date: new Date().toISOString().slice(0, 10),
  };

  const call = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;

  const { data, error } = await call("record_payment_with_audit", {
    p_reservation_id: input.reservationId || null,
    p_amount: input.amount,
    p_idempotency_key: input.idempotencyKey,
    p_guest_id: input.guestId ?? null,
    p_method: input.method,
    p_status: input.status ?? "paid",
    p_notes: input.notes ?? null,
    p_shift_id: openShift?.id ?? null,
    p_meta: meta,
  });

  if (error) return { ok: false, error: friendly(error.message) };

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, any> | null;
  if (!row?.id) return { ok: false, error: "Payment was not saved." };

  const payment: Payment = {
    id: row.id,
    reservationId: row.reservation_id ?? input.reservationId,
    amount: Number(row.amount),
    method: (row.method ?? input.method) as PaymentMethod,
    status: (row.status ?? "paid") as PaymentStatus,
    date: String(row.created_at ?? new Date().toISOString()).slice(0, 10),
    proofPath: input.proofPath,
    proofName: input.proofName,
  };

  const already = useHotelStore.getState().payments.some((p) => p.id === payment.id);
  if (!already) {
    useHotelStore.setState((s) => ({ payments: [...s.payments, payment] }));
  }

  return { ok: true, payment, duplicate: already };
}
