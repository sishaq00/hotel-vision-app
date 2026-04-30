import { useState } from "react";
import { FileMinus } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useHotelStore } from "@/store/hotel-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reservationId: string;
}

export function IssueCreditNoteDialog({ open, onOpenChange, reservationId }: Props) {
  const reservation = useHotelStore((s) => s.reservations.find((r) => r.id === reservationId));
  const issue = useHotelStore((s) => s.issueCreditNote);
  const settings = useHotelStore((s) => s.settings);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [cancelInvoice, setCancelInvoice] = useState(false);

  const inv = reservation?.invoice;

  const handleIssue = () => {
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    const result = issue({
      reservationId,
      amount: num,
      reason: reason.trim(),
      cancelInvoice,
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Credit note ${result.number} issued`);
    setAmount("");
    setReason("");
    setCancelInvoice(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileMinus className="h-5 w-5 text-destructive" /> Issue Credit Note
          </DialogTitle>
          <DialogDescription>
            Refund or correct an invoice. The credit note is recorded permanently with a sequential number.
          </DialogDescription>
        </DialogHeader>

        {inv ? (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original invoice</span>
                <span className="font-mono font-semibold">{inv.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice total</span>
                <span className="font-semibold">{settings.currency} {inv.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Credit amount ({settings.currency})</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setAmount(inv.total.toFixed(2))}
              >
                Use full invoice amount
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Reason</Label>
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Refund for early checkout, billing correction…"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <div>
                <Label htmlFor="cancel-inv" className="font-medium">Cancel original invoice</Label>
                <p className="text-xs text-muted-foreground">Marks the invoice as fully voided</p>
              </div>
              <Switch
                id="cancel-inv"
                checked={cancelInvoice}
                onCheckedChange={setCancelInvoice}
              />
            </div>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No invoice exists on this reservation yet.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {inv && (
            <Button variant="destructive" onClick={handleIssue}>
              Issue Credit Note
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
