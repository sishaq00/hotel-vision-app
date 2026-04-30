// Shared reservations table used by In-House, Arrivals, Departures,
// Recently Viewed, Search and Archived pages.
import { Download, LogIn, LogOut, Printer, X, CalendarPlus } from "lucide-react";
import { useState } from "react";
import { ExtendStayDialog } from "@/components/reservations/ExtendStayDialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { CheckoutDialog } from "@/components/reservations/CheckoutDialog";
import { ExportButtons } from "@/components/system/ExportButtons";
import { useConfirm } from "@/components/system/ConfirmDialog";
import { useHotelStore, type Reservation } from "@/store/hotel-store";
import { downloadInvoicePDF } from "@/lib/invoice-pdf";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export interface ReservationsTableProps {
  reservations: Reservation[];
  /** Which action buttons to render. Defaults to all relevant ones. */
  actions?: {
    checkIn?: boolean;
    checkOut?: boolean;
    invoice?: boolean;
    cancel?: boolean;
  };
  /** Optional extra column shown on the far right (e.g. confirmation #). */
  extraColumn?: {
    header: string;
    render: (r: Reservation) => React.ReactNode;
  };
}

export function ReservationsTable({
  reservations,
  actions = { checkIn: true, checkOut: true, invoice: true, cancel: true },
  extraColumn,
}: ReservationsTableProps) {
  const guests = useHotelStore((s) => s.guests);
  const rooms = useHotelStore((s) => s.rooms);
  const settings = useHotelStore((s) => s.settings);
  const checkIn = useHotelStore((s) => s.checkIn);
  const cancel = useHotelStore((s) => s.cancelReservation);
  const markRecentlyViewed = useHotelStore((s) => s.markRecentlyViewed);
  const confirm = useConfirm();

  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [extendId, setExtendId] = useState<string | null>(null);

  // Build flat rows for export (resolves guest/room names).
  const exportRows = reservations.map((r) => {
    const g = guests.find((x) => x.id === r.guestId);
    const rm = rooms.find((x) => x.id === r.roomId);
    return {
      Guest: g?.name ?? "—",
      Email: g?.email ?? "",
      Phone: g?.phone ?? "",
      Room: rm ? `Room ${rm.number}` : "—",
      Type: rm?.type ?? "",
      "Check-in": r.checkIn,
      "Check-out": r.checkOut,
      Status: r.status,
      Total: r.totalAmount,
      Currency: settings.currency,
      Confirmation: r.confirmationNumber ?? "",
    };
  });

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {reservations.length} reservation{reservations.length === 1 ? "" : "s"}
        </p>
        <ExportButtons rows={exportRows} filename="reservations" />
      </div>
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
              {extraColumn && <TableHead>{extraColumn.header}</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((r) => {
              const g = guests.find((x) => x.id === r.guestId);
              const rm = rooms.find((x) => x.id === r.roomId);
              return (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => markRecentlyViewed(r.id)}
                >
                  <TableCell className="font-medium">{g?.name ?? "—"}</TableCell>
                  <TableCell>{rm ? `Room ${rm.number}` : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{r.checkIn}</TableCell>
                  <TableCell className="text-muted-foreground">{r.checkOut}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right font-semibold">
                    {settings.currency} {r.totalAmount.toLocaleString()}
                  </TableCell>
                  {extraColumn && <TableCell>{extraColumn.render(r)}</TableCell>}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {actions.checkIn && r.status === "confirmed" && (
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
                      {actions.checkOut && r.status === "checked-in" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            onClick={() => setExtendId(r.id)}
                            title="Extend or shorten stay"
                          >
                            <CalendarPlus className="h-3.5 w-3.5" /> Extend
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            onClick={() => setCheckoutId(r.id)}
                          >
                            <LogOut className="h-3.5 w-3.5" /> Check out
                          </Button>
                        </>
                      )}
                      {actions.invoice && r.status === "checked-out" && r.invoice && (
                        <>
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
                          <Button asChild size="icon" variant="ghost" className="h-8 w-8" title="Print invoice (A4)">
                            <Link to="/print-invoice/$reservationId" params={{ reservationId: r.id }} target="_blank">
                              <Printer className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button asChild size="icon" variant="ghost" className="h-8 w-8 text-xs font-mono" title="Print 80mm receipt">
                            <Link to="/print-receipt/$reservationId" params={{ reservationId: r.id }} target="_blank">
                              80
                            </Link>
                          </Button>
                        </>
                      )}
                      {actions.cancel &&
                        (r.status === "confirmed" || r.status === "checked-in") && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Cancel reservation"
                            onClick={async () => {
                              const ok = await confirm({
                                title: "Cancel reservation?",
                                description: `Cancel ${g?.name ?? "guest"}'s booking for room ${rm?.number ?? "—"}? This cannot be undone.`,
                                confirmLabel: "Cancel reservation",
                                cancelLabel: "Keep",
                                destructive: true,
                              });
                              if (!ok) return;
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
    </>
  );
}
