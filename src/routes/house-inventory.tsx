import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Package, Plus, AlertTriangle } from "lucide-react";
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
import { useHotelStore, type InventoryItem } from "@/store/hotel-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/house-inventory")({
  head: () => ({
    meta: [
      { title: "House Inventory — NEXORA OS" },
      { name: "description", content: "Linens, amenities, cleaning supplies." },
    ],
  }),
  component: HouseInventoryPage,
});

const CATEGORIES: InventoryItem["category"][] = ["linen", "amenity", "cleaning", "other"];

function HouseInventoryPage() {
  const items = useHotelStore((s) => s.inventoryItems);
  const add = useHotelStore((s) => s.addInventoryItem);
  const updateQty = useHotelStore((s) => s.updateInventoryQuantity);
  const [open, setOpen] = useState(false);

  const lowStock = useMemo(() => items.filter((i) => i.quantity <= i.reorderLevel).length, [items]);

  return (
    <AppLayout title="House Inventory" subtitle={`${items.length} item${items.length === 1 ? "" : "s"} · ${lowStock} low stock`}>
      <Card className="border-border/60 shadow-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-sm font-semibold">Stock levels</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> New item</Button></DialogTrigger>
            <NewInventoryDialog onSubmit={(i) => { add(i); toast.success("Item added"); setOpen(false); }} />
          </Dialog>
        </div>
        {items.length === 0 ? (
          <EmptyState icon={Package} title="No inventory" description="Track linens, towels, amenities and cleaning supplies." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Reorder at</TableHead>
                <TableHead className="text-right">Adjust</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => {
                const low = i.quantity <= i.reorderLevel;
                return (
                  <TableRow key={i.id} className={cn(low && "bg-destructive/5")}>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell className="capitalize text-xs">{i.category}</TableCell>
                    <TableCell className="font-mono">
                      {low && <AlertTriangle className="mr-1 inline h-3 w-3 text-destructive" />}
                      {i.quantity} {i.unit}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i.reorderLevel} {i.unit}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => updateQty(i.id, Math.max(0, i.quantity - 1))}>−</Button>
                        <Button size="sm" variant="outline" onClick={() => updateQty(i.id, i.quantity + 1)}>+</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppLayout>
  );
}

function NewInventoryDialog({ onSubmit }: { onSubmit: (i: Omit<InventoryItem, "id">) => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<InventoryItem["category"]>("linen");
  const [quantity, setQuantity] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("5");
  const [unit, setUnit] = useState("pcs");
  return (
    <DialogContent className="sm:max-w-[420px]">
      <DialogHeader><DialogTitle>New inventory item</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bath towel — large" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as InventoryItem["category"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Unit</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Reorder level</Label><Input type="number" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} /></div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => {
          const q = parseInt(quantity, 10), rl = parseInt(reorderLevel, 10);
          if (!name.trim()) { toast.error("Name required"); return; }
          onSubmit({ name: name.trim(), category, quantity: Number.isFinite(q) ? q : 0, reorderLevel: Number.isFinite(rl) ? rl : 0, unit: unit.trim() || "pcs" });
        }}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}
