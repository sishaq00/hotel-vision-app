import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useHotelStore, type Reservation, type Room } from "@/store/hotel-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/availability")({
  head: () => ({
    meta: [
      { title: "Availability — NEXORA OS" },
      { name: "description", content: "Rooms × dates availability grid." },
    ],
  }),
  component: AvailabilityPage,
});

const DAYS = 14;

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface CellState {
  status: "free" | "booked" | "in-house" | "out";
  reservation?: Reservation;
}

function cellStateFor(
  room: Room,
  iso: string,
  reservations: Reservation[],
): CellState {
  if (room.status === "maintenance" || room.housekeepingStatus === "out-of-order") {
    return { status: "out" };
  }
  const r = reservations.find(
    (x) =>
      x.roomId === room.id &&
      x.status !== "cancelled" &&
      x.status !== "checked-out" &&
      iso >= x.checkIn &&
      iso < x.checkOut,
  );
  if (!r) return { status: "free" };
  return {
    status: r.status === "checked-in" ? "in-house" : "booked",
    reservation: r,
  };
}

function AvailabilityPage() {
  const rooms = useHotelStore((s) => s.rooms.filter((r) => !r.archived));
  const reservations = useHotelStore((s) => s.reservations);
  const guests = useHotelStore((s) => s.guests);

  const [offset, setOffset] = useState(0);

  const startDate = useMemo(() => addDays(new Date(), offset), [offset]);
  const days = useMemo(
    () => Array.from({ length: DAYS }, (_, i) => addDays(startDate, i)),
    [startDate],
  );

  const todayIso = isoDate(new Date());

  const sortedRooms = useMemo(
    () =>
      [...rooms].sort((a, b) =>
        a.number.localeCompare(b.number, undefined, { numeric: true }),
      ),
    [rooms],
  );

  return (
    <AppLayout
      title="Availability"
      subtitle="14-day room grid · click a booked cell to see the guest"
    >
      <Card className="border-border/60 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOffset((o) => o - 7)}
            >
              <ChevronLeft className="h-4 w-4" /> Prev week
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOffset(0)}
              disabled={offset === 0}
            >
              Today
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOffset((o) => o + 7)}
            >
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
                          isToday
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground",
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
                  <tr key={room.id}>
                    <td className="sticky left-0 z-10 border-b border-r border-border bg-card px-3 py-2 align-middle">
                      <div className="font-medium text-foreground">Room {room.number}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {room.typeCode} · Fl {room.floor}
                      </div>
                    </td>
                    {days.map((d) => {
                      const iso = isoDate(d);
                      const cell = cellStateFor(room, iso, reservations);
                      const guest =
                        cell.reservation &&
                        guests.find((g) => g.id === cell.reservation!.guestId);
                      const tooltip =
                        cell.status === "out"
                          ? "Out of order"
                          : cell.reservation
                            ? `${guest?.name ?? "Guest"} · ${cell.reservation.checkIn} → ${cell.reservation.checkOut}`
                            : "Available";
                      return (
                        <td
                          key={iso}
                          className="border-b border-border p-1"
                          title={tooltip}
                        >
                          <div
                            className={cn(
                              "h-7 rounded-sm border text-[10px] font-medium",
                              cell.status === "free" &&
                                "border-success/20 bg-success/5",
                              cell.status === "booked" &&
                                "border-info/30 bg-info/15 text-info",
                              cell.status === "in-house" &&
                                "border-primary/30 bg-primary/20 text-primary",
                              cell.status === "out" &&
                                "border-destructive/20 bg-destructive/10 text-destructive",
                              "flex items-center justify-center truncate px-1",
                            )}
                          >
                            {cell.status === "in-house" || cell.status === "booked"
                              ? (guest?.name?.split(" ")[0] ?? "—")
                              : cell.status === "out"
                                ? "OOO"
                                : ""}
                          </div>
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
    </AppLayout>
  );
}

function Legend() {
  const items = [
    { label: "Available", className: "border-success/20 bg-success/5" },
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
