import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Zap, Send } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useHotelStore, type FolioCharge } from "@/store/hotel-store";
import { toast } from "sonner";

export const Route = createFileRoute("/bulk-routing/fast-posting")({
  head: () => ({
    meta: [
      { title: "Fast Posting — NEXORA OS" },
      { name: "description", content: "Post a charge to multiple open folios at once." },
    ],
  }),
  component: FastPostingPage,
});

const CATEGORIES: FolioCharge["category"][] = ["room", "minibar", "spa", "restaurant", "laundry", "other"];

function FastPostingPage() {
  const folios = useHotelStore((s) => s.folios);
  const guests = useHotelStore((s) => s.guests);
  const products = useHotelStore((s) => s.productItems);
  const settings = useHotelStore((s) => s.settings);
  const post = useHotelStore((s) => s.postFolioCharge);
  const updateStock = useHotelStore((s) => s.updateProductStock);

  const open = useMemo(() => folios.filter((f) => f.status === "open"), [folios]);
  const [productId, setProductId] = useState<string>("__custom");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<FolioCharge["category"]>("minibar");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const onPickProduct = (id: string) => {
    setProductId(id);
    if (id === "__custom") return;
    const p = products.find((x) => x.id === id);
    if (p) {
      setDescription(p.name);
      setAmount(p.price.toString());
      const cat = (CATEGORIES as string[]).includes(p.category) ? (p.category as FolioCharge["category"]) : "other";
      setCategory(cat);
    }
  };

  const toggleFolio = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const submit = () => {
    const a = parseFloat(amount);
    if (!description.trim() || !Number.isFinite(a) || a <= 0) { toast.error("Description & amount required"); return; }
    if (selected.size === 0) { toast.error("Pick at least one folio"); return; }
    selected.forEach((fid) => post(fid, { description: description.trim(), amount: a, category }));
    if (productId !== "__custom") {
      const p = products.find((x) => x.id === productId);
      if (p) updateStock(p.id, Math.max(0, p.stock - selected.size));
    }
    toast.success(`Posted to ${selected.size} folio${selected.size === 1 ? "" : "s"}`);
    setSelected(new Set());
  };

  return (
    <AppLayout title="Fast Posting" subtitle="Post a single charge to multiple folios">
      {open.length === 0 ? (
        <Card className="border-border/60 shadow-card">
          <EmptyState icon={Zap} title="No open folios" description="Open a folio first to post charges to it." />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
          <Card className="border-border/60 shadow-card p-5 space-y-3">
            <h2 className="text-sm font-semibold">Charge details</h2>
            <div className="space-y-1.5">
              <Label>Product (optional)</Label>
              <Select value={productId} onValueChange={onPickProduct}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__custom">Custom charge</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {settings.currency} {p.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Amount</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as FolioCharge["category"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={submit}>
              <Send className="h-4 w-4" /> Post to {selected.size} folio{selected.size === 1 ? "" : "s"}
            </Button>
          </Card>

          <Card className="border-border/60 shadow-card">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="text-sm font-semibold">Open folios</h2>
              <button
                onClick={() => setSelected(selected.size === open.length ? new Set() : new Set(open.map((f) => f.id)))}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {selected.size === open.length ? "Clear" : "Select all"}
              </button>
            </div>
            <div className="divide-y divide-border">
              {open.map((f) => {
                const g = guests.find((x) => x.id === f.guestId);
                const total = f.charges.reduce((s, c) => s + c.amount, 0);
                return (
                  <label key={f.id} className="flex items-center gap-3 p-4 hover:bg-muted/30 cursor-pointer">
                    <Checkbox checked={selected.has(f.id)} onCheckedChange={() => toggleFolio(f.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{g?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{f.charges.length} charge{f.charges.length === 1 ? "" : "s"} · {settings.currency} {total.toFixed(2)}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
