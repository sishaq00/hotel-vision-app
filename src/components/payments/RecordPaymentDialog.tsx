// Record a payment against a reservation (cash / card / transfer).
// Reduces outstanding balance immediately.
import { useMemo, useState } from "react";
import { Banknote, CreditCard, ArrowRightLeft, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useHotelStore, type PaymentMethod, type Reservation } from "@/store/hotel-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const addPayment = useHotelStore((s) => s.addPayment);
  const getBalance = useHotelStore((s) => s.getReservationBalance);

  const balance = useMemo(
    () => getBalance(reservation.id),
    [getBalance, reservation.id, open],
  );

  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState<string>(balance.balance.toFixed(2));

  const fmt = (n: number) =>
    `${settings.currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const num = Number(amount);
  const valid = !isNaN(num) && num > 0;

  const handleRecord = () => {
    if (!valid) {
      toast.error("Enter a valid amount");
      return;
    }
    addPayment({
      reservationId: reservation.id,
      amount: Math.round(num * 100) / 100,
      method,
      status: "paid",
      date: new Date().toISOString().slice(0, 10),
    });
    toast.success(`Payment of ${fmt(num)} recorded`);
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleRecord} disabled={!valid}>
            Record {valid ? fmt(num) : "payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
