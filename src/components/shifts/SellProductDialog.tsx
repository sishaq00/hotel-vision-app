import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHotelStore, type ProductItem } from "@/store/hotel-store";
import { toast } from "sonner";

interface Props {
  product: ProductItem | null;
  onClose: () => void;
}

export function SellProductDialog({ product, onClose }: Props) {
  const reservations = useHotelStore((s) => s.reservations);
  const rooms = useHotelStore((s) => s.rooms);
  const guests = useHotelStore((s) => s.guests);
  const settings = useHotelStore((s) => s.settings);
  const recordProductSale = useHotelStore((s) => s.recordProductSale);

  const [quantity, setQuantity] = useState("1");
  const [reservationId, setReservationId] = useState<string>("none");

  const inHouse = useMemo(
    () =>
      reservations
        .filter((r) => r.status === "checked-in")
        .map((r) => {
          const room = rooms.find((rm) => rm.id === r.roomId);
          const guest = guests.find((g) => g.id === r.guestId);
          return {
            id: r.id,
            label: `Room ${room?.number ?? "?"} · ${guest?.name ?? "Guest"}`,
          };
        }),
    [reservations, rooms, guests],
  );

  if (!product) return null;

  const qNum = parseInt(quantity, 10);
  const valid = Number.isFinite(qNum) && qNum > 0 && qNum <= product.stock;
  const total = valid ? qNum * product.price : 0;

  const handleSubmit = () => {
    if (!valid) {
      toast.error(`Quantity must be 1–${product.stock}`);
      return;
    }
    const res = reservationId !== "none" ? reservations.find((r) => r.id === reservationId) : undefined;
    const result = recordProductSale({
      productId: product.id,
      quantity: qNum,
      roomId: res?.roomId,
      reservationId: res?.id,
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Sold ${qNum}× ${product.name}`, {
      description: `${settings.currency} ${result.sale.total.toFixed(2)} collected`,
    });
    onClose();
  };

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Sell · {product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unit price</span>
              <span className="font-mono">{settings.currency} {product.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">In stock</span>
              <span className="font-mono">{product.stock}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              max={product.stock}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Charge to room (optional)</Label>
            <Select value={reservationId} onValueChange={setReservationId}>
              <SelectTrigger>
                <SelectValue placeholder="Walk-in cash sale" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Walk-in cash sale —</SelectItem>
                {inHouse.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm font-semibold">
            Total: {settings.currency} {total.toFixed(2)}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!valid}>Confirm sale</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
