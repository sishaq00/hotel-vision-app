// Reservation core — database-first action layer.
//
// Every critical reservation state change (create, update, room move, check-in,
// check-out, cancel, no-show) goes through a SECURITY DEFINER PostgreSQL
// transaction first. The local Zustand store is only updated AFTER the database
// has accepted the change, so two devices can never diverge and double bookings
// are rejected by the `reservations_no_double_booking` exclusion constraint.

import { supabase } from "@/integrations/supabase/client";
import { useHotelStore } from "@/store/hotel-store";
import type { InvoiceSnapshot, PaymentMethod, Reservation } from "@/store/hotel-store";
import { uid } from "@/lib/crypto";

export type RpcResult<T> = { ok: true; data: T } | { ok: false; error: string };

function friendly(error: unknown): string {
  const msg =
    typeof error === "object" && error && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  if (/already booked/i.test(msg)) return "Room is already booked for these dates.";
  if (/insufficient_privilege|42501/i.test(msg)) return "You are not allowed to perform this action.";
  if (/archived/i.test(msg)) return "This room is archived and cannot be booked.";
  if (/must be after/i.test(msg)) return "Check-out must be after check-in.";
  if (/does not exist|foreign key/i.test(msg)) return "Room or guest not found in the database.";
  return msg;
}

const rpc = supabase.rpc.bind(supabase) as (fn: string, args?: Record<string, unknown>) => Promise<{ error: unknown }>;

/** Pull the authoritative row back from Postgres and mirror it locally. */
async function refresh(id: string): Promise<void> {
  const { data } = await supabase.from("reservations").select("*").eq("id", id).maybeSingle();
  if (!data) return;
  const row = data as Record<string, any>;
  useHotelStore.setState((s) => ({
    reservations: s.reservations.map((r) =>
      r.id === id
        ? {
            ...r,
            guestId: row.guest_id ?? r.guestId,
            roomId: row.room_id ?? r.roomId,
            checkIn: row.check_in ?? r.checkIn,
            checkOut: row.check_out ?? r.checkOut,
            status: row.status ?? r.status,
            totalAmount: Number(row.total_amount ?? r.totalAmount),
            notes: row.notes ?? undefined,
            source: row.source ?? undefined,
            confirmationNumber: row.confirmation_number ?? r.confirmationNumber,
            guestsCount: row.guests_count ?? r.guestsCount,
            ratePlanId: row.rate_plan_id ?? undefined,
            cancellationReason: row.cancellation_reason ?? undefined,
            cancellationFee: row.cancellation_fee != null ? Number(row.cancellation_fee) : undefined,
            cancelledAt: row.cancelled_at ?? undefined,
            cancelledBy: row.cancelled_by ?? undefined,
            noShow: !!row.no_show,
            noShowAt: row.no_show_at ?? undefined,
          }
        : r,
    ),
  }));
}

/** Create a reservation in the database, then mirror it locally. */
export async function createReservationRpc(
  input: Omit<Reservation, "id" | "createdAt">,
): Promise<RpcResult<string>> {
  const id = uid();
  const { error } = await rpc("create_reservation", {
    p_id: id,
    p_guest_id: input.guestId,
    p_room_id: input.roomId,
    p_check_in: input.checkIn,
    p_check_out: input.checkOut,
    p_total_amount: input.totalAmount ?? 0,
    p_notes: input.notes ?? undefined,
    p_source: input.source ?? undefined,
    p_group_master_id: input.groupMasterId ?? undefined,
  });
  if (error) return { ok: false, error: friendly(error) };

  const local = useHotelStore.getState().addReservation({ ...input, id, status: "confirmed" });
  if (!local.ok) return { ok: false, error: local.error };
  await refresh(id); // picks up the sequential confirmation number
  return { ok: true, data: id };
}

export interface ReservationPatch {
  guestId?: string;
  roomId?: string;
  checkIn?: string;
  checkOut?: string;
  guestsCount?: number;
  totalAmount?: number;
  notes?: string;
  ratePlanId?: string;
  source?: string;
}

/** Update an active reservation (guest, room, dates, pax, notes, rate plan, source). */
export async function updateReservationRpc(
  id: string,
  patch: ReservationPatch,
): Promise<RpcResult<null>> {
  const { error } = await rpc("update_reservation", {
    p_reservation_id: id,
    p_guest_id: patch.guestId ?? undefined,
    p_room_id: patch.roomId ?? undefined,
    p_check_in: patch.checkIn ?? undefined,
    p_check_out: patch.checkOut ?? undefined,
    p_guests_count: patch.guestsCount ?? undefined,
    p_total_amount: patch.totalAmount ?? undefined,
    p_notes: patch.notes ?? undefined,
    p_rate_plan_id: patch.ratePlanId ?? undefined,
    p_source: patch.source ?? undefined,
  });
  if (error) return { ok: false, error: friendly(error) };
  await refresh(id);
  return { ok: true, data: null };
}

/** Move an in-house (or confirmed) guest to another room, with a reason. */
export async function moveReservationRoomRpc(
  id: string,
  newRoomId: string,
  reason: string,
): Promise<RpcResult<null>> {
  const prevRoomId = useHotelStore.getState().reservations.find((r) => r.id === id)?.roomId;
  const { error } = await rpc("move_reservation_room", {
    p_reservation_id: id,
    p_new_room_id: newRoomId,
    p_reason: reason,
  });
  if (error) return { ok: false, error: friendly(error) };

  useHotelStore.setState((s) => ({
    rooms: s.rooms.map((rm) => {
      const res = s.reservations.find((r) => r.id === id);
      if (res?.status !== "checked-in") return rm;
      if (rm.id === prevRoomId) return { ...rm, status: "cleaning" as typeof rm.status };
      if (rm.id === newRoomId) return { ...rm, status: "occupied" as typeof rm.status };
      return rm;
    }),
  }));
  await refresh(id);
  return { ok: true, data: null };
}

/** Atomic check-in: reservation + room + folio in one transaction. */
export async function checkInReservationRpc(id: string): Promise<RpcResult<null>> {
  const { error } = await rpc("check_in_reservation", { p_reservation_id: id });
  if (error) return { ok: false, error: friendly(error) };
  useHotelStore.getState().checkIn(id);
  return { ok: true, data: null };
}

/** Atomic check-out: reservation + folio + room + housekeeping task. */
export async function checkOutReservationRpc(
  id: string,
  opts?: { paymentMethod?: PaymentMethod; markPaid?: boolean; force?: boolean; invoiceNumber?: string },
): Promise<RpcResult<InvoiceSnapshot> | { ok: false; error: string; outstanding?: number }> {
  const store = useHotelStore.getState();
  const res = store.reservations.find((r) => r.id === id);
  if (!res || res.status !== "checked-in") return { ok: false, error: "Reservation is not checked in." };

  const preview = store.previewInvoice(id);
  const { paid } = store.getReservationBalance(id);
  const total = preview?.total ?? res.totalAmount;
  const outstanding = Math.max(0, Number((total - paid).toFixed(2)));
  if (outstanding > 0 && !opts?.markPaid && !opts?.force) {
    return { ok: false, error: "Outstanding balance", outstanding };
  }

  const { error } = await rpc("check_out_reservation", {
    p_reservation_id: id,
    p_final_amount: total,
    p_invoice: undefined,
  });
  if (error) return { ok: false, error: friendly(error) };

  const invoice = store.checkOut(id, { ...opts, force: true });
  if (!invoice) return { ok: false, error: "Local invoice generation failed." };
  return { ok: true, data: invoice as InvoiceSnapshot };
}

/** Cancel a reservation. A reason is mandatory; an optional fee can be charged. */
export async function cancelReservationRpc(
  id: string,
  reason: string,
  fee = 0,
): Promise<RpcResult<null>> {
  if (!reason.trim()) return { ok: false, error: "A cancellation reason is required." };
  const { error } = await rpc("cancel_reservation", {
    p_reservation_id: id,
    p_reason: reason,
    p_fee: fee,
  });
  if (error) return { ok: false, error: friendly(error) };
  useHotelStore.getState().cancelReservation(id);
  await refresh(id);
  return { ok: true, data: null };
}

/** Mark a confirmed reservation as a No Show (distinct from Cancelled). */
export async function markNoShowRpc(
  id: string,
  reason?: string,
  fee = 0,
): Promise<RpcResult<null>> {
  const { error } = await rpc("mark_reservation_no_show", {
    p_reservation_id: id,
    p_reason: reason ?? undefined,
    p_fee: fee,
  });
  if (error) return { ok: false, error: friendly(error) };
  useHotelStore.getState().markNoShow(id);
  await refresh(id);
  return { ok: true, data: null };
}

export interface ReservationEvent {
  id: string;
  reservation_id: string;
  event_type: string;
  details: Record<string, unknown> | null;
  user_id: string | null;
  user_email: string | null;
  created_at: string;
}

/** Full history/timeline of a reservation, straight from Postgres. */
export async function getReservationEvents(id: string): Promise<RpcResult<ReservationEvent[]>> {
  const { data, error } = await (supabase.rpc as any)("get_reservation_events", {
    p_reservation_id: id,
  });
  if (error) return { ok: false, error: friendly(error) };
  return { ok: true, data: (data ?? []) as ReservationEvent[] };
}
