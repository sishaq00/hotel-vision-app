// Edit an existing reservation — guest, room, dates, pax, rate plan, source, notes.
// Everything is validated and persisted by update_reservation() in PostgreSQL.
import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updateReservationRpc } from "@/lib/reservations-rpc";
import { useHotelStore, type Reservation, computeNights } from "@/store/hotel-store";

const SOURCES = ["walk-in", "phone", "email", "agency", "corporate", "other"];

interface Props {
  reservation: Reservation | null;
  onClose: () => void;
}

export function EditReservationDialog({ reservation, onClose }: Props) {
  const guests = useHotelStore((s) => s.guests);
  const rooms = useHotelStore((s) => s.rooms);
  const ratePlans =
    useHotelStore((s) => (s as unknown as { ratePlans?: { id: string; name: string }[] }).ratePlans) ?? [];

  const [guestId, setGuestId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [pax, setPax] = useState("1");
  const [ratePlanId, setRatePlanId] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("0");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!reservation) return;
    setGuestId(reservation.guestId);
    setRoomId(reservation.roomId);
    setCheckIn(reservation.checkIn);
    setCheckOut(reservation.checkOut);
    setPax(String(reservation.guestsCount ?? 1));
    setRatePlanId(reservation.ratePlanId ?? "");
    setSource(reservation.source ?? "");
    setNotes(reservation.notes ?? "");
    setAmount(String(reservation.totalAmount ?? 0));
  }, [reservation?.id]);

  const nights = useMemo(() => {
    try { return computeNights(checkIn, checkOut); } catch { return 0; }
  }, [checkIn, checkOut]);

  if (!reservation) return null;
  const locked = reservation.status !== "confirmed" && reservation.status !== "checked-in";

  const submit = async () => {
    if (new Date(checkOut) <= new Date(checkIn)) {
      toast.error("Check-out must be after check-in");
      return;
    }
    setBusy(true);
    const res = await updateReservationRpc(reservation.id, {
      guestId,
      roomId,
      checkIn,
      checkOut,
      guestsCount: Number(pax) || 1,
      totalAmount: Number(amount) || 0,
      notes: notes || undefined,
      ratePlanId: ratePlanId || undefined,
      source: source || undefined,
    });
    setBusy(false);
    if (!res.ok) { toast.error("Update failed", { description: res.error }); return; }
    toast.success("Reservation updated");
    onClose();
  };

  return (
    <Dialog open={!!reservation} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Edit reservation</DialogTitle>
          <DialogDescription>
            {reservation.confirmationNumber ?? reservation.id} · {nights} night{nights === 1 ? "" : "s"}
          </DialogDescription>
        </DialogHeader>

        {locked ? (
          <p className="text-sm text-muted-foreground">
            A {reservation.status} reservation can no longer be edited.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Guest</Label>
              <Select value={guestId} onValueChange={setGuestId}>
                <SelectTrigger><SelectValue placeholder="Select guest" /></SelectTrigger>
                <SelectContent>
                  {guests.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Room</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>
                  {rooms.filter((r) => !r.archived).map((r) => (
                    <SelectItem key={r.id} value={r.id}>Room {r.number} · {r.type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pax">Guests</Label>
              <Input id="pax" type="number" min={1} value={pax} onChange={(e) => setPax(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ci">Arrival</Label>
              <Input id="ci" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="co">Departure</Label>
              <Input id="co" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Rate plan</Label>
              <Select value={ratePlanId || "none"} onValueChange={(v) => setRatePlanId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {ratePlans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={source || "none"} onValueChange={(v) => setSource(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="amt">Total amount</Label>
              <Input id="amt" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="res-notes">Notes</Label>
              <Textarea id="res-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Close</Button>
          {!locked && (
            <Button onClick={submit} disabled={busy}>{busy ? "Saving..." : "Save changes"}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
