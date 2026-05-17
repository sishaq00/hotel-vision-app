// Availability — Professional Tape Chart (PMS-style)
// Rooms × 28 days grid. Bookings render as colour-coded spans.
// Click a free cell → New Reservation. Click a booking → manage it.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, CalendarRange, LogIn,
  LogOut, X, Plus, Users, BedDouble, ZoomIn, ZoomOut,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { CheckoutDialog } from "@/components/reservations/CheckoutDialog";
import { NewReservationDialog } from "@/components/reservations/NewReservationDialog";
import { useHotelStore, type Reservation, type Room } from "@/store/hotel-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/availability")({
  head: () => ({
    meta: [
      { title: "Availability — NEXORA OS" },
      { name: "description", content: "Interactive tape chart — rooms × dates." },
    ],
  }),
  component: AvailabilityPage,
  errorComponent: ({ error, reset }) => (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-destructive/30 bg-card p-6 shadow">
        <h2 className="mb-2 font-semibold text-destructive">Could not load Availability</h2>
        <pre className="mb-4 max-h-48 overflow-auto rounded bg-muted p-3 text-xs text-muted-foreground">
          {error?.message ?? "Unknown error"}
        </pre>
        <div className="flex gap-2">
          <Button onClick={reset} variant="outline" size="sm">Retry</Button>
          <Button onClick={() => (window.location.href = "/")} size="sm">Dashboard</Button>
        </div>
      </div>
    </div>
  ),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const nightsBetween = (a: string, b: string) =>
  Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

const CELL_SIZES = [36, 44, 56] as const;
type CellSize = (typeof CELL_SIZES)[number];

// ─── Status colours ───────────────────────────────────────────────────────────

const STATUS_STYLES = {
  confirmed: {
    bg: "bg-blue-500",
    text: "text-white",
    hover: "hover:bg-blue-600",
    label: "Confirmed",
  },
  "checked-in": {
    bg: "bg-emerald-500",
    text: "text-white",
    hover: "hover:bg-emerald-600",
    label: "In house",
  },
  "checked-out": {
    bg: "bg-muted",
    text: "text-muted-foreground",
    hover: "hover:bg-muted/80",
    label: "Checked out",
  },
  cancelled: {
    bg: "bg-rose-100 dark:bg-rose-950/40",
    text: "text-rose-600 dark:text-rose-400",
    hover: "",
    label: "Cancelled",
  },
} as const;

// ─── Booking detail popup ─────────────────────────────────────────────────────

function BookingPopup({
  reservation,
  open,
  onClose,
  onCheckIn,
  onCheckOut,
  onCancel,
}: {
  reservation: Reservation | null;
  open: boolean;
  onClose: () => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onCancel: () => void;
}) {
  const guests = useHotelStore((s) => s.guests);
  const rooms  = useHotelStore((s) => s.rooms);
  const settings = useHotelStore((s) => s.settings);

  if (!reservation) return null;
  const g   = guests.find((x) => x.id === reservation.guestId);
  const rm  = rooms.find((x) => x.id === reservation.roomId);
  const cfg = STATUS_STYLES[reservation.status] ?? STATUS_STYLES.confirmed;
  const nights = nightsBetween(reservation.checkIn, reservation.checkOut);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white", cfg.bg)}>
              <BedDouble className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="leading-tight">{g?.name ?? "Guest"}</DialogTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Room {rm?.number ?? "—"} · {rm?.type ?? ""}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-0.5">
          {[
            ["Check-in",  reservation.checkIn],
            ["Check-out", reservation.checkOut],
            ["Nights",    String(nights)],
            ["Status",    cfg.label],
            ["Total",     `${settings.currency ?? "$"} ${reservation.totalAmount.toLocaleString()}`],
            ["Confirmation", reservation.confirmationNumber ?? reservation.id.slice(0, 8).toUpperCase()],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded-lg py-1.5 text-sm">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-medium text-foreground">{v}</span>
            </div>
          ))}
        </div>

        {g?.phone && (
          <>
            <Separator />
            <p className="text-xs text-muted-foreground">
              📞 {g.phone}{g.email ? ` · ✉ ${g.email}` : ""}
            </p>
          </>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {reservation.status === "confirmed" && (
            <>
              <Button size="sm" onClick={onCheckIn} className="gap-1.5">
                <LogIn className="h-3.5 w-3.5" /> Check in
              </Button>
              <Button size="sm" variant="destructive" onClick={onCancel} className="gap-1.5">
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
            </>
          )}
          {reservation.status === "checked-in" && (
            <Button size="sm" onClick={onCheckOut} className="gap-1.5">
              <LogOut className="h-3.5 w-3.5" /> Check out
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tape Chart grid ──────────────────────────────────────────────────────────

interface TapeChartProps { offset: number; days: number; cellW: CellSize; }

function TapeChart({ offset, days, cellW }: TapeChartProps) {
  const rawRooms        = useHotelStore((s) => s.rooms);
  const rawReservations = useHotelStore((s) => s.reservations);
  const rawGuests       = useHotelStore((s) => s.guests);
  const checkInAction   = useHotelStore((s) => s.checkIn);
  const cancelAction    = useHotelStore((s) => s.cancelReservation);

  const [viewRes, setViewRes]     = useState<Reservation | null>(null);
  const [checkoutFor, setCheckoutFor] = useState<Reservation | null>(null);
  const [newResDate, setNewResDate]   = useState<string | null>(null);
  const [newResOpen, setNewResOpen]   = useState(false);

  const rooms = useMemo(
    () => rawRooms.filter((r) => !r.archived)
      .sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true })),
    [rawRooms],
  );
  const reservations = useMemo(
    () => rawReservations.filter((r) => r.status !== "cancelled" && r.status !== "checked-out"),
    [rawReservations],
  );
  const guestById = useMemo(
    () => new Map(rawGuests.map((g) => [g.id, g])),
    [rawGuests],
  );

  const startDate = useMemo(() => addDays(new Date(), offset), [offset]);
  const dateRange = useMemo(
    () => Array.from({ length: days }, (_, i) => addDays(startDate, i)),
    [startDate, days],
  );
  const todayIso  = isoDate(new Date());

  // Group rooms by floor
  const grouped = useMemo(() => {
    const map = new Map<number, Room[]>();
    for (const r of rooms) {
      const f = r.floor ?? 0;
      if (!map.has(f)) map.set(f, []);
      map.get(f)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [rooms]);

  // Build a map: roomId → sorted reservations in view window
  const resByRoom = useMemo(() => {
    const startIso = isoDate(startDate);
    const endIso   = isoDate(addDays(startDate, days));
    const map = new Map<string, Reservation[]>();
    for (const res of reservations) {
      if (res.checkOut <= startIso || res.checkIn >= endIso) continue;
      if (!map.has(res.roomId)) map.set(res.roomId, []);
      map.get(res.roomId)!.push(res);
    }
    return map;
  }, [reservations, startDate, days]);

  if (rooms.length === 0) {
    return (
      <EmptyState icon={CalendarRange} title="No rooms configured"
        description="Add rooms in the Rooms module to see availability here." />
    );
  }

  const ROOM_COL_W = 130;

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-sm">
        {/* Header row: dates */}
        <div className="sticky top-0 z-20 flex border-b border-border/60 bg-card">
          {/* Room label column */}
          <div
            className="shrink-0 border-r border-border/60 bg-muted/30 px-3 py-2.5"
            style={{ width: ROOM_COL_W, minWidth: ROOM_COL_W }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Room / Floor
            </p>
          </div>

          {/* Date headers */}
          <div className="flex">
            {dateRange.map((d) => {
              const iso     = isoDate(d);
              const isToday = iso === todayIso;
              const isFirst = d.getDate() === 1;
              return (
                <div
                  key={iso}
                  style={{ width: cellW, minWidth: cellW }}
                  className={cn(
                    "flex flex-col items-center justify-center border-r border-border/40 py-2 text-center",
                    isToday && "bg-primary/8 dark:bg-primary/15",
                    isFirst && "border-l-2 border-l-border",
                  )}
                >
                  {(d.getDate() === 1 || d === dateRange[0]) && (
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {d.toLocaleDateString("en", { month: "short" })}
                    </p>
                  )}
                  <p className={cn(
                    "text-xs font-semibold leading-tight",
                    isToday ? "text-primary" : "text-muted-foreground",
                  )}>
                    {d.getDate()}
                  </p>
                  <p className={cn(
                    "text-[9px] leading-none",
                    isToday ? "text-primary" : "text-muted-foreground/60",
                  )}>
                    {d.toLocaleDateString("en", { weekday: "short" })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Room rows */}
        <div>
          {grouped.map(([floor, floorRooms]) => (
            <div key={floor}>
              {/* Floor separator */}
              <div
                className="flex items-center border-b border-border/40 bg-muted/20"
              >
                <div
                  className="shrink-0 border-r border-border/60 px-3 py-1"
                  style={{ width: ROOM_COL_W, minWidth: ROOM_COL_W }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Floor {floor}
                  </p>
                </div>
                <div style={{ width: cellW * days }} />
              </div>

              {/* Room rows */}
              {floorRooms.map((room) => {
                const roomRes = resByRoom.get(room.id) ?? [];
                const isOOO   = room.status === "maintenance" || room.housekeepingStatus === "out-of-order";

                return (
                  <div
                    key={room.id}
                    className="relative flex border-b border-border/40 hover:bg-muted/10"
                  >
                    {/* Room info cell */}
                    <div
                      className="sticky left-0 z-10 flex shrink-0 flex-col justify-center border-r border-border/60 bg-card px-3 py-1.5"
                      style={{ width: ROOM_COL_W, minWidth: ROOM_COL_W }}
                    >
                      <p className="text-xs font-semibold text-foreground">
                        {room.number}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {room.typeCode ?? room.type}
                      </p>
                    </div>

                    {/* Day cells */}
                    <div className="relative flex" style={{ height: cellW > 44 ? 44 : 36 }}>
                      {/* Background: click-to-book cells */}
                      {dateRange.map((d) => {
                        const iso = isoDate(d);
                        const isToday = iso === todayIso;
                        return (
                          <div
                            key={iso}
                            style={{ width: cellW, minWidth: cellW }}
                            onClick={() => {
                              if (isOOO) return;
                              setNewResDate(iso);
                              setNewResOpen(true);
                            }}
                            className={cn(
                              "h-full border-r border-border/30 transition-colors",
                              isOOO
                                ? "cursor-not-allowed bg-rose-50 dark:bg-rose-950/20"
                                : "cursor-pointer hover:bg-primary/5",
                              isToday && !isOOO && "bg-primary/5",
                            )}
                          />
                        );
                      })}

                      {/* Booking spans — absolutely positioned over the cells */}
                      {roomRes.map((res) => {
                        const cfg = STATUS_STYLES[res.status] ?? STATUS_STYLES.confirmed;
                        const g   = guestById.get(res.guestId);

                        // Clamp the span to the visible window
                        const windowStart = isoDate(startDate);
                        const windowEnd   = isoDate(addDays(startDate, days));
                        const spanStart   = res.checkIn < windowStart ? windowStart : res.checkIn;
                        const spanEnd     = res.checkOut > windowEnd  ? windowEnd   : res.checkOut;

                        // Left offset in px
                        const startIdx = dateRange.findIndex((d) => isoDate(d) === spanStart);
                        if (startIdx === -1) return null;
                        const spanDays = Math.max(1,
                          Math.round((new Date(spanEnd).getTime() - new Date(spanStart).getTime()) / 86400000),
                        );
                        const left  = startIdx * cellW;
                        const width = spanDays * cellW - 2; // 2px gap

                        const firstName = (g?.name ?? "Guest").split(" ")[0];

                        return (
                          <button
                            key={res.id}
                            type="button"
                            style={{ left, width, top: 3, bottom: 3 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewRes(res);
                            }}
                            className={cn(
                              "absolute z-10 flex items-center overflow-hidden rounded-md px-2 text-[11px] font-medium shadow-sm transition-all hover:brightness-110 hover:shadow-md active:scale-[0.98]",
                              cfg.bg, cfg.text, cfg.hover,
                            )}
                            title={`${g?.name ?? "Guest"} · ${res.checkIn} → ${res.checkOut}`}
                          >
                            <span className="truncate">{firstName}</span>
                            {spanDays >= 3 && (
                              <span className="ml-1 shrink-0 opacity-70">
                                {nightsBetween(res.checkIn, res.checkOut)}n
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Booking detail popup */}
      <BookingPopup
        reservation={viewRes}
        open={!!viewRes}
        onClose={() => setViewRes(null)}
        onCheckIn={() => {
          if (viewRes) { checkInAction(viewRes.id); setViewRes(null); }
        }}
        onCheckOut={() => {
          if (viewRes) { setCheckoutFor(viewRes); setViewRes(null); }
        }}
        onCancel={() => {
          if (viewRes) { cancelAction(viewRes.id); setViewRes(null); }
        }}
      />

      {newResOpen && (
        <NewReservationDialog
          open
          onOpenChange={(o) => !o && setNewResOpen(false)}
          trigger={null}
        />
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

// ─── Page wrapper ─────────────────────────────────────────────────────────────

function AvailabilityPage() {
  const [mounted,  setMounted]  = useState(false);
  const [offset,   setOffset]   = useState(0);
  const [days,     setDays]     = useState(14);
  const [cellW,    setCellW]    = useState<CellSize>(44);

  useEffect(() => setMounted(true), []);

  // Stats
  const rooms        = useHotelStore((s) => s.rooms.filter((r) => !r.archived));
  const reservations = useHotelStore((s) => s.reservations);
  const todayIso     = isoDate(new Date());
  const available    = rooms.filter((r) => r.status === "available").length;
  const occupied     = reservations.filter((r) => r.status === "checked-in").length;
  const arriving     = reservations.filter((r) => r.checkIn === todayIso && r.status === "confirmed").length;
  const departing    = reservations.filter((r) => r.checkOut === todayIso && r.status === "checked-in").length;

  return (
    <AppLayout
      title="Availability"
      subtitle="Tape chart — click a free day to book, click a booking to manage"
    >
      <div className="space-y-4">
        {/* Mini stats */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: "Available",  value: available, cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
            { label: "Occupied",   value: occupied,  cls: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
            { label: "Arriving",   value: arriving,  cls: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400" },
            { label: "Departing",  value: departing, cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
          ].map((s) => (
            <span key={s.label} className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
              s.cls,
            )}>
              <span className="text-base font-bold">{s.value}</span>
              {s.label}
            </span>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Navigation */}
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card p-1 shadow-sm">
            <Button size="icon" variant="ghost" className="h-8 w-8"
              onClick={() => setOffset((o) => o - days)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-3 text-xs"
              onClick={() => setOffset(0)} disabled={offset === 0}>
              Today
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8"
              onClick={() => setOffset((o) => o + days)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day range */}
          <div className="flex items-center rounded-lg border border-border/60 bg-card p-1 shadow-sm">
            {[7, 14, 21, 28].map((d) => (
              <button key={d} type="button" onClick={() => setDays(d)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  days === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}>
                {d}d
              </button>
            ))}
          </div>

          {/* Zoom */}
          <div className="flex items-center rounded-lg border border-border/60 bg-card p-1 shadow-sm">
            <button type="button" onClick={() => setCellW((w) => {
              const i = CELL_SIZES.indexOf(w);
              return CELL_SIZES[Math.max(0, i - 1)];
            })} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground">
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs text-muted-foreground">{cellW}px</span>
            <button type="button" onClick={() => setCellW((w) => {
              const i = CELL_SIZES.indexOf(w);
              return CELL_SIZES[Math.min(CELL_SIZES.length - 1, i + 1)];
            })} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground">
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {[
              { label: "Confirmed",   cls: "bg-blue-500" },
              { label: "In house",    cls: "bg-emerald-500" },
              { label: "Free",        cls: "border border-border bg-card" },
              { label: "OOO",         cls: "bg-rose-100 dark:bg-rose-950/40" },
            ].map((l) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className={cn("h-3 w-5 rounded-sm", l.cls)} />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {/* Chart */}
        {mounted
          ? <TapeChart key={`${offset}-${days}-${cellW}`} offset={offset} days={days} cellW={cellW} />
          : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-border/60 bg-card">
              <p className="text-sm text-muted-foreground">Loading chart…</p>
            </div>
          )}
      </div>
    </AppLayout>
  );
}
