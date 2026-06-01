// Watches reservations and automatically awards loyalty points
// when a reservation transitions to checked-out (once per reservation).
import { useEffect } from "react";
import { useHotelStore } from "@/store/hotel-store";
import {
  awardPointsForSpend, isReservationAwarded, markReservationAwarded, loadLoyaltySettings,
} from "@/lib/loyalty";

export function LoyaltyAutoAward() {
  const reservations = useHotelStore((s) => s.reservations);

  useEffect(() => {
    const settings = loadLoyaltySettings();
    if (!settings.enabled) return;
    for (const r of reservations) {
      if (r.status !== "checked-out") continue;
      if (!r.guestId) continue;
      if (isReservationAwarded(r.id)) continue;
      const amount = r.invoice?.total ?? r.totalAmount ?? 0;
      if (amount <= 0) {
        markReservationAwarded(r.id); // don't keep retrying zero invoices
        continue;
      }
      awardPointsForSpend({
        guestId: r.guestId,
        amount,
        reservationId: r.id,
        invoiceNumber: r.invoice?.invoiceNumber,
      });
      markReservationAwarded(r.id);
    }
  }, [reservations]);

  return null;
}
