// Guest profile: shows full reservation history, payments, totals.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Crown, Mail, Phone, MapPin, Ban, BedDouble, Receipt, Pencil, IdCard, Calendar, Tag, Wallet, TrendingUp, TrendingDown, ShoppingBag, Trash2, Activity as ActivityIcon, CreditCard } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useHotelStore, type Reservation, type Payment, type ProductSale } from "@/store/hotel-store";
import { EditGuestDialog } from "@/components/guests/EditGuestDialog";
import { ExtendStayDialog } from "@/components/reservations/ExtendStayDialog";
import { CheckoutDialog } from "@/components/reservations/CheckoutDialog";
import { RecordPaymentDialog } from "@/components/payments/RecordPaymentDialog";
import { EditPaymentDialog } from "@/components/payments/EditPaymentDialog";
import { useConfirm } from "@/components/system/ConfirmDialog";
import { toast } from "sonner";


export const Route = createFileRoute("/guest/$guestId")({
  component: GuestProfile,
});

function GuestProfile() {
  const { guestId } = Route.useParams();
  const [editOpen, setEditOpen] = useState(false);
  const [extendRes, setExtendRes] = useState<Reservation | null>(null);
  const [checkoutRes, setCheckoutRes] = useState<Reservation | null>(null);
  const [payRes, setPayRes] = useState<Reservation | null>(null);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const confirm = useConfirm();
  const deletePayment = useHotelStore((s) => s.deletePayment);
  const deleteProductSale = useHotelStore((s) => s.deleteProductSale);
  const productSalesAll = useHotelStore((s) => s.productSales);
  const guest = useHotelStore((s) => s.guests.find((g) => g.id === guestId));
  const allReservations = useHotelStore((s) => s.reservations);
  const getBalance = useHotelStore((s) => s.getReservationBalance);

  const reservations = useMemo(
    () => allReservations.filter((r) => r.guestId === guestId),
    [allReservations, guestId],
  );
  const rooms = useHotelStore((s) => s.rooms);
  const payments = useHotelStore((s) => s.payments);
  const settings = useHotelStore((s) => s.settings);

  const guestPayments = useMemo(() => {
    const resIds = new Set(reservations.map((r) => r.id));
    return payments.filter((p) => resIds.has(p.reservationId));
  }, [payments, reservations]);

  const stats = useMemo(() => {
    const totalSpent = guestPayments
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + p.amount, 0);
    const nights = reservations
      .filter((r) => r.status === "checked-out")
      .reduce((s, r) => {
        const d = (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 86_400_000;
        return s + Math.max(0, Math.round(d));
      }, 0);
    return {
      totalStays: reservations.filter((r) => r.status === "checked-out").length,
      activeStays: reservations.filter((r) => r.status === "checked-in" || r.status === "confirmed").length,
      totalSpent,
      totalNights: nights,
    };
  }, [reservations, guestPayments]);

  // Outstanding balance across all active reservations
  const balanceSummary = useMemo(() => {
    let total = 0, paid = 0, balance = 0;
    reservations
      .filter((r) => r.status === "checked-in" || r.status === "confirmed")
      .forEach((r) => {
        const b = getBalance(r.id);
        total += b.total;
        paid += b.paid;
        balance += b.balance;
      });
    return { total, paid, balance };
  }, [reservations, getBalance, payments]);

  if (!guest) {
    return (
      <AppLayout title="Guest not found">
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">No guest with this ID.</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/guests"><ArrowLeft className="h-4 w-4" /> Back to guests</Link>
          </Button>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={guest.name} subtitle="Guest profile & history">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2">
          <Link to="/guests"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>

        {/* Header card */}
        <Card className="border-border/60 p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <Avatar className="h-20 w-20">
                {guest.profilePhotoDataUrl && (
                  <AvatarImage src={guest.profilePhotoDataUrl} alt={guest.name} />
                )}
                <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
                  {guest.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">{guest.name}</h2>
                  {guest.vip && (
                    <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1">
                      <Crown className="h-3 w-3" /> VIP
                    </Badge>
                  )}
                  {guest.doNotRent && (
                    <Badge variant="outline" className="border-destructive/40 text-destructive gap-1">
                      <Ban className="h-3 w-3" /> Do Not Rent
                    </Badge>
                  )}
                </div>
                <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  {guest.email && <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {guest.email}</div>}
                  {guest.phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {guest.phone}</div>}
                  {(guest.country || guest.city || guest.nationality) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {[guest.nationality, guest.city, guest.country].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  {guest.dateOfBirth && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Born {guest.dateOfBirth}
                    </div>
                  )}
                  {guest.idType && (
                    <div className="flex items-center gap-1.5">
                      <IdCard className="h-3.5 w-3.5" />
                      <span className="capitalize">{guest.idType.replace("-", " ")}:</span>
                      <span className="font-mono">{guest.idNumber}</span>
                      {guest.idExpiry && <span className="text-xs">(exp {guest.idExpiry})</span>}
                    </div>
                  )}
                </div>
                {(guest.tags ?? []).length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    {(guest.tags ?? []).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                )}
                {guest.notes && (
                  <p className="mt-3 max-w-md rounded-md border border-border bg-muted/40 p-2 text-xs text-foreground">
                    📝 {guest.notes}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="gap-1">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                <Stat label="Total stays" value={stats.totalStays} />
                <Stat label="Active" value={stats.activeStays} />
                <Stat label="Nights" value={stats.totalNights} />
                <Stat label="Spent" value={`${settings.currency} ${stats.totalSpent.toFixed(0)}`} />
              </div>
            </div>
          </div>
        </Card>

        {/* ID document photo + Preferences */}
        {(guest.idPhotoDataUrl || guest.preferences) && (
          <div className="grid gap-4 md:grid-cols-2">
            {guest.idPhotoDataUrl && (
              <Card className="border-border/60 p-4 shadow-card">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <IdCard className="h-4 w-4 text-primary" /> ID Document
                </div>
                <img
                  src={guest.idPhotoDataUrl}
                  alt="ID"
                  className="max-h-64 w-full rounded border border-border object-contain"
                />
              </Card>
            )}
            {guest.preferences &&
              Object.values(guest.preferences).some((v) => v !== undefined && v !== "") && (
                <Card className="border-border/60 p-4 shadow-card">
                  <div className="mb-3 text-sm font-semibold">Preferences</div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    {guest.preferences.roomType && <PrefRow label="Room type" value={guest.preferences.roomType} />}
                    {guest.preferences.floor !== undefined && <PrefRow label="Floor" value={String(guest.preferences.floor)} />}
                    {guest.preferences.bedType && <PrefRow label="Bed" value={guest.preferences.bedType} />}
                    {guest.preferences.pillow && <PrefRow label="Pillow" value={guest.preferences.pillow} />}
                    {guest.preferences.language && <PrefRow label="Language" value={guest.preferences.language} />}
                    {guest.preferences.smoking !== undefined && (
                      <PrefRow label="Smoking" value={guest.preferences.smoking ? "Yes" : "No"} />
                    )}
                    {guest.preferences.other && (
                      <div className="col-span-2 mt-1 rounded border border-border bg-muted/30 p-2">
                        {guest.preferences.other}
                      </div>
                    )}
                  </dl>
                </Card>
              )}
          </div>
        )}

        {/* Balance summary */}
        {balanceSummary.total > 0 && (
          <Card className="border-border/60 p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Wallet className="h-4 w-4 text-primary" /> Active Balance
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Total billed</p>
                <p className="mt-1 text-base font-bold tabular-nums">{settings.currency} {balanceSummary.total.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Paid
                </p>
                <p className="mt-1 text-base font-bold text-emerald-600 tabular-nums">{settings.currency} {balanceSummary.paid.toFixed(2)}</p>
              </div>
              <div className={`rounded-lg border p-3 ${balanceSummary.balance > 0 ? "border-rose-500/30 bg-rose-500/5" : "border-emerald-500/30 bg-emerald-500/5"}`}>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <TrendingDown className="h-3 w-3" /> Outstanding
                </p>
                <p className={`mt-1 text-base font-bold tabular-nums ${balanceSummary.balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {settings.currency} {balanceSummary.balance.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Reservations */}
        <Card className="border-border/60 shadow-card">
          <div className="flex items-center gap-2 border-b border-border p-4 text-sm font-semibold">
            <BedDouble className="h-4 w-4 text-primary" /> Reservations · {reservations.length}
          </div>
          {reservations.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No reservations yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...reservations]
                  .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
                  .map((r) => {
                    const rm = rooms.find((x) => x.id === r.roomId);
                    const isActive = r.status === "checked-in" || r.status === "confirmed";
                    const todayIso = new Date().toISOString().slice(0, 10);
                    const isOverstay = r.status === "checked-in" && r.checkOut < todayIso;
                    const bal = isActive ? getBalance(r.id) : null;
                    return (
                      <TableRow key={r.id} className={isOverstay ? "bg-destructive/5" : undefined}>
                        <TableCell>{rm ? `Room ${rm.number}` : "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{r.checkIn}</TableCell>
                        <TableCell className={isOverstay ? "text-destructive font-medium" : "text-muted-foreground"}>
                          {r.checkOut}{isOverstay && " (overstay)"}
                        </TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {settings.currency} {r.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {bal ? (
                            <span className={bal.balance > 0 ? "font-semibold text-rose-600" : "text-emerald-600"}>
                              {settings.currency} {bal.balance.toFixed(2)}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {isActive && (
                            <div className="flex justify-end gap-1">
                              {bal && bal.balance > 0 && (
                                <Button size="sm" variant="default" className="gap-1" onClick={() => setPayRes(r)}>
                                  <Wallet className="h-3.5 w-3.5" /> Pay
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => setExtendRes(r)}>
                                Extend
                              </Button>
                              {r.status === "checked-in" && (
                                <Button size="sm" onClick={() => setCheckoutRes(r)}>
                                  Check out
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </Card>


        {/* Payments */}
        <Card className="border-border/60 shadow-card">
          <div className="flex items-center gap-2 border-b border-border p-4 text-sm font-semibold">
            <Receipt className="h-4 w-4 text-primary" /> Payments · {guestPayments.length}
          </div>
          {guestPayments.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No payments recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guestPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">{p.date}</TableCell>
                    <TableCell className="capitalize">{p.method}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right font-semibold">
                      {settings.currency} {p.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
      {editOpen && (
        <EditGuestDialog open={editOpen} onOpenChange={setEditOpen} guestId={guestId} />
      )}
      {extendRes && (
        <ExtendStayDialog reservation={extendRes} onClose={() => setExtendRes(null)} />
      )}
      {checkoutRes && (
        <CheckoutDialog
          reservation={checkoutRes}
          open={!!checkoutRes}
          onOpenChange={(o) => !o && setCheckoutRes(null)}
        />
      )}
      {payRes && (
        <RecordPaymentDialog
          reservation={payRes}
          open={!!payRes}
          onOpenChange={(o) => !o && setPayRes(null)}
        />
      )}
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 min-w-[80px]">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function PrefRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </>
  );
}
