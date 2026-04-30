import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useHotelStore, type Guest, type Reservation, type Room } from "@/store/hotel-store";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { NewReservationDialog } from "@/components/reservations/NewReservationDialog";
import { CheckoutDialog } from "@/components/reservations/CheckoutDialog";

export const Route = createFileRoute("/availability")({
  head: () => ({
    meta: [
      { title: "Availability — NEXORA OS" },
      { name: "description", content: "Interactive rooms × dates availability grid." },
    ],
  }),
  component: AvailabilityPage,
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl rounded-lg border border-destructive/40 bg-card p-6 shadow-card">
        <h2 className="mb-2 text-lg font-semibold text-destructive">Unable to render Availability</h2>
        <pre className="mb-4 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-3 text-xs text-muted-foreground">
          {error?.message ?? "Unknown error"}
          {error?.stack ? `\n\n${error.stack}` : ""}
        </pre>
        <div className="flex gap-2">
          <Button onClick={reset} variant="outline" size="sm">Try again</Button>
          <Button onClick={() => (window.location.href = "/")} size="sm">Go home</Button>
        </div>
      </div>
    </div>
  ),
});

const DAYS = 14;
const addDays = (b: Date, n: number) => {
  const d = new Date(b);
  d.setDate(d.getDate() + n);
  return d;
};
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

interface CellState {
  status: "free" | "booked" | "in-house" | "out";
  reservation?: Reservation;
}

function isRoom(value: unknown): value is Room {
  return !!value && typeof value === "object" && "id" in value;
}

function isReservation(value: unknown): value is Reservation {
  return !!value && typeof value === "object" && "id" in value;
}

function isGuest(value: unknown): value is Guest {
  return !!value && typeof value === "object" && "id" in value;
}

function cellStateFor(room: Room, iso: string, reservations: Reservation[]): CellState {
  if (room.status === "maintenance" || room.housekeepingStatus === "out-of-order") {
    return { status: "out" };
  }

  const reservation = reservations.find(
    (x) =>
      x.roomId === room.id &&
      x.status !== "cancelled" &&
      x.status !== "checked-out" &&
      iso >= x.checkIn &&
      iso < x.checkOut,
  );

  if (!reservation) return { status: "free" };
  return { status: reservation.status === "checked-in" ? "in-house" : "booked", reservation };
}

function AvailabilityPage() {
  const { t } = useT();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <AppLayout
      title={t("nav.availability")}
      subtitle="Click a free cell to create a booking · Click a booking to manage it"
    >
      {mounted ? (
        <AvailabilityGrid />
      ) : (
        <Card className="border-border/60 p-8 shadow-card">
          <div className="text-sm text-muted-foreground">Loading availability…</div>
        </Card>
      )}
    </AppLayout>
  );
}

function AvailabilityGrid() {
  const rawRooms = useHotelStore((s) => s.rooms);
  const rawReservations = useHotelStore((s) => s.reservations);
  const rawGuests = useHotelStore((s) => s.guests);
  const checkInAction = useHotelStore((s) => s.checkIn);
  const cancelAction = useHotelStore((s) => s.cancelReservation);

  const rooms = useMemo(
    () => (Array.isArray(rawRooms) ? rawRooms.filter(isRoom).filter((r) => !r.archived) : []),
    [rawRooms],
  );
  const reservations = useMemo(
    () => (Array.isArray(rawReservations) ? rawReservations.filter(isReservation) : []),
    [rawReservations],
  );
  const guests = useMemo(
    () => (Array.isArray(rawGuests) ? rawGuests.filter(isGuest) : []),
    [rawGuests],
  );

  const guestById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);

  const [offset, setOffset] = useState(0);
  const [bookCell, setBookCell] = useState<{ roomId: string; date: string } | null>(null);
  const [viewRes, setViewRes] = useState<Reservation | null>(null);
  const [checkoutFor, setCheckoutFor] = useState<Reservation | null>(null);

  const startDate = useMemo(() => addDays(new Date(), offset), [offset]);
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(startDate, i)), [startDate]);
  const todayIso = isoDate(new Date());

  const sortedRooms = useMemo(
    () =>
      [...rooms].sort((a, b) =>
        String(a.number ?? "").localeCompare(String(b.number ?? ""), undefined, { numeric: true }),
      ),
    [rooms],
  );

  return (
    <>
      <Card className="border-border/60 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setOffset((o) => o - 7)}>
              <ChevronLeft className="h-4 w-4" /> Prev week
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOffset(0)} disabled={offset === 0}>
              Today
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOffset((o) => o + 7)}>
              Next week <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Legend />
        </div>

        {sortedRooms.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title="No rooms configured"
            description="Add rooms in the Rooms module to see availability here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 bg-card">
                <tr>
                  <th className="sticky left-0 z-10 min-w-[140px] border-b border-r border-border bg-card px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    Room
                  </th>
                  {days.map((d) => {
                    const iso = isoDate(d);
                    const isToday = iso === todayIso;
                    return (
                      <th
                        key={iso}
                        className={cn(
                          "min-w-[64px] border-b border-border px-1.5 py-2 text-center text-[11px] font-medium",
                          isToday ? "bg-primary/10 text-primary" : "text-muted-foreground",
                        )}
                      >
                        <div>{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
                        <div className="font-semibold">{d.getDate()}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedRooms.map((room) => (
                  <tr key={String(room.id)}>
                    <td className="sticky left-0 z-10 border-b border-r border-border bg-card px-3 py-2 align-middle">
                      <div className="font-medium text-foreground">Room {String(room.number ?? "—")}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {String(room.typeCode ?? "—")} · Fl {String(room.floor ?? "—")}
                      </div>
                    </td>
                    {days.map((d) => {
                      const iso = isoDate(d);
                      const cell = cellStateFor(room, iso, reservations);
                      const guest = cell.reservation ? guestById.get(cell.reservation.guestId) : undefined;
                      const tooltip =
                        cell.status === "out"
                          ? "Out of order"
                          : cell.reservation
                            ? `${guest?.name ?? "Guest"} · ${cell.reservation.checkIn} → ${cell.reservation.checkOut}`
                            : "Click to book";
                      const handleClick = () => {
                        if (cell.status === "free") {
                          setBookCell({ roomId: room.id, date: iso });
                        } else if (cell.reservation) {
                          setViewRes(cell.reservation);
                        }
                      };
                      const isClickable = cell.status === "free" || !!cell.reservation;

                      return (
                        <td key={`${room.id}-${iso}`} className="border-b border-border p-1" title={tooltip}>
                          <button
                            type="button"
                            onClick={handleClick}
                            disabled={!isClickable}
                            className={cn(
                              "flex h-7 w-full items-center justify-center truncate rounded-sm border px-1 text-[10px] font-medium transition-all",
                              isClickable && "cursor-pointer hover:scale-[1.05] hover:shadow-sm",
                              cell.status === "free" && "border-success/20 bg-success/5 hover:bg-success/15",
                              cell.status === "booked" && "border-info/30 bg-info/15 text-info",
                              cell.status === "in-house" && "border-primary/30 bg-primary/20 text-primary",
                              cell.status === "out" && "cursor-not-allowed border-destructive/20 bg-destructive/10 text-destructive",
                            )}
                          >
                            {cell.status === "in-house" || cell.status === "booked"
                              ? String(guest?.name ?? "—").split(" ")[0]
                              : cell.status === "out"
                                ? "OOO"
                                : "+"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {bookCell && (
        <NewReservationDialog
          open
          onOpenChange={(o) => !o && setBookCell(null)}
          trigger={null}
        />
      )}

      {viewRes && (
        <Dialog open onOpenChange={(o) => !o && setViewRes(null)}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>{guestById.get(viewRes.guestId)?.name ?? "Guest"}</DialogTitle>
              <DialogDescription>
                Room {sortedRooms.find((r) => r.id === viewRes.roomId)?.number ?? "—"} · {viewRes.checkIn} → {viewRes.checkOut}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <Detail k="Status" v={String(viewRes.status ?? "—")} />
              <Detail k="Confirmation" v={String(viewRes.confirmationNumber ?? String(viewRes.id).slice(0, 8))} />
              <Detail k="Total" v={`${Number(viewRes.totalAmount ?? 0).toFixed(2)}`} />
              {viewRes.invoice && <Detail k="Invoice" v={String(viewRes.invoice.invoiceNumber)} />}
            </div>
            <DialogFooter className="flex-wrap gap-2">
              {viewRes.status === "confirmed" && (
                <Button
                  onClick={() => {
                    checkInAction(viewRes.id);
                    setViewRes(null);
                  }}
                >
                  Check-in
                </Button>
              )}
              {viewRes.status === "checked-in" && (
                <Button
                  onClick={() => {
                    setCheckoutFor(viewRes);
                    setViewRes(null);
                  }}
                >
                  Check-out
                </Button>
              )}
              {viewRes.status === "confirmed" && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    cancelAction(viewRes.id);
                    setViewRes(null);
                  }}
                >
                  <X className="h-4 w-4" /> Cancel
                </Button>
              )}
              <Button variant="outline" onClick={() => setViewRes(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {checkoutFor && (
        <CheckoutDialog
          reservation={checkoutFor}
          open
          onOpenChange={(o) => !o && setCheckoutFor(null)}
        />
      )}
    </>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-border/40 py-1.5 text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-foreground">{v}</span>
    </div>
  );
}

function Legend() {
  const items = [
    { label: "Free (click to book)", className: "border-success/20 bg-success/5" },
    { label: "Booked", className: "border-info/30 bg-info/15" },
    { label: "In-house", className: "border-primary/30 bg-primary/20" },
    { label: "Out of order", className: "border-destructive/20 bg-destructive/10" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className={cn("h-3 w-5 rounded-sm border", it.className)} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
