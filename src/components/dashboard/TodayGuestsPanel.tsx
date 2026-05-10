// Dashboard panel: a wide table of all in-house guests today.
// Green row = staying, Red row = departing today.
// Click a guest name → full guest + folio info dialog.
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { useHotelStore, todayISO, type Reservation } from "@/store/hotel-store";
import { cn } from "@/lib/utils";
import { CheckoutDialog } from "@/components/reservations/CheckoutDialog";
import { ExtendStayDialog } from "@/components/reservations/ExtendStayDialog";

function nightsBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function TodayGuestsPanel() {
  const navigate = useNavigate();
  const reservations = useHotelStore((s) => s.reservations);
  const rooms = useHotelStore((s) => s.rooms);
  const guests = useHotelStore((s) => s.guests);
  const payments = useHotelStore((s) => s.payments);
  const productSales = useHotelStore((s) => s.productSales);
  const folios = useHotelStore((s) => s.folios);
  const getReservationBalance = useHotelStore((s) => s.getReservationBalance);
  const lastAuditDate = useHotelStore((s) => s.lastNightAuditDate);
  const today = todayISO();
  // After night audit runs for "today", treat departing logic from the audit date.
  const effectiveToday = lastAuditDate && lastAuditDate > today ? lastAuditDate : today;

  const [openId, setOpenId] = useState<string | null>(null);
  const [checkoutFor, setCheckoutFor] = useState<Reservation | null>(null);
  const [extendFor, setExtendFor] = useState<Reservation | null>(null);

  type RowState = "staying" | "departing" | "checked-out";
  const getRowState = (r: Reservation): RowState => {
    if (r.status === "checked-out") return "checked-out";
    if (r.status === "checked-in" && r.checkOut <= effectiveToday) return "departing";
    return "staying";
  };

  // Show in-house + recently checked-out (last 6h) so user sees the pink transition
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  const inHouse = useMemo(() => {
    const nowMs = Date.now();
    return reservations
      .filter((r) => {
        if (r.status === "checked-in") return true;
        if (r.status === "checked-out" && r.checkedOutAt) {
          return nowMs - new Date(r.checkedOutAt).getTime() <= SIX_HOURS_MS;
        }
        return false;
      })
      .sort((a, b) => a.checkOut.localeCompare(b.checkOut));
  }, [reservations]);

  const balanceFor = (res: Reservation) => {
    // Use store selector so extras (POS / folio) are included.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    payments; productSales; folios;
    return getReservationBalance(res.id).balance;
  };

  const overstayNights = (res: Reservation) => {
    if (res.status !== "checked-in") return 0;
    if (res.checkOut > effectiveToday) return 0;
    const ms = new Date(effectiveToday).getTime() - new Date(res.checkOut).getTime();
    return Math.max(0, Math.round(ms / 86400000));
  };

  const opened = openId ? inHouse.find((r) => r.id === openId) ?? reservations.find((r) => r.id === openId) : null;
  const openedGuest = opened ? guests.find((g) => g.id === opened.guestId) : null;
  const openedRoom = opened ? rooms.find((r) => r.id === opened.roomId) : null;

  return (
    <Card className="border-border/60 p-4 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Today's guests</h3>
          <p className="text-[11px] text-muted-foreground">
            Click a guest to see full account and balance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 font-medium text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            Staying
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            Departing today
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/40 bg-pink-500/10 px-2 py-0.5 font-medium text-pink-600 dark:text-pink-400">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            Checked-out
          </span>
        </div>
      </div>

      {inHouse.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          No in-house guests right now.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-border px-2 py-2">Guest</th>
                <th className="border-b border-border px-2 py-2">Room</th>
                <th className="border-b border-border px-2 py-2">Type</th>
                <th className="border-b border-border px-2 py-2">Check-in</th>
                <th className="border-b border-border px-2 py-2">Check-out</th>
                <th className="border-b border-border px-2 py-2 text-right">Nights</th>
                <th className="border-b border-border px-2 py-2 text-right">Total</th>
                <th className="border-b border-border px-2 py-2 text-right">Balance</th>
                <th className="border-b border-border px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {inHouse.map((res) => {
                const guest = guests.find((g) => g.id === res.guestId);
                const room = rooms.find((r) => r.id === res.roomId);
                const rowState = getRowState(res);
                const nights = nightsBetween(res.checkIn, res.checkOut);
                const balance = balanceFor(res);
                const overstay = overstayNights(res);
                const rowBg =
                  rowState === "checked-out"
                    ? "bg-pink-500/5 hover:bg-pink-500/10"
                    : rowState === "departing"
                    ? "bg-destructive/5 hover:bg-destructive/10"
                    : "bg-success/5 hover:bg-success/10";
                const checkOutColor =
                  rowState === "checked-out"
                    ? "text-pink-600 dark:text-pink-400"
                    : rowState === "departing"
                    ? "text-destructive"
                    : "text-foreground";
                return (
                  <tr
                    key={res.id}
                    onClick={() => setOpenId(res.id)}
                    className={cn("cursor-pointer text-xs transition-colors", rowBg)}
                  >
                    <td className="border-b border-border/60 px-2 py-2 font-medium text-foreground">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{guest?.name ?? "—"}</span>
                        {balance > 0 && res.status === "checked-in" && (
                          <span
                            title="Outstanding balance"
                            className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-destructive"
                          >
                            ⚠ ${balance.toFixed(2)}
                          </span>
                        )}
                        {overstay > 0 && (
                          <span
                            title="Past check-out date"
                            className="inline-flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400"
                          >
                            Overstay {overstay}N
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border-b border-border/60 px-2 py-2">{room?.number ?? "—"}</td>
                    <td className="border-b border-border/60 px-2 py-2 text-muted-foreground">
                      {room?.typeCode ?? "—"}
                    </td>
                    <td className="border-b border-border/60 px-2 py-2 text-muted-foreground">{res.checkIn}</td>
                    <td className={cn("border-b border-border/60 px-2 py-2 font-medium", checkOutColor)}>
                      {res.checkOut}
                    </td>
                    <td className="border-b border-border/60 px-2 py-2 text-right tabular-nums">
                      {nights}
                    </td>
                    <td className="border-b border-border/60 px-2 py-2 text-right tabular-nums">
                      ${Number(res.totalAmount ?? 0).toFixed(2)}
                    </td>
                    <td
                      className={cn(
                        "border-b border-border/60 px-2 py-2 text-right tabular-nums font-medium",
                        balance > 0 ? "text-warning-foreground" : "text-success",
                      )}
                    >
                      ${balance.toFixed(2)}

                    </td>
                    <td className="border-b border-border/60 px-2 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          rowState === "checked-out"
                            ? "border-pink-500/40 bg-pink-500/10 text-pink-600 dark:text-pink-400"
                            : rowState === "departing"
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : "border-success/40 bg-success/10 text-success",
                        )}
                      >
                        <span className="h-1 w-1 rounded-full bg-current" />
                        {rowState === "checked-out"
                          ? "Checked-out"
                          : rowState === "departing"
                          ? "Departing"
                          : "Staying"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Guest detail dialog */}
      {opened && (
        <Dialog open onOpenChange={(o) => !o && setOpenId(null)}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>{openedGuest?.name ?? "Guest"}</DialogTitle>
              <DialogDescription>
                Room {openedRoom?.number ?? "—"} · {opened.checkIn} → {opened.checkOut}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <Section title="Guest">
                <Row k="Name" v={openedGuest?.name ?? "—"} />
                <Row k="Phone" v={openedGuest?.phone || "—"} />
                <Row k="Email" v={openedGuest?.email || "—"} />
                <Row k="Country" v={openedGuest?.country || openedGuest?.nationality || "—"} />
                {openedGuest?.idNumber && (
                  <Row k="ID" v={`${openedGuest.idType ?? "id"} · ${openedGuest.idNumber}`} />
                )}
                {openedGuest?.vip && <Row k="Tag" v="VIP" />}
              </Section>

              <Section title="Stay">
                <Row k="Room" v={`${openedRoom?.number ?? "—"} · ${openedRoom?.type ?? ""}`} />
                <Row k="Check-in" v={opened.checkIn} />
                <Row k="Check-out" v={opened.checkOut} />
                <Row k="Nights" v={String(nightsBetween(opened.checkIn, opened.checkOut))} />
                <Row k="Rate / night" v={`$${Number(openedRoom?.price ?? 0).toFixed(2)}`} />
              </Section>

              <Section title="Folio">
                <Row k="Total" v={`$${Number(opened.totalAmount ?? 0).toFixed(2)}`} />
                <Row
                  k="Paid"
                  v={`$${(Number(opened.totalAmount ?? 0) - balanceFor(opened)).toFixed(2)}`}
                />
                <Row k="Balance" v={`$${balanceFor(opened).toFixed(2)}`} />
              </Section>
            </div>

            <DialogFooter className="flex-wrap gap-2">
              {openedGuest && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const guestId = openedGuest.id;
                    setOpenId(null);
                    window.setTimeout(() => {
                      navigate({ to: "/guest/$guestId", params: { guestId } });
                    }, 0);
                  }}
                >
                  Open profile
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  const r = opened;
                  setOpenId(null);
                  setExtendFor(r);
                }}
              >
                Extend
              </Button>
              <Button
                onClick={() => {
                  const r = opened;
                  setOpenId(null);
                  setCheckoutFor(r);
                }}
              >
                Check-out
              </Button>
              <Button variant="ghost" onClick={() => setOpenId(null)}>
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
          onOpenChange={(o) => {
            if (!o) setCheckoutFor(null);
          }}
        />
      )}

      {extendFor && (
        <ExtendStayDialog
          reservation={extendFor}
          onClose={() => setExtendFor(null)}
        />
      )}
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-foreground">{v}</span>
    </div>
  );
}
