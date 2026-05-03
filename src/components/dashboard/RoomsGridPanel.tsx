// Dashboard panel: visual grid of all rooms grouped by floor.
// Click a room → opens a details dialog with quick actions
// (book/give the room, view current guest, checkout).
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHotelStore, todayISO, type Room, type Reservation } from "@/store/hotel-store";
import { cn } from "@/lib/utils";
import { NewReservationDialog } from "@/components/reservations/NewReservationDialog";
import { CheckoutDialog } from "@/components/reservations/CheckoutDialog";

type RoomState = "available" | "occupied" | "dirty" | "ooo";

function classifyRoom(room: Room, reservations: Reservation[], today: string): {
  state: RoomState;
  reservation?: Reservation;
} {
  if (room.status === "maintenance" || room.housekeepingStatus === "out-of-order") {
    return { state: "ooo" };
  }
  const inHouse = reservations.find(
    (r) => r.roomId === room.id && r.status === "checked-in",
  );
  if (inHouse) return { state: "occupied", reservation: inHouse };

  // Dirty / not ready
  if (room.housekeepingStatus === "dirty" || room.housekeepingStatus === "departure") {
    return { state: "dirty" };
  }
  return { state: "available" };
}

const STATE_STYLES: Record<RoomState, string> = {
  available: "border-success/40 bg-success/10 text-success hover:bg-success/20",
  occupied: "border-info/40 bg-info/15 text-info hover:bg-info/25",
  dirty: "border-warning/40 bg-warning/15 text-warning-foreground hover:bg-warning/25",
  ooo: "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20",
};

const STATE_LABEL: Record<RoomState, string> = {
  available: "Available",
  occupied: "Occupied",
  dirty: "Dirty",
  ooo: "Out of order",
};

export function RoomsGridPanel() {
  const rooms = useHotelStore((s) => s.rooms);
  const reservations = useHotelStore((s) => s.reservations);
  const guests = useHotelStore((s) => s.guests);
  const payments = useHotelStore((s) => s.payments);
  const today = todayISO();

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [checkoutFor, setCheckoutFor] = useState<Reservation | null>(null);

  const visibleRooms = useMemo(
    () => rooms.filter((r) => !r.archived),
    [rooms],
  );

  const grouped = useMemo(() => {
    const map = new Map<number, Room[]>();
    for (const r of visibleRooms) {
      const f = r.floor ?? 0;
      if (!map.has(f)) map.set(f, []);
      map.get(f)!.push(r);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) =>
        String(a.number).localeCompare(String(b.number), undefined, { numeric: true }),
      );
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [visibleRooms]);

  const counts = useMemo(() => {
    const c = { available: 0, occupied: 0, dirty: 0, ooo: 0 };
    for (const r of visibleRooms) {
      c[classifyRoom(r, reservations, today).state]++;
    }
    return c;
  }, [visibleRooms, reservations, today]);

  const selectedRoom = selectedRoomId ? visibleRooms.find((r) => r.id === selectedRoomId) : null;
  const selectedInfo = selectedRoom ? classifyRoom(selectedRoom, reservations, today) : null;
  const selectedGuest = selectedInfo?.reservation
    ? guests.find((g) => g.id === selectedInfo.reservation!.guestId)
    : null;

  const balanceFor = (res: Reservation) => {
    const paid = payments
      .filter((p) => p.reservationId === res.id && p.status === "paid")
      .reduce((s, p) => s + p.amount, 0);
    return Math.max(0, (res.totalAmount ?? 0) - paid);
  };

  return (
    <Card className="border-border/60 p-4 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Rooms grid</h3>
          <p className="text-[11px] text-muted-foreground">
            Click a room to give it, view its guest, or check it out.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {(["available", "occupied", "dirty", "ooo"] as RoomState[]).map((s) => (
            <span
              key={s}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium",
                STATE_STYLES[s],
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {STATE_LABEL[s]} · {counts[s]}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {grouped.map(([floor, list]) => (
          <div key={floor}>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Floor {floor}
            </div>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14">
              {list.map((room) => {
                const info = classifyRoom(room, reservations, today);
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    title={`${room.number} · ${STATE_LABEL[info.state]}`}
                    className={cn(
                      "group relative aspect-square rounded-lg border text-center transition-all hover:scale-105 hover:shadow-sm",
                      STATE_STYLES[info.state],
                    )}
                  >
                    <div className="flex h-full flex-col items-center justify-center">
                      <div className="text-sm font-bold leading-none">{room.number}</div>
                      <div className="mt-0.5 text-[8px] uppercase tracking-wide opacity-70">
                        {room.typeCode}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Room details dialog */}
      {selectedRoom && selectedInfo && (
        <Dialog open onOpenChange={(o) => !o && setSelectedRoomId(null)}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Room {selectedRoom.number}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    STATE_STYLES[selectedInfo.state],
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {STATE_LABEL[selectedInfo.state]}
                </span>
              </DialogTitle>
              <DialogDescription>
                {selectedRoom.type} · {selectedRoom.typeCode} · Floor {selectedRoom.floor}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5 text-sm">
              <Row k="Default rate" v={`$${Number(selectedRoom.price ?? 0).toFixed(2)} / night`} />
              <Row k="Bed" v={selectedRoom.bedCode || "—"} />
              <Row k="Housekeeping" v={selectedRoom.housekeepingStatus ?? "clean"} />
              {selectedRoom.smokingAllowed && <Row k="Smoking" v="Allowed" />}
              {selectedRoom.accessible && <Row k="Accessible" v="Yes" />}
            </div>

            {selectedInfo.state === "occupied" && selectedInfo.reservation && (
              <div className="mt-3 space-y-1.5 rounded-lg border border-info/30 bg-info/5 p-3 text-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-info">
                  Current guest
                </div>
                <Row k="Guest" v={selectedGuest?.name ?? "—"} />
                <Row
                  k="Stay"
                  v={`${selectedInfo.reservation.checkIn} → ${selectedInfo.reservation.checkOut}`}
                />
                <Row k="Total" v={`$${Number(selectedInfo.reservation.totalAmount ?? 0).toFixed(2)}`} />
                <Row k="Balance" v={`$${balanceFor(selectedInfo.reservation).toFixed(2)}`} />
              </div>
            )}

            {selectedInfo.state === "dirty" && (
              <div className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning-foreground">
                This room is dirty and cannot be assigned until housekeeping marks it clean.
              </div>
            )}

            {selectedInfo.state === "ooo" && (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                This room is out of order and unavailable for booking.
              </div>
            )}

            <DialogFooter className="flex-wrap gap-2">
              {selectedInfo.state === "available" && (
                <Button
                  onClick={() => {
                    setBookOpen(true);
                  }}
                >
                  Give / book this room
                </Button>
              )}
              {selectedInfo.state === "occupied" && selectedInfo.reservation && (
                <>
                  {selectedGuest && (
                    <Button asChild variant="outline">
                      <Link to="/guest/$guestId" params={{ guestId: selectedGuest.id }}>
                        Open guest profile
                      </Link>
                    </Button>
                  )}
                  <Button onClick={() => setCheckoutFor(selectedInfo.reservation!)}>
                    Check-out
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => setSelectedRoomId(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {bookOpen && (
        <NewReservationDialog
          open={bookOpen}
          onOpenChange={(o) => {
            setBookOpen(o);
            if (!o) setSelectedRoomId(null);
          }}
          trigger={null}
        />
      )}

      {checkoutFor && (
        <CheckoutDialog
          reservation={checkoutFor}
          open
          onOpenChange={(o) => {
            if (!o) {
              setCheckoutFor(null);
              setSelectedRoomId(null);
            }
          }}
        />
      )}
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-border/40 py-1 text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium capitalize text-foreground">{v}</span>
    </div>
  );
}
