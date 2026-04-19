import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarCheck, LogIn, LogOut, Search, Trash2, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { NewReservationDialog } from "@/components/reservations/NewReservationDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHotelStore } from "@/store/hotel-store";
import { toast } from "sonner";

export const Route = createFileRoute("/reservations")({
  head: () => ({
    meta: [
      { title: "Reservations — NEXORA OS" },
      { name: "description", content: "Manage all hotel reservations." },
    ],
  }),
  component: ReservationsPage,
});

function ReservationsPage() {
  const reservations = useHotelStore((s) => s.reservations);
  const guests = useHotelStore((s) => s.guests);
  const rooms = useHotelStore((s) => s.rooms);
  const checkIn = useHotelStore((s) => s.checkIn);
  const checkOut = useHotelStore((s) => s.checkOut);
  const cancel = useHotelStore((s) => s.cancelReservation);
  const remove = useHotelStore((s) => s.deleteReservation);

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return [...reservations]
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
      .filter((r) => {
        if (!q) return true;
        const g = guests.find((x) => x.id === r.guestId);
        const rm = rooms.find((x) => x.id === r.roomId);
        return (
          g?.name.toLowerCase().includes(q) ||
          rm?.number.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q)
        );
      });
  }, [reservations, guests, rooms, query]);

  return (
    <AppLayout title="Reservations" subtitle="All bookings in one place">
      <Card className="border-border/60 shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by guest, room, status..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <NewReservationDialog />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title={query ? "No matching reservations" : "No reservations yet"}
            description={
              query
                ? "Try a different search term."
                : "Create your first reservation to get started."
            }
            action={!query ? <NewReservationDialog /> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const g = guests.find((x) => x.id === r.guestId);
                  const rm = rooms.find((x) => x.id === r.roomId);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{g?.name ?? "—"}</TableCell>
                      <TableCell>{rm ? `Room ${rm.number}` : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.checkIn}</TableCell>
                      <TableCell className="text-muted-foreground">{r.checkOut}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-right font-semibold">${r.totalAmount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {r.status === "confirmed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5"
                              onClick={() => {
                                checkIn(r.id);
                                toast.success("Checked in");
                              }}
                            >
                              <LogIn className="h-3.5 w-3.5" /> Check in
                            </Button>
                          )}
                          {r.status === "checked-in" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5"
                              onClick={() => {
                                checkOut(r.id);
                                toast.success("Checked out");
                              }}
                            >
                              <LogOut className="h-3.5 w-3.5" /> Check out
                            </Button>
                          )}
                          {(r.status === "confirmed" || r.status === "checked-in") && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                cancel(r.id);
                                toast("Reservation cancelled");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              remove(r.id);
                              toast("Reservation deleted");
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
