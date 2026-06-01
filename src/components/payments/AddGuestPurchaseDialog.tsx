// Add a product purchase directly to a guest's account from the profile.
// Pulls from product inventory, decrements stock via recordProductSale.
import { useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useHotelStore, type Reservation } from "@/store/hotel-store";
import { toast } from "sonner";

interface Props {
  guestId: string;
  reservations: Reservation[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function AddGuestPurchaseDialog({ guestId, reservations, open, onOpenChange }: Props) {
  const products = useHotelStore((s) => s.productItems);
  const settings = useHotelStore((s) => s.settings);
  const recordProductSale = useHotelStore((s) => s.recordProductSale);
  const rooms = useHotelStore((s) => s.rooms);

  const chargeable = useMemo(
    () => reservations.filter((r) => r.status === "checked-in" || r.status === "confirmed"),
    [reservations],
  );
  const defaultResId = chargeable[0]?.id ?? reservations[0]?.id ?? "";

  const [reservationId, setReservationId] = useState(defaultResId);
  const [productId, setProductId] = useState<string>("");
  const [quantity, setQuantity] = useState("1");

  const product = products.find((p) => p.id === productId);
  const qNum = parseInt(quantity, 10);
  const valid =
    !!product &&
    !!reservationId &&
    Number.isFinite(qNum) &&
    qNum > 0 &&
    qNum <= product.stock;
  const total = valid ? qNum * product!.price : 0;

  const fmt = (n: number) => `${settings.currency} ${n.toFixed(2)}`;

  const handleSubmit = () => {
    if (!valid || !product) {
      toast.error("Pick a product and valid quantity");
      return;
    }
    const res = reservations.find((r) => r.id === reservationId);
    if (!res) {
      toast.error("Select a reservation");
      return;
    }
    const result = recordProductSale({
      productId: product.id,
      quantity: qNum,
      roomId: res.roomId,
      reservationId: res.id,
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Added ${qNum}× ${product.name}`, {
      description: `${fmt(result.sale.total)} charged to room`,
    });
    setProductId("");
    setQuantity("1");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" /> Add purchase
          </DialogTitle>
          <DialogDescription>
            Charge a product from inventory to this guest's account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Charge to reservation</Label>
            <Select value={reservationId} onValueChange={setReservationId}>
              <SelectTrigger><SelectValue placeholder="Select reservation" /></SelectTrigger>
              <SelectContent>
                {reservations.length === 0 && (
                  <SelectItem value="none" disabled>No reservations</SelectItem>
                )}
                {reservations.map((r) => {
                  const room = rooms.find((rm) => rm.id === r.roomId);
                  return (
                    <SelectItem key={r.id} value={r.id}>
                      Room {room?.number ?? "?"} · {r.status}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {products.length === 0 && (
                  <SelectItem value="none" disabled>No products in inventory</SelectItem>
                )}
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id} disabled={p.stock <= 0}>
                    {p.name} — {fmt(p.price)} ({p.stock} left)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Quantity</Label>
            <Input
              type="number"
              min={1}
              max={product?.stock ?? 1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm font-semibold">
            Total: {fmt(total)}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!valid}>Add to account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
