// Check-out dialog: shows itemized invoice + persists & downloads PDF.
import { useMemo, useState } from "react";
import { Download, LogOut, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useHotelStore,
  type PaymentMethod,
  type Reservation,
} from "@/store/hotel-store";
import { downloadInvoicePDF } from "@/lib/invoice-pdf";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { CustomRateControl, type ManualRateValue } from "./CustomRateControl";
import { recordRateOverride } from "@/lib/print-log";
import { useConfirm } from "@/components/system/ConfirmDialog";
import { AlertTriangle } from "lucide-react";

interface CheckoutDialogProps {
  reservation: Reservation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutDialog({
  reservation,
  open,
  onOpenChange,
}: CheckoutDialogProps) {
  const previewInvoice = useHotelStore((s) => s.previewInvoice);
  const checkOut = useHotelStore((s) => s.checkOut);
  const guests = useHotelStore((s) => s.guests);
  const rooms = useHotelStore((s) => s.rooms);
  const settings = useHotelStore((s) => s.settings);
  const getReservationBalance = useHotelStore((s) => s.getReservationBalance);
  const payments = useHotelStore((s) => s.payments);
  const productSales = useHotelStore((s) => s.productSales);
  const folios = useHotelStore((s) => s.folios);
  const { t } = useT();
  const confirm = useConfirm();

  const [method, setMethod] = useState<PaymentMethod>("card");
  const [markPaid, setMarkPaid] = useState(true);
  // Final-total adjustment (e.g. compensation, last-minute discount/charge).
  const [finalAdjust, setFinalAdjust] = useState<ManualRateValue | null>(null);

  const guest = guests.find((g) => g.id === reservation.guestId);
  const room = rooms.find((r) => r.id === reservation.roomId);

  // Live preview while dialog is open — recompute when extras change too
  const invoice = useMemo(
    () => previewInvoice(reservation.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reservation.id, open, settings.taxRate, settings.serviceFeeRate, productSales, folios],
  );

  // Outstanding balance (already-recorded payments vs current invoice total)
  const balanceInfo = useMemo(
    () => getReservationBalance(reservation.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reservation.id, open, payments, productSales, folios, settings.taxRate, settings.serviceFeeRate],
  );

  if (!room || !invoice) return null;

  const fmt = (n: number) =>
    `${invoice.currency} ${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const adjustedTotal = finalAdjust ? finalAdjust.amount : invoice.total;
  const adjustmentDelta = finalAdjust ? adjustedTotal - invoice.total : 0;
  const outstanding = Math.max(0, (markPaid ? 0 : balanceInfo.balance));

  const handleConfirm = async (downloadPdf: boolean) => {
    // If a final adjustment is set, mutate the reservation's totalAmount so
    // buildInvoice (called inside checkOut) derives the adjusted subtotal/tax.
    if (finalAdjust && room) {
      const taxRate = Math.max(0, settings.taxRate ?? 0);
      const serviceFeeRate = Math.max(0, settings.serviceFeeRate ?? 0);
      const factor = 1 + taxRate + serviceFeeRate;
      const targetSubtotal = factor > 0 ? Math.round((adjustedTotal / factor) * 100) / 100 : adjustedTotal;
      const noteAddendum = `[Final adjustment at checkout: ${invoice.currency} ${invoice.total.toFixed(2)} → ${invoice.currency} ${adjustedTotal.toFixed(2)} (Δ ${adjustmentDelta >= 0 ? "+" : ""}${adjustmentDelta.toFixed(2)}) — Reason: ${finalAdjust.reason}]`;
      useHotelStore.setState((s) => ({
        reservations: s.reservations.map((r) =>
          r.id === reservation.id
            ? {
                ...r,
                totalAmount: targetSubtotal,
                notes: [r.notes?.trim(), noteAddendum].filter(Boolean).join(" ").trim(),
              }
            : r,
        ),
      }));
    }

    // Outstanding balance guard: if user is checking out without recording
    // payment AND there is still money owed → require explicit confirmation.
    let force = false;
    if (!markPaid && balanceInfo.balance > 0) {
      const ok = await confirm({
        title: "Outstanding balance",
        description: `${guest?.name ?? "Guest"} still owes ${fmt(balanceInfo.balance)}. Checking out now will leave the folio unpaid. Continue anyway?`,
        confirmLabel: "Force check-out (unpaid)",
        cancelLabel: "Go back",
        destructive: true,
      });
      if (!ok) return;
      force = true;
    }

    const finalInvoice = checkOut(reservation.id, {
      paymentMethod: method,
      markPaid,
      force,
    });
    if (!finalInvoice) {
      toast.error(t("co.failed"));
      return;
    }
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
      downloadInvoicePDF({
        invoice: finalInvoice,
        reservation,
        guest,
        room,
        settings,
      });
    }
    toast.success(t("co.success"), {
      description: `${finalInvoice.invoiceNumber} · ${fmt(finalInvoice.total)}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("co.title")}</DialogTitle>
          <DialogDescription>{t("co.desc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stay summary */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">{guest?.name ?? t("res.guest")}</span>
              <span className="text-muted-foreground">{t("co.room")} {room.number}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {reservation.checkIn} → {reservation.checkOut} · {invoice.nights} {invoice.nights > 1 ? t("co.nights-plural") : t("co.nights")}
            </div>
          </div>

          {/* Itemized */}
          <div className="space-y-1.5 rounded-lg border border-border p-4 text-sm">
            <Row
              label={`${t("co.room-rate")} × ${invoice.nights}`}
              value={fmt(invoice.subtotal)}
              hint={`${fmt(invoice.ratePerNight)} / ${t("co.nights")}`}
            />
            <Row
              label={`${t("co.vat")} (${(invoice.taxRate * 100).toFixed(1)}%)`}
              value={fmt(invoice.taxAmount)}
            />
            <Row
              label={`${t("co.service-fee")} (${(invoice.serviceFeeRate * 100).toFixed(1)}%)`}
              value={fmt(invoice.serviceFeeAmount)}
            />
            {invoice.extras && invoice.extras.length > 0 && (
              <>
                <div className="my-2 h-px bg-border" />
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Extras (POS / mini-bar / laundry)
                </div>
                {invoice.extras.map((e, i) => (
                  <Row
                    key={i}
                    label={e.description}
                    value={fmt(e.amount)}
                    hint={e.category}
                  />
                ))}
                <Row label="Extras subtotal" value={fmt(invoice.extrasTotal ?? 0)} />
              </>
            )}
            <div className="my-2 h-px bg-border" />
            <div className="flex items-baseline justify-between">
              <span className="text-base font-semibold text-foreground">{t("co.total-due")}</span>
              <span className={`text-xl font-bold ${finalAdjust ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {fmt(invoice.total)}
              </span>
            </div>
            {finalAdjust && (
              <>
                <div className="flex items-baseline justify-between text-xs">
                  <span className={adjustmentDelta < 0 ? "text-success" : "text-destructive"}>
                    Adjustment ({adjustmentDelta >= 0 ? "+" : ""}{fmt(adjustmentDelta)})
                  </span>
                  <span className={adjustmentDelta < 0 ? "text-success" : "text-destructive"}>
                    {adjustmentDelta >= 0 ? "+" : ""}{fmt(adjustmentDelta)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t border-border pt-2">
                  <span className="text-base font-semibold text-foreground">Adjusted total</span>
                  <span className="text-2xl font-bold text-foreground">{fmt(adjustedTotal)}</span>
                </div>
              </>
            )}
          </div>

          {/* Final adjustment override */}
          <CustomRateControl
            defaultRate={invoice.total}
            value={finalAdjust}
            onChange={setFinalAdjust}
            fieldLabel="Final total adjustment"
            triggerLabel="Adjust final total / تعديل الإجمالي"
            currency={invoice.currency + " "}
          />

          {/* Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("co.payment-method")}</Label>
              <Select
                value={method}
                onValueChange={(v) => setMethod(v as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">{t("co.method-card")}</SelectItem>
                  <SelectItem value="cash">{t("co.method-cash")}</SelectItem>
                  <SelectItem value="transfer">{t("co.method-transfer")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={markPaid}
                  onCheckedChange={(v) => setMarkPaid(v === true)}
                />
                {t("co.record-payment")}
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              window.open(`/print-invoice/${reservation.id}`, "_blank");
            }}
            title="Open printable invoice"
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button type="button" variant="secondary" onClick={() => handleConfirm(false)}>
            <LogOut className="h-4 w-4" /> {t("co.checkout-only")}
          </Button>
          <Button type="button" onClick={() => handleConfirm(true)}>
            <Download className="h-4 w-4" /> {t("co.checkout-pdf")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <div>
        <div className="text-foreground">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  );
}
