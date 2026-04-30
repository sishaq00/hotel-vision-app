// Dialog to extend or shorten an active reservation's stay.
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useHotelStore, type Reservation, computeNights } from "@/store/hotel-store";
import { toast } from "sonner";

interface Props {
  reservation: Reservation | null;
  onClose: () => void;
}

export function ExtendStayDialog({ reservation, onClose }: Props) {
  const rooms = useHotelStore((s) => s.rooms);
  const settings = useHotelStore((s) => s.settings);
  const extendStay = useHotelStore((s) => s.extendStay);

  const [newCheckOut, setNewCheckOut] = useState(reservation?.checkOut ?? "");
  const [reason, setReason] = useState("");

  if (!reservation) return null;
  const room = rooms.find((r) => r.id === reservation.roomId);

  const oldNights = computeNights(reservation.checkIn, reservation.checkOut);
  let preview: { newNights: number; delta: number; amount: number } | null = null;
  if (newCheckOut && room) {
    try {
      const newNights = computeNights(reservation.checkIn, newCheckOut);
      preview = {
        newNights,
        delta: newNights - oldNights,
        amount: room.price * newNights - reservation.totalAmount,
      };
    } catch { /* ignore */ }
  }

  const handleSubmit = () => {
    const result = extendStay(reservation.id, newCheckOut, reason.trim() || undefined);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `Stay ${result.nightsDelta > 0 ? "extended" : "shortened"} by ${Math.abs(result.nightsDelta)} night(s)`,
      { description: `Δ ${settings.currency} ${result.amountDelta.toFixed(2)}` },
    );
    onClose();
  };

  return (
    <Dialog open={!!reservation} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
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
          {preview && preview.delta !== 0 && (
            <div className={`rounded-md border p-3 text-sm ${preview.delta > 0 ? "border-success/30 bg-success/10" : "border-warning/30 bg-warning/10"}`}>
              <div className="font-semibold">
                {preview.delta > 0 ? `+${preview.delta} night(s)` : `${preview.delta} night(s)`}
              </div>
              <div className="text-xs">
                New total: {settings.currency} {(reservation.totalAmount + preview.amount).toFixed(2)} · Δ {preview.amount >= 0 ? "+" : ""}{settings.currency} {preview.amount.toFixed(2)}
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
