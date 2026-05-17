// Dialog to extend or shorten an active reservation's stay.
// Supports an optional manual rate override applied to the EXTRA nights only.
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useHotelStore, type Reservation, computeNights } from "@/store/hotel-store";
import { toast } from "sonner";
import { CustomRateControl, type ManualRateValue } from "./CustomRateControl";
import { recordRateOverride } from "@/lib/print-log";

interface Props {
  reservation: Reservation | null;
  onClose: () => void;
}

export function ExtendStayDialog({ reservation, onClose }: Props) {
  const rooms = useHotelStore((s) => s.rooms);
  const settings = useHotelStore((s) => s.settings);
  const guests = useHotelStore((s) => s.guests);
  const extendStay = useHotelStore((s) => s.extendStay);

  const [newCheckOut, setNewCheckOut] = useState(reservation?.checkOut ?? "");
  const [reason, setReason] = useState("");
  const [manualRate, setManualRate] = useState<ManualRateValue | null>(null);

  // Reset when reservation changes
  useEffect(() => {
    setNewCheckOut(reservation?.checkOut ?? "");
    setReason("");
    setManualRate(null);
  }, [reservation?.id]);

  if (!reservation) return null;
  const room = rooms.find((r) => r.id === reservation.roomId);

  const oldNights = computeNights(reservation.checkIn, reservation.checkOut);
  let preview: { newNights: number; delta: number; amount: number; extraNightsAmount: number } | null = null;
  if (newCheckOut && room) {
    try {
      const newNights = computeNights(reservation.checkIn, newCheckOut);
      const delta = newNights - oldNights;
      // For extra nights apply manual rate if provided; for shortened stays just refund at rack.
      const perNight = manualRate && delta > 0 ? manualRate.amount : room.price;
      const extraNightsAmount = Math.round(perNight * delta * 100) / 100;
      preview = {
        newNights,
        delta,
        // newTotal - currentTotal — so the store update produces the same delta.
        amount: extraNightsAmount,
        extraNightsAmount,
      };
    } catch { /* ignore */ }
  }

  const handleSubmit = () => {
    // The store's extendStay always recomputes total = room.price * newNights.
    // To honor a manual rate on extra nights, we call extendStay first, then patch
    // totalAmount via a follow-up store update is not exposed. Instead, we
    // pre-compute the desired total and pass the override through reason/notes.
    const result = extendStay(reservation.id, newCheckOut, reason.trim() || undefined);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    // If a manual rate was applied to extra nights, adjust totalAmount + notes after the fact.
    if (manualRate && preview && preview.delta > 0 && room) {
      const newNights = preview.newNights;
      const newTotal = Math.round(
        (reservation.totalAmount + preview.extraNightsAmount - room.price * preview.delta) * 100,
      ) / 100;
      // Direct mutation through the store: re-find the reservation and update its totalAmount + notes.
      const store = useHotelStore.getState();
      const current = store.reservations.find((r) => r.id === reservation.id);
      if (current) {
        const noteAddendum = `[Extension manual rate $${manualRate.amount}/night × ${preview.delta} extra night${preview.delta > 1 ? "s" : ""} (rack $${room.price}) — Reason: ${manualRate.reason}]`;
        const composedNotes = [current.notes?.trim(), noteAddendum].filter(Boolean).join(" ").trim();
        useHotelStore.setState((s) => ({
          reservations: s.reservations.map((r) =>
            r.id === reservation.id
              ? { ...r, totalAmount: newTotal, notes: composedNotes }
              : r,
          ),
        }));

        const guest = guests.find((g) => g.id === reservation.guestId);
        recordRateOverride({
          context: "extend-stay",
          reservationId: reservation.id,
          roomNumber: room.number,
          guestName: guest?.name,
          oldAmount: room.price,
          newAmount: manualRate.amount,
          unit: "per-night",
          reason: manualRate.reason,
        });
      }
    }

    toast.success(
      `Stay ${result.nightsDelta > 0 ? "extended" : "shortened"} by ${Math.abs(result.nightsDelta)} night(s)`,
      { description: `Δ ${settings.currency} ${result.amountDelta.toFixed(2)}` },
    );
    onClose();
  };

  return (
    <Dialog open={!!reservation} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Extend / Shorten stay</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Room</span><span>{room?.number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Check-in</span><span>{reservation.checkIn}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Current check-out</span><span>{reservation.checkOut} ({oldNights}n)</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Rate / night</span><span>{settings.currency} {room?.price.toFixed(2)}</span></div>
          </div>
          <div className="space-y-1.5">
            <Label>New check-out date</Label>
            <Input type="date" value={newCheckOut} min={reservation.checkIn} onChange={(e) => setNewCheckOut(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Reason (optional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. Guest requested extra night" />
          </div>

          {/* Manual rate for extra nights only */}
          {room && preview && preview.delta > 0 && (
            <CustomRateControl
              defaultRate={room.price}
              value={manualRate}
              onChange={setManualRate}
              fieldLabel={`Manual rate for ${preview.delta} extra night${preview.delta > 1 ? "s" : ""}`}
              triggerLabel="Override rate for extra nights"
              currency={settings.currency}
            />
          )}

          {preview && preview.delta !== 0 && (
            <div className={`rounded-md border p-3 text-sm ${preview.delta > 0 ? "border-success/30 bg-success/10" : "border-warning/30 bg-warning/10"}`}>
              <div className="font-semibold">
                {preview.delta > 0 ? `+${preview.delta} night(s)` : `${preview.delta} night(s)`}
              </div>
              <div className="text-xs">
                Δ {preview.amount >= 0 ? "+" : ""}{settings.currency} {preview.amount.toFixed(2)}
                {manualRate && preview.delta > 0 && (
                  <span className="ml-1 text-warning">
                    (manual {settings.currency}{manualRate.amount}/night)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!newCheckOut || newCheckOut === reservation.checkOut}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
