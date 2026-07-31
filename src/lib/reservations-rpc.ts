// Reservation core — database-first action layer.
//
// Every critical reservation state change (create, update, check-in, check-out,
// cancel) goes through a SECURITY DEFINER PostgreSQL transaction first. The
// local Zustand store is only updated AFTER the database has accepted the
// change, so two devices can never diverge and double bookings are rejected by
// the `reservations_no_double_booking` exclusion constraint.

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

/** Create a reservation in the database, then mirror it locally. */
export async function createReservationRpc(
  input: Omit<Reservation, "id" | "createdAt">,
): Promise<RpcResult<string>> {
  const id = uid();
  const { error } = await supabase.rpc("create_reservation", {
    p_id: id,
    p_guest_id: input.guestId,
    p_room_id: input.roomId,
    p_check_in: input.checkIn,
    p_check_out: input.checkOut,
    p_total_amount: input.totalAmount ?? 0,
    p_notes: input.notes ?? null,
    p_source: (input as { source?: string }).source ?? null,
    p_group_master_id: (input as { groupMasterId?: string }).groupMasterId ?? null,
  });
  if (error) return { ok: false, error: friendly(error) };

  const local = useHotelStore.getState().addReservation({ ...input, id, status: "confirmed" });
  if (!local.ok) return { ok: false, error: local.error };
  return { ok: true, data: id };
}

/** Update dates / room / amount of an active reservation. */
export async function updateReservationRpc(
  id: string,
  patch: { roomId?: string; checkIn?: string; checkOut?: string; totalAmount?: number; notes?: string },
): Promise<RpcResult<null>> {
  const { error } = await supabase.rpc("update_reservation", {
    p_reservation_id: id,
    p_room_id: patch.roomId ?? null,
    p_check_in: patch.checkIn ?? null,
    p_check_out: patch.checkOut ?? null,
    p_total_amount: patch.totalAmount ?? null,
    p_notes: patch.notes ?? null,
  });
  if (error) return { ok: false, error: friendly(error) };

  useHotelStore.setState((s) => ({
    reservations: s.reservations.map((r) =>
      r.id === id
        ? {
            ...r,
            roomId: patch.roomId ?? r.roomId,
            checkIn: patch.checkIn ?? r.checkIn,
            checkOut: patch.checkOut ?? r.checkOut,
            totalAmount: patch.totalAmount ?? r.totalAmount,
            notes: patch.notes ?? r.notes,
          }
        : r,
    ),
  }));
  return { ok: true, data: null };
}

/** Atomic check-in: reservation + room + folio in one transaction. */
export async function checkInReservationRpc(id: string): Promise<RpcResult<null>> {
  const { error } = await supabase.rpc("check_in_reservation", { p_reservation_id: id });
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

  const { error } = await supabase.rpc("check_out_reservation", {
    p_reservation_id: id,
    p_final_amount: total,
    p_invoice: null,
  });
  if (error) return { ok: false, error: friendly(error) };

  const invoice = store.checkOut(id, { ...opts, force: true });
  if (!invoice) return { ok: false, error: "Local invoice generation failed." };
  return { ok: true, data: invoice as InvoiceSnapshot };
}

/** Cancel (or mark no-show) a reservation, freeing the room. */
export async function cancelReservationRpc(
  id: string,
  reason?: string,
  noShow = false,
): Promise<RpcResult<null>> {
  const { error } = await supabase.rpc("cancel_reservation", {
    p_reservation_id: id,
    p_reason: reason ?? null,
    p_no_show: noShow,
  });
  if (error) return { ok: false, error: friendly(error) };
  useHotelStore.getState().cancelReservation(id);
  return { ok: true, data: null };
}
