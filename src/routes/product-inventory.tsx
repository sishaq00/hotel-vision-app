import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShoppingBag, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useHotelStore, type ProductItem } from "@/store/hotel-store";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/product-inventory")({
  head: () => ({
    meta: [
      { title: "Product Inventory — NEXORA OS" },
      { name: "description", content: "Minibar, spa, and resale products." },
    ],
  }),
  component: ProductInventoryPage,
});

const CATEGORIES: ProductItem["category"][] = ["minibar", "spa", "restaurant", "other"];

function ProductInventoryPage() {
  const { t } = useT();
  const items = useHotelStore((s) => s.productItems);
  const settings = useHotelStore((s) => s.settings);
  const add = useHotelStore((s) => s.addProductItem);
  const updateStock = useHotelStore((s) => s.updateProductStock);
  const [open, setOpen] = useState(false);

  return (
    <AppLayout title={t("nav.product-inventory")} subtitle={`${items.length} product${items.length === 1 ? "" : "s"}`}>
      <Card className="border-border/60 shadow-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-sm font-semibold">Postable products</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> New product</Button></DialogTrigger>
            <NewProductDialog onSubmit={(p) => { add(p); toast.success("Product added"); setOpen(false); }} />
          </Dialog>
        </div>
        {items.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No products" description="Add minibar, spa or restaurant items used by Fast Posting." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Adjust</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="capitalize text-xs">{p.category}</TableCell>
                  <TableCell className="font-mono">{settings.currency} {p.price.toFixed(2)}</TableCell>
                  <TableCell className="font-mono">{p.stock}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => updateStock(p.id, Math.max(0, p.stock - 1))}>−</Button>
                      <Button size="sm" variant="outline" onClick={() => updateStock(p.id, p.stock + 1)}>+</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppLayout>
  );
}

function NewProductDialog({ onSubmit }: { onSubmit: (p: Omit<ProductItem, "id">) => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductItem["category"]>("minibar");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  return (
    <DialogContent className="sm:max-w-[420px]">
      <DialogHeader><DialogTitle>New product</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mineral water 500ml" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ProductItem["category"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Price</Label><Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Initial stock</Label><Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button onClick={() => {
          const pr = parseFloat(price), st = parseInt(stock, 10);
          if (!name.trim() || !Number.isFinite(pr) || pr < 0) { toast.error("Name & price required"); return; }
          onSubmit({ name: name.trim(), category, price: pr, stock: Number.isFinite(st) ? st : 0 });
        }}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}
