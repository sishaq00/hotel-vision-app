// Check-out dialog: shows itemized invoice + persists & downloads PDF.
import { useMemo, useState } from "react";
import { Download, LogOut } from "lucide-react";
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

  const [method, setMethod] = useState<PaymentMethod>("card");
  const [markPaid, setMarkPaid] = useState(true);

  const guest = guests.find((g) => g.id === reservation.guestId);
  const room = rooms.find((r) => r.id === reservation.roomId);

  // Live preview while dialog is open
  const invoice = useMemo(
    () => previewInvoice(reservation.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reservation.id, open, settings.taxRate, settings.serviceFeeRate],
  );

  if (!room || !invoice) return null;

  const fmt = (n: number) =>
    `${invoice.currency} ${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const handleConfirm = (downloadPdf: boolean) => {
    const finalInvoice = checkOut(reservation.id, {
      paymentMethod: method,
      markPaid,
    });
    if (!finalInvoice) {
      toast.error("Could not complete check-out");
      return;
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
    toast.success("Checked out", {
      description: `${finalInvoice.invoiceNumber} · ${fmt(finalInvoice.total)}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Check-out & Invoice</DialogTitle>
          <DialogDescription>
            Review the bill, confirm payment and generate the invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stay summary */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">{guest?.name ?? "Guest"}</span>
              <span className="text-muted-foreground">Room {room.number}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {reservation.checkIn} → {reservation.checkOut} · {invoice.nights} night
              {invoice.nights > 1 ? "s" : ""}
            </div>
          </div>

          {/* Itemized */}
          <div className="space-y-1.5 rounded-lg border border-border p-4 text-sm">
            <Row
              label={`Room rate × ${invoice.nights}`}
              value={fmt(invoice.subtotal)}
              hint={`${fmt(invoice.ratePerNight)} / night`}
            />
            <Row
              label={`VAT (${(invoice.taxRate * 100).toFixed(1)}%)`}
              value={fmt(invoice.taxAmount)}
            />
            <Row
              label={`Service fee (${(invoice.serviceFeeRate * 100).toFixed(1)}%)`}
              value={fmt(invoice.serviceFeeAmount)}
            />
            <div className="my-2 h-px bg-border" />
            <div className="flex items-baseline justify-between">
              <span className="text-base font-semibold text-foreground">Total due</span>
              <span className="text-xl font-bold text-foreground">{fmt(invoice.total)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <Select
                value={method}
                onValueChange={(v) => setMethod(v as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={markPaid}
                  onCheckedChange={(v) => setMarkPaid(v === true)}
                />
                Record payment now
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" onClick={() => handleConfirm(false)}>
            <LogOut className="h-4 w-4" /> Check-out only
          </Button>
          <Button type="button" onClick={() => handleConfirm(true)}>
            <Download className="h-4 w-4" /> Check-out & download PDF
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
