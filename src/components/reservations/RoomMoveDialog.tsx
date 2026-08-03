// Room Move — validates the destination room, updates both room statuses and
// keeps folio/payments/audit intact. Performed atomically by move_reservation_room().
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { moveReservationRoomRpc } from "@/lib/reservations-rpc";
import { useHotelStore, type Reservation } from "@/store/hotel-store";

const REASONS = [
  "Guest request",
  "Maintenance issue",
  "Upgrade",
  "Downgrade",
  "Noise complaint",
  "Housekeeping issue",
  "Other",
];

interface Props {
  reservation: Reservation | null;
  onClose: () => void;
}

export function RoomMoveDialog({ reservation, onClose }: Props) {
  const rooms = useHotelStore((s) => s.rooms);
  const reservations = useHotelStore((s) => s.reservations);

  const [roomId, setRoomId] = useState("");
  const [preset, setPreset] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setRoomId(""); setPreset(""); setReason(""); }, [reservation?.id]);

  if (!reservation) return null;
  const current = rooms.find((r) => r.id === reservation.roomId);

  // Client-side pre-filter; the database still has the final word.
  const candidates = rooms.filter((r) => {
    if (r.archived || r.id === reservation.roomId) return false;
    const clash = reservations.some(
      (x) =>
        x.id !== reservation.id &&
        x.roomId === r.id &&
        (x.status === "confirmed" || x.status === "checked-in") &&
        x.checkIn < reservation.checkOut &&
        reservation.checkIn < x.checkOut,
    );
    return !clash;
  });

  const finalReason = (preset && preset !== "Other" ? preset : reason).trim();

  const submit = async () => {
    if (!roomId) { toast.error("Select a destination room"); return; }
    if (!finalReason) { toast.error("A reason for the room move is required"); return; }
    setBusy(true);
    const res = await moveReservationRoomRpc(reservation.id, roomId, finalReason);
    setBusy(false);
    if (!res.ok) { toast.error("Room move failed", { description: res.error }); return; }
    toast.success("Guest moved to the new room");
    onClose();
  };

  return (
    <Dialog open={!!reservation} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Move room</DialogTitle>
          <DialogDescription>
            Currently in room {current?.number ?? "—"} · {reservation.checkIn} → {reservation.checkOut}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Destination room</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger><SelectValue placeholder="Select an available room" /></SelectTrigger>
              <SelectContent>
                {candidates.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    Room {r.number} · {r.type} · ${r.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {candidates.length === 0 && (
              <p className="text-xs text-muted-foreground">No free rooms for these dates.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Reason <span className="text-destructive">*</span></Label>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <Button
                  key={r}
                  type="button"
                  size="sm"
                  variant={preset === r ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setPreset(preset === r ? "" : r)}
                >
                  {r}
                </Button>
              ))}
            </div>
            {(preset === "Other" || !preset) && (
              <Textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is the guest being moved?"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Moving..." : "Move guest"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
