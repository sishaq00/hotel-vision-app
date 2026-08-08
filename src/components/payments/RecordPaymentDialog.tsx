// Record a payment against a reservation (cash / card / transfer).
// Reduces outstanding balance immediately. Optionally attach proof file.
import { useMemo, useRef, useState } from "react";
import { Banknote, CreditCard, ArrowRightLeft, Wallet, Paperclip, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useHotelStore, type PaymentMethod, type Reservation } from "@/store/hotel-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadFile } from "@/integrations/storage/hotel-storage";

interface Props {
  reservation: Reservation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const METHODS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "transfer", label: "Transfer", icon: ArrowRightLeft },
];

export function RecordPaymentDialog({ reservation, open, onOpenChange }: Props) {
  const settings = useHotelStore((s) => s.settings);
  const getBalance = useHotelStore((s) => s.getReservationBalance);

  const balance = useMemo(
    () => getBalance(reservation.id),
    [getBalance, reservation.id, open],
  );

  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState<string>(balance.balance.toFixed(2));
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // One idempotency key per dialog session — resubmits (double click, retry)
  // reuse the same key so Postgres returns the existing payment instead of
  // inserting a duplicate.
  const idemRef = useRef<string>(newIdempotencyKey());
  useEffect(() => {
    if (open) idemRef.current = newIdempotencyKey();
  }, [open]);

  const fmt = (n: number) =>
    `${settings.currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const num = Number(amount);
  const valid = !isNaN(num) && num > 0;

  const handleRecord = async () => {
    if (!valid) {
      toast.error("Enter a valid amount");
      return;
    }
    let proofPath: string | undefined;
    let proofName: string | undefined;
    if (proofFile) {
      setUploading(true);
      const res = await uploadFile(
        "payment-proofs",
        proofFile,
        `${reservation.id}/${Date.now()}-${proofFile.name}`,
      );
      setUploading(false);
      if (!res.ok) {
        toast.error(`Proof upload failed: ${res.error}`);
        return;
      }
      proofPath = res.path;
      proofName = proofFile.name;
    }
    setSaving(true);
    const result = await recordPayment({
      reservationId: reservation.id,
      guestId: reservation.guestId,
      amount: Math.round(num * 100) / 100,
      method,
      status: "paid",
      idempotencyKey: idemRef.current,
      proofPath,
      proofName,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.duplicate
        ? `Payment already recorded (${fmt(result.payment.amount)})`
        : `Payment of ${fmt(result.payment.amount)} recorded`,
    );
    onOpenChange(false);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Record Payment
          </DialogTitle>
          <DialogDescription>
            Add a cash, card, or transfer payment to this reservation.
          </DialogDescription>
        </DialogHeader>

        {/* Balance summary */}
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/30 p-3 text-center text-xs">
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="font-semibold tabular-nums">{fmt(balance.total)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Paid</p>
            <p className="font-semibold text-emerald-600 tabular-nums">{fmt(balance.paid)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Balance</p>
            <p className={cn("font-semibold tabular-nums", balance.balance > 0 ? "text-rose-600" : "text-emerald-600")}>
              {fmt(balance.balance)}
            </p>
          </div>
        </div>

        {/* Method picker */}
        <div className="space-y-2">
          <Label className="text-xs">Payment method</Label>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => {
              const Icon = m.icon;
              const active = method === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-md border p-3 text-xs transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label className="text-xs">Amount ({settings.currency})</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-lg font-semibold tabular-nums"
          />
          <div className="flex gap-1.5">
            <Button type="button" size="sm" variant="outline" className="h-7 flex-1 text-xs"
              onClick={() => setAmount(balance.balance.toFixed(2))}>
              Full balance
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-7 flex-1 text-xs"
              onClick={() => setAmount((balance.balance / 2).toFixed(2))}>
              Half
            </Button>
          </div>
        </div>

        {/* Proof attachment */}
        <div className="space-y-2">
          <Label className="text-xs">Proof (optional)</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
          />
          {proofFile ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2 text-xs">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 truncate">{proofFile.name}</span>
              <button
                type="button"
                onClick={() => {
                  setProofFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remove proof"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-1"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className="h-3.5 w-3.5" /> Attach receipt or screenshot
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleRecord} disabled={!valid || uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Record {valid ? fmt(num) : "payment"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
