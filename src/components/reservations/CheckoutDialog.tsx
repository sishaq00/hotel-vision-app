// Professional Check-out dialog.
// Shows a full itemized invoice with stay summary, extras, balance section,
// payment controls, and PDF/print actions.
import { useMemo, useState } from "react";
import {
  Download, LogOut, Printer, CreditCard, Banknote,
  ArrowRightLeft, AlertTriangle, CheckCircle2, CalendarDays,
  BedDouble, User, Hash, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  useHotelStore, type PaymentMethod, type Reservation,
} from "@/store/hotel-store";
import { downloadInvoicePDF } from "@/lib/invoice-pdf";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { CustomRateControl, type ManualRateValue } from "./CustomRateControl";
import { recordRateOverride } from "@/lib/print-log";
import { useConfirm } from "@/components/system/ConfirmDialog";
import { cn } from "@/lib/utils";

interface CheckoutDialogProps {
  reservation: Reservation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Helper: currency formatter ──────────────────────────────────────────────

function useFmt(currency: string) {
  return (n: number) =>
    `${currency} ${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
}

// ─── Line row ─────────────────────────────────────────────────────────────────

function LineRow({
  label, value, hint, muted, strong, positive, negative,
}: {
  label: string; value: string; hint?: string;
  muted?: boolean; strong?: boolean; positive?: boolean; negative?: boolean;
}) {
  return (
    <div className="flex items-start justify-between py-1.5">
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", muted && "text-muted-foreground")}>{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <p className={cn(
        "ml-4 shrink-0 text-sm font-medium tabular-nums",
        strong && "text-base font-semibold text-foreground",
        positive && "text-emerald-600 dark:text-emerald-400",
        negative && "text-rose-600 dark:text-rose-400",
        muted && "text-muted-foreground",
      )}>
        {value}
      </p>
    </div>
  );
}

// ─── Payment method pill ─────────────────────────────────────────────────────

function MethodPill({
  value, selected, onClick,
}: { value: PaymentMethod; selected: boolean; onClick: () => void }) {
  const icons: Record<PaymentMethod, typeof CreditCard> = {
    card: CreditCard, cash: Banknote, transfer: ArrowRightLeft,
  };
  const labels: Record<PaymentMethod, string> = {
    card: "Card", cash: "Cash", transfer: "Transfer",
  };
  const Icon = icons[value];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all",
        selected
          ? "border-primary bg-primary/5 text-primary"
          : "border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-accent",
      )}
    >
      <Icon className="h-4 w-4" />
      {labels[value]}
    </button>
  );
}

// ─── Main dialog ─────────────────────────────────────────────────────────────

export function CheckoutDialog({ reservation, open, onOpenChange }: CheckoutDialogProps) {
  const previewInvoice        = useHotelStore((s) => s.previewInvoice);
  const checkOut              = useHotelStore((s) => s.checkOut);
  const guests                = useHotelStore((s) => s.guests);
  const rooms                 = useHotelStore((s) => s.rooms);
  const settings              = useHotelStore((s) => s.settings);
  const getReservationBalance = useHotelStore((s) => s.getReservationBalance);
  const payments              = useHotelStore((s) => s.payments);
  const productSales          = useHotelStore((s) => s.productSales);
  const folios                = useHotelStore((s) => s.folios);
  const { t } = useT();
  const confirm = useConfirm();

  const [method, setMethod]         = useState<PaymentMethod>("card");
  const [markPaid, setMarkPaid]     = useState(true);
  const [finalAdjust, setFinalAdjust] = useState<ManualRateValue | null>(null);

  const guest = guests.find((g) => g.id === reservation.guestId);
  const room  = rooms.find((r) => r.id === reservation.roomId);

  const invoice = useMemo(
    () => previewInvoice(reservation.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reservation.id, open, settings.taxRate, settings.serviceFeeRate, productSales, folios],
  );

  const balanceInfo = useMemo(
    () => getReservationBalance(reservation.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reservation.id, open, payments, productSales, folios, settings.taxRate, settings.serviceFeeRate],
  );

  if (!room || !invoice) return null;

  const fmt            = useFmt(invoice.currency);
  const adjustedTotal  = finalAdjust ? finalAdjust.amount : invoice.total;
  const adjustDelta    = finalAdjust ? adjustedTotal - invoice.total : 0;
  const paidAlready    = balanceInfo.paid;
  const stillOwed      = Math.max(0, adjustedTotal - paidAlready);
  const isSettled      = stillOwed <= 0 || markPaid;

  // Nights display
  const nightsLabel = `${invoice.nights} night${invoice.nights !== 1 ? "s" : ""}`;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleConfirm = async (downloadPdf: boolean) => {
    if (finalAdjust && room) {
      const taxRate        = Math.max(0, settings.taxRate ?? 0);
      const serviceFeeRate = Math.max(0, settings.serviceFeeRate ?? 0);
      const factor         = 1 + taxRate + serviceFeeRate;
      const targetSubtotal = factor > 0 ? Math.round((adjustedTotal / factor) * 100) / 100 : adjustedTotal;
      const note = `[Final adjustment at checkout: ${invoice.currency} ${invoice.total.toFixed(2)} → ${invoice.currency} ${adjustedTotal.toFixed(2)} (Δ ${adjustDelta >= 0 ? "+" : ""}${adjustDelta.toFixed(2)}) — ${finalAdjust.reason}]`;
      useHotelStore.setState((s) => ({
        reservations: s.reservations.map((r) =>
          r.id === reservation.id
            ? { ...r, totalAmount: targetSubtotal, notes: [r.notes?.trim(), note].filter(Boolean).join(" ").trim() }
            : r,
        ),
      }));
    }

    let force = false;
    if (!markPaid && balanceInfo.balance > 0) {
      const ok = await confirm({
        title: "Outstanding balance",
        description: `${guest?.name ?? "Guest"} still owes ${fmt(balanceInfo.balance)}. This will leave the folio unpaid. Continue anyway?`,
        confirmLabel: "Force check-out",
        cancelLabel: "Go back",
        destructive: true,
      });
      if (!ok) return;
      force = true;
    }

    const finalInvoice = checkOut(reservation.id, { paymentMethod: method, markPaid, force });

    // Handle balance error from our improved checkOut
    if (finalInvoice && typeof finalInvoice === "object" && "__balanceError" in finalInvoice) {
      toast.error("Outstanding balance must be settled before checkout.");
      return;
    }
    if (!finalInvoice) { toast.error(t("co.failed")); return; }

    if (finalAdjust && room) {
      recordRateOverride({
        context: "checkout-adjustment",
        reservationId: reservation.id,
        roomNumber: room.number,
        guestName: guest?.name,
        oldAmount: invoice.total,
        newAmount: adjustedTotal,
        unit: "total",
        reason: finalAdjust.reason,
      });
    }

    if (downloadPdf) {
      downloadInvoicePDF({ invoice: finalInvoice, reservation, guest, room, settings });
    }

    toast.success(t("co.success"), {
      description: `${finalInvoice.invoiceNumber} · ${fmt(finalInvoice.total)}`,
    });
    onOpenChange(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">Check-out</DialogTitle>
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-medium",
                isSettled
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                  : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400",
              )}
            >
              {isSettled ? (
                <><CheckCircle2 className="mr-1 h-3 w-3" />Folio settled</>
              ) : (
                <><AlertTriangle className="mr-1 h-3 w-3" />{fmt(stillOwed)} outstanding</>
              )}
            </Badge>
          </div>
        </DialogHeader>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-5">

            {/* Stay summary card */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>{guest?.name ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BedDouble className="h-3.5 w-3.5" />
                  <span>Room {room.number} · {room.typeCode}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>{reservation.checkIn} → {reservation.checkOut}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{nightsLabel}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Hash className="h-3.5 w-3.5" />
                  <span className="font-mono text-xs">{invoice.invoiceNumber}</span>
                </div>
              </div>
            </div>

            {/* Itemized charges */}
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Charges
              </p>

              <LineRow
                label={`Room rate × ${invoice.nights} night${invoice.nights !== 1 ? "s" : ""}`}
                value={fmt(invoice.subtotal)}
                hint={`${fmt(invoice.ratePerNight)} / night`}
              />
              {invoice.taxAmount > 0 && (
                <LineRow
                  label={`VAT (${(invoice.taxRate * 100).toFixed(1)}%)`}
                  value={fmt(invoice.taxAmount)}
                  muted
                />
              )}
              {invoice.serviceFeeAmount > 0 && (
                <LineRow
                  label={`Service fee (${(invoice.serviceFeeRate * 100).toFixed(1)}%)`}
                  value={fmt(invoice.serviceFeeAmount)}
                  muted
                />
              )}

              {/* Extras */}
              {(invoice.extras?.length ?? 0) > 0 && (
                <>
                  <Separator className="my-3" />
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Extras
                  </p>
                  {invoice.extras!.map((e, i) => (
                    <LineRow key={i} label={e.description} value={fmt(e.amount)} hint={e.category} muted />
                  ))}
                  <LineRow label="Extras subtotal" value={fmt(invoice.extrasTotal ?? 0)} />
                </>
              )}

              <Separator className="my-3" />

              {/* Total */}
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-foreground">Invoice total</span>
                <span className={cn(
                  "text-xl font-bold tabular-nums text-foreground",
                  finalAdjust && "text-sm text-muted-foreground line-through",
                )}>
                  {fmt(invoice.total)}
                </span>
              </div>

              {/* Adjustment */}
              {finalAdjust && (
                <>
                  <div className="mt-1 flex items-baseline justify-between text-xs">
                    <span className={adjustDelta < 0 ? "text-emerald-600" : "text-rose-600"}>
                      Adjustment ({adjustDelta >= 0 ? "+" : ""}{fmt(adjustDelta)}) — {finalAdjust.reason}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
                    <span className="text-sm font-semibold text-foreground">Adjusted total</span>
                    <span className="text-2xl font-bold tabular-nums text-foreground">
                      {fmt(adjustedTotal)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Balance summary */}
            <div className={cn(
              "rounded-xl border p-4",
              isSettled
                ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
                : "border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20",
            )}>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total charged</span>
                  <span className="font-medium tabular-nums">{fmt(adjustedTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Already paid</span>
                  <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                    − {fmt(paidAlready)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {isSettled ? "Balance due" : "Outstanding balance"}
                  </span>
                  <span className={cn(
                    "text-lg font-bold tabular-nums",
                    isSettled
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400",
                  )}>
                    {isSettled ? fmt(0) : fmt(stillOwed)}
                  </span>
                </div>
              </div>
            </div>

            {/* Final adjustment override */}
            <CustomRateControl
              defaultRate={invoice.total}
              value={finalAdjust}
              onChange={setFinalAdjust}
              fieldLabel="Final total adjustment"
              triggerLabel="Adjust final total"
              currency={invoice.currency + " "}
            />

            {/* Payment method */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Payment method
              </p>
              <div className="flex gap-2">
                {(["card", "cash", "transfer"] as PaymentMethod[]).map((m) => (
                  <MethodPill key={m} value={m} selected={method === m} onClick={() => setMethod(m)} />
                ))}
              </div>
            </div>

            {/* Record payment toggle */}
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3">
              <Checkbox
                checked={markPaid}
                onCheckedChange={(v) => setMarkPaid(v === true)}
                id="markPaid"
              />
              <div>
                <p className="text-sm font-medium text-foreground">Record full payment now</p>
                <p className="text-xs text-muted-foreground">
                  Mark the remaining balance as paid using the selected method above.
                </p>
              </div>
            </label>

            {/* Warning when not marking paid and balance > 0 */}
            {!markPaid && stillOwed > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-800 dark:text-amber-400">
                    Folio will not be settled
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-500">
                    {guest?.name ?? "Guest"} owes {fmt(stillOwed)}. You will be asked to confirm
                    a forced check-out.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <DialogFooter className="shrink-0 border-t border-border/60 px-6 py-4">
          <div className="flex w-full flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm"
              onClick={() => window.open(`/print-invoice/${reservation.id}`, "_blank")}
            >
              <Printer className="h-4 w-4" /> Print preview
            </Button>
            <div className="flex flex-1 justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={() => handleConfirm(false)}>
                <LogOut className="h-4 w-4" /> Check out
              </Button>
              <Button onClick={() => handleConfirm(true)}>
                <Download className="h-4 w-4" /> Check out + PDF
              </Button>
            </div>
          </div>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
