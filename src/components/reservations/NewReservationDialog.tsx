// New reservation dialog with overlap validation
import { useState } from "react";
import { Plus } from "lucide-react";
import { useHotelStore } from "@/store/hotel-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface NewReservationDialogProps {
  trigger?: React.ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NewReservationDialog({
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: NewReservationDialogProps) {
  const [openInner, setOpenInner] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openInner;
  const setOpen = (v: boolean) => {
    if (isControlled) onOpenChangeProp?.(v);
    else setOpenInner(v);
  };

  // form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [existingGuestId, setExistingGuestId] = useState<string>("__new__");
  const [roomId, setRoomId] = useState<string>("");
  const [checkIn, setCheckIn] = useState(new Date().toISOString().slice(0, 10));
  const [checkOut, setCheckOut] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  );

  const guests = useHotelStore((s) => s.guests);
  const rooms = useHotelStore((s) => s.rooms);
  const reservations = useHotelStore((s) => s.reservations);
  const addGuest = useHotelStore((s) => s.addGuest);
  const addReservation = useHotelStore((s) => s.addReservation);
  const hasRoomConflict = useHotelStore((s) => s.hasRoomConflict);

  // Rooms not in maintenance can be booked for future dates even if currently occupied
  const bookableRooms = rooms.filter((r) => r.status !== "maintenance");

  const datesValid =
    !!checkIn &&
    !!checkOut &&
    new Date(checkOut).getTime() > new Date(checkIn).getTime();

  const conflict =
    roomId && datesValid
      ? hasRoomConflict(roomId, checkIn, checkOut)
      : null;

  const conflictGuestName = conflict
    ? guests.find((g) => g.id === conflict.guestId)?.name ?? "another guest"
    : null;

  const reset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setCountry("");
    setExistingGuestId("__new__");
    setRoomId("");
    setCheckIn(new Date().toISOString().slice(0, 10));
    setCheckOut(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) {
      toast.error("Please select a room");
      return;
    }
    if (!datesValid) {
      toast.error("Check-out must be after check-in");
      return;
    }

    const nights = Math.max(
      1,
      Math.ceil(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000,
      ),
    );
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    let guestId = existingGuestId;
    if (existingGuestId === "__new__") {
      if (!name.trim()) {
        toast.error("Guest name is required");
        return;
      }
      guestId = addGuest({ name, email, phone, country });
    }

    const result = addReservation({
      guestId,
      roomId,
      checkIn,
      checkOut,
      status: "confirmed",
      totalAmount: room.price * nights,
    });

    if (!result.ok) {
      toast.error("Cannot create reservation", { description: result.error });
      return;
    }

    toast.success("Reservation created", {
      description: `${nights} night${nights > 1 ? "s" : ""} · Room ${room.number}`,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2 shadow-md">
            <Plus className="h-4 w-4" />
            New Reservation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>New Reservation</DialogTitle>
          <DialogDescription>
            Create a new booking. Select an existing guest or add a new one.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Guest</Label>
            <Select value={existingGuestId} onValueChange={setExistingGuestId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__new__">+ Add new guest</SelectItem>
                {guests.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {existingGuestId === "__new__" && (
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name" className="text-xs">
                  Full name *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs">
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 ..."
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="country" className="text-xs">
                  Country
                </Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="United States"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Room</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger>
                <SelectValue placeholder={
                  bookableRooms.length === 0
                    ? "No rooms available — add one first"
                    : "Select a room"
                } />
              </SelectTrigger>
              <SelectContent>
                {bookableRooms.map((r) => {
                  const conflictForRoom =
                    datesValid && hasRoomConflict(r.id, checkIn, checkOut);
                  return (
                    <SelectItem key={r.id} value={r.id}>
                      Room {r.number} · {r.type} · ${r.price}/night
                      {conflictForRoom ? " · ⚠ booked" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="checkin">Check-in</Label>
              <Input
                id="checkin"
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkout">Check-out</Label>
              <Input
                id="checkout"
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </div>
          </div>

          {!datesValid && checkIn && checkOut && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Check-out date must be after check-in date.
            </div>
          )}

          {conflict && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">Room not available for these dates</p>
              <p className="mt-1 text-xs opacity-90">
                Already booked by {conflictGuestName} from {conflict.checkIn} to {conflict.checkOut}. Pick different dates or another room.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!datesValid || !roomId || !!conflict}>
              Create reservation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
