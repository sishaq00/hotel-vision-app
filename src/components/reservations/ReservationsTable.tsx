// Professional Reservations Table — shared across Arrivals, Departures,
// In-House, Search, Archived, and Recently-Viewed pages.
import { useState } from "react";
import {
  LogIn, LogOut, Printer, X, CalendarPlus, Download,
  MoreHorizontal, Eye, AlertTriangle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ExtendStayDialog } from "@/components/reservations/ExtendStayDialog";
import { CheckoutDialog } from "@/components/reservations/CheckoutDialog";
import { ExportButtons } from "@/components/system/ExportButtons";
import { useConfirm } from "@/components/system/ConfirmDialog";
import { GuestFlagBadges } from "@/components/guests/GuestFlagBadges";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHotelStore, type Reservation, type ReservationStatus } from "@/store/hotel-store";
import { downloadInvoicePDF } from "@/lib/invoice-pdf";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReservationsTableProps {
  reservations: Reservation[];
  actions?: {
    checkIn?: boolean;
    checkOut?: boolean;
    invoice?: boolean;
    cancel?: boolean;
  };
  extraColumn?: {
    header: string;
    render: (r: Reservation) => React.ReactNode;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

function relativeDate(iso: string): { label: string; urgent: boolean } {
  if (iso === TODAY)           return { label: "Today",     urgent: true };
  if (iso < TODAY)             return { label: "Overdue",   urgent: true };
  const ms = new Date(iso).getTime() - new Date(TODAY).getTime();
  const days = Math.round(ms / 86400000);
  if (days === 1)              return { label: "Tomorrow",  urgent: false };
  if (days <= 7)               return { label: `In ${days}d`, urgent: false };
  return { label: iso,         urgent: false };
}

function nightsBetween(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ReservationStatus, { label: string; cls: string }> = {
  confirmed:    { label: "Confirmed",   cls: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400" },
  "checked-in": { label: "In house",    cls: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" },
  "checked-out":{ label: "Checked out", cls: "border-border bg-muted text-muted-foreground" },
  cancelled:    { label: "Cancelled",   cls: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400" },
};

function ResStatus({ status }: { status: ReservationStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.confirmed;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
      cfg.cls,
    )}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {cfg.label}
    </span>
  );
}

// ─── Guest avatar ─────────────────────────────────────────────────────────────

function GuestAvatar({ name }: { name?: string }) {
  const initials = (name ?? "?").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
      {initials}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReservationsTable({
  reservations,
  actions = { checkIn: true, checkOut: true, invoice: true, cancel: true },
  extraColumn,
}: ReservationsTableProps) {
  const guests                = useHotelStore((s) => s.guests);
  const rooms                 = useHotelStore((s) => s.rooms);
  const settings              = useHotelStore((s) => s.settings);
  const doCheckIn             = useHotelStore((s) => s.checkIn);
  const doCancel              = useHotelStore((s) => s.cancelReservation);
  const markRecentlyViewed    = useHotelStore((s) => s.markRecentlyViewed);
  const getReservationBalance = useHotelStore((s) => s.getReservationBalance);
  const confirm               = useConfirm();

  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [extendId,   setExtendId]   = useState<string | null>(null);

  const curr = settings.currency ?? "$";

  const exportRows = reservations.map((r) => {
    const g  = guests.find((x) => x.id === r.guestId);
    const rm = rooms.find((x) => x.id === r.roomId);
    return {
      Guest: g?.name ?? "—",
      Email: g?.email ?? "",
      Phone: g?.phone ?? "",
      Room: rm ? `Room ${rm.number}` : "—",
      Type: rm?.type ?? "",
      "Check-in": r.checkIn,
      "Check-out": r.checkOut,
      Nights: nightsBetween(r.checkIn, r.checkOut),
      Status: r.status,
      Total: r.totalAmount,
      Currency: curr,
      Confirmation: r.confirmationNumber ?? "",
    };
  });

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2">
        <p className="text-xs text-muted-foreground">
          {reservations.length} reservation{reservations.length !== 1 ? "s" : ""}
        </p>
        <ExportButtons rows={exportRows} filename="reservations" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Guest
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Room
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Stay
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total
              </th>
              {extraColumn && (
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {extraColumn.header}
                </th>
              )}
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {reservations.map((r) => {
              const g   = guests.find((x) => x.id === r.guestId);
              const rm  = rooms.find((x) => x.id === r.roomId);
              const cin = relativeDate(r.checkIn);
              const cout= relativeDate(r.checkOut);
              const nights = nightsBetween(r.checkIn, r.checkOut);
              const bal = r.status === "checked-in"
                ? getReservationBalance(r.id).balance
                : 0;
              const hasBalance = bal > 0;

              return (
                <tr
                  key={r.id}
                  className={cn(
                    "group transition-colors hover:bg-muted/30",
                    r.status === "cancelled" && "opacity-60",
                  )}
                  onClick={() => markRecentlyViewed(r.id)}
                >
                  {/* Guest */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <GuestAvatar name={g?.name} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-foreground truncate">
                            {g?.name ?? "—"}
                          </span>
                          <GuestFlagBadges guest={g} />
                        </div>
                        {g?.email && (
                          <p className="truncate text-[11px] text-muted-foreground">{g.email}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Room */}
                  <td className="px-4 py-3">
                    {rm ? (
                      <div>
                        <p className="font-medium text-foreground">Room {rm.number}</p>
                        <p className="text-[11px] text-muted-foreground">{rm.type}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Stay */}
                  <td className="px-4 py-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className={cn(
                          "font-medium",
                          cin.urgent && r.status === "confirmed" ? "text-amber-600 dark:text-amber-400" : "text-foreground",
                        )}>
                          {cin.label}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className={cn(
                          "font-medium",
                          cout.urgent && r.status === "checked-in" ? "text-rose-600 dark:text-rose-400" : "text-foreground",
                        )}>
                          {cout.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {nights} night{nights !== 1 ? "s" : ""} · {r.checkIn}
                      </p>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <ResStatus status={r.status} />
                      {hasBalance && (
                        <span className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="h-3 w-3" />
                          {curr} {bal.toLocaleString(undefined, { maximumFractionDigits: 2 })} due
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3 text-right">
                    <p className="font-semibold tabular-nums text-foreground">
                      {curr} {r.totalAmount.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {curr} {(r.totalAmount / Math.max(nights, 1)).toFixed(0)}/night
                    </p>
                  </td>

                  {/* Extra column */}
                  {extraColumn && (
                    <td className="px-4 py-3">{extraColumn.render(r)}</td>
                  )}

                  {/* Actions */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">

                      {/* Check-in button */}
                      {actions.checkIn && r.status === "confirmed" && (
                        <Button size="sm" className="h-8 gap-1.5 text-xs"
                          onClick={() => { doCheckIn(r.id); toast.success("Checked in"); }}
                        >
                          <LogIn className="h-3.5 w-3.5" /> Check in
                        </Button>
                      )}

                      {/* Check-out button */}
                      {actions.checkOut && r.status === "checked-in" && (
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
                          onClick={() => setCheckoutId(r.id)}
                        >
                          <LogOut className="h-3.5 w-3.5" /> Check out
                        </Button>
                      )}

                      {/* More dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">

                          {/* View guest */}
                          {g && (
                            <DropdownMenuItem asChild>
                              <Link to="/guest/$guestId" params={{ guestId: g.id }} className="text-xs">
                                <Eye className="mr-2 h-3.5 w-3.5" /> View guest profile
                              </Link>
                            </DropdownMenuItem>
                          )}

                          {/* Extend stay */}
                          {actions.checkOut && r.status === "checked-in" && (
                            <DropdownMenuItem onClick={() => setExtendId(r.id)} className="text-xs">
                              <CalendarPlus className="mr-2 h-3.5 w-3.5" /> Extend / shorten stay
                            </DropdownMenuItem>
                          )}

                          {/* Invoice actions */}
                          {actions.invoice && r.status === "checked-out" && r.invoice && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-xs"
                                onClick={() => {
                                  if (!rm) return;
                                  downloadInvoicePDF({ invoice: r.invoice!, reservation: r, guest: g, room: rm, settings });
                                }}
                              >
                                <Download className="mr-2 h-3.5 w-3.5" /> Download invoice PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to="/print-invoice/$reservationId" params={{ reservationId: r.id }} target="_blank" className="text-xs">
                                  <Printer className="mr-2 h-3.5 w-3.5" /> Print invoice (A4)
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to="/print-receipt/$reservationId" params={{ reservationId: r.id }} target="_blank" className="text-xs">
                                  <Printer className="mr-2 h-3.5 w-3.5" /> Print receipt (80mm)
                                </Link>
                              </DropdownMenuItem>
                            </>
                          )}

                          {/* Cancel */}
                          {actions.cancel && (r.status === "confirmed" || r.status === "checked-in") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-xs text-destructive focus:text-destructive"
                                onClick={async () => {
                                  const ok = await confirm({
                                    title: "Cancel reservation?",
                                    description: `Cancel ${g?.name ?? "guest"}'s booking for room ${rm?.number ?? "—"}? This cannot be undone.`,
                                    confirmLabel: "Cancel reservation",
                                    cancelLabel: "Keep",
                                    destructive: true,
                                  });
                                  if (!ok) return;
                                  doCancel(r.id);
                                  toast("Reservation cancelled");
                                }}
                              >
                                <X className="mr-2 h-3.5 w-3.5" /> Cancel reservation
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      {checkoutId && (() => {
        const r = reservations.find((x) => x.id === checkoutId);
        if (!r) return null;
        return (
          <CheckoutDialog
            reservation={r}
            open
            onOpenChange={(o) => !o && setCheckoutId(null)}
          />
        );
      })()}
      <ExtendStayDialog
        reservation={extendId ? reservations.find((x) => x.id === extendId) ?? null : null}
        onClose={() => setExtendId(null)}
      />
    </>
  );
}
