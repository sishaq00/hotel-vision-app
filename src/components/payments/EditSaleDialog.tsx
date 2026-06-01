// Edit an existing product sale: quantity & unit price. Adjusts stock automatically.
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHotelStore, type ProductSale } from "@/store/hotel-store";
import { toast } from "sonner";

interface Props {
  sale: ProductSale;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function EditSaleDialog({ sale, open, onOpenChange }: Props) {
  const update = useHotelStore((s) => s.updateProductSale);
  const product = useHotelStore((s) => s.productItems.find((p) => p.id === sale.productId));
  const settings = useHotelStore((s) => s.settings);

  const [quantity, setQuantity] = useState(String(sale.quantity));
  const [unitPrice, setUnitPrice] = useState(String(sale.unitPrice));

  const qNum = parseInt(quantity, 10);
  const pNum = Number(unitPrice);
  const maxQty = (product?.stock ?? 0) + sale.quantity; // current stock + what this sale already holds
  const valid =
    Number.isFinite(qNum) && qNum > 0 && qNum <= maxQty &&
    Number.isFinite(pNum) && pNum >= 0;
  const total = valid ? qNum * pNum : 0;

  const save = () => {
    if (!valid) {
      toast.error(`Quantity 1–${maxQty}, price ≥ 0`);
      return;
    }
    const res = update(sale.id, { quantity: qNum, unitPrice: pNum });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Purchase updated");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit purchase · {sale.productName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stock available</span>
              <span className="font-mono">{product?.stock ?? 0} (+{sale.quantity} from this sale)</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" min={1} max={maxQty} value={quantity}
                onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Unit price</Label>
              <Input type="number" min={0} step="0.01" value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)} />
            </div>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm font-semibold">
            Total: {settings.currency} {total.toFixed(2)}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={!valid}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
