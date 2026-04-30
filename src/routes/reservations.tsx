import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarCheck, Download, LogIn, LogOut, Search, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { NewReservationDialog } from "@/components/reservations/NewReservationDialog";
import { CheckoutDialog } from "@/components/reservations/CheckoutDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHotelStore } from "@/store/hotel-store";
import { downloadInvoicePDF } from "@/lib/invoice-pdf";
import { toast } from "sonner";
import { useConfirm } from "@/components/system/ConfirmDialog";
import { useT } from "@/lib/i18n";

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
  const { t } = useT();
  const reservations = useHotelStore((s) => s.reservations);
  const guests = useHotelStore((s) => s.guests);
  const rooms = useHotelStore((s) => s.rooms);
  const settings = useHotelStore((s) => s.settings);
  const checkIn = useHotelStore((s) => s.checkIn);
  const cancel = useHotelStore((s) => s.cancelReservation);
  const confirm = useConfirm();

  const [query, setQuery] = useState("");
  const [checkoutId, setCheckoutId] = useState<string | null>(null);

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
    <AppLayout title={t("nav.reservations")} subtitle={t("sub.reservations")}>
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
                              onClick={() => setCheckoutId(r.id)}
                            >
                              <LogOut className="h-3.5 w-3.5" /> Check out
                            </Button>
                          )}
                          {r.status === "checked-out" && r.invoice && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1.5"
                              title="Download invoice PDF"
                              onClick={() => {
                                if (!rm) return;
                                downloadInvoicePDF({
                                  invoice: r.invoice!,
                                  reservation: r,
                                  guest: g,
                                  room: rm,
                                  settings,
                                });
                              }}
                            >
                              <Download className="h-3.5 w-3.5" /> Invoice
                            </Button>
                          )}
                          {(r.status === "confirmed" || r.status === "checked-in") && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              title="Cancel reservation"
                              onClick={() => {
                                cancel(r.id);
                                toast("Reservation cancelled");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
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

      {checkoutId && (() => {
        const r = reservations.find((x) => x.id === checkoutId);
        if (!r) return null;
        return (
          <CheckoutDialog
            reservation={r}
            open={true}
            onOpenChange={(o) => !o && setCheckoutId(null)}
          />
        );
      })()}
    </AppLayout>
  );
}
