import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Receipt, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { useHotelStore, type FolioCharge } from "@/store/hotel-store";
import { toast } from "sonner";

export const Route = createFileRoute("/bulk-routing/setup")({
  head: () => ({
    meta: [
      { title: "Bulk Routing Setup — NEXORA OS" },
      { name: "description", content: "Define rules to auto-route postings to folios." },
    ],
  }),
  component: BulkRoutingSetupPage,
});

const CATEGORIES: FolioCharge["category"][] = ["room", "minibar", "spa", "restaurant", "laundry", "other"];

function BulkRoutingSetupPage() {
  const rules = useHotelStore((s) => s.routingRules);
  const folios = useHotelStore((s) => s.folios);
  const guests = useHotelStore((s) => s.guests);
  const add = useHotelStore((s) => s.addRoutingRule);
  const toggle = useHotelStore((s) => s.toggleRoutingRule);
  const [open, setOpen] = useState(false);

  return (
    <AppLayout title="Bulk Routing Setup" subtitle={`${rules.length} rule${rules.length === 1 ? "" : "s"}`}>
      <Card className="border-border/60 shadow-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-sm font-semibold">Routing rules</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> New rule</Button></DialogTrigger>
            <NewRuleDialog
              folios={folios}
              guests={guests}
              onSubmit={(r) => { add(r); toast.success("Rule created"); setOpen(false); }}
            />
          </Dialog>
        </div>
        {rules.length === 0 ? (
          <EmptyState icon={Receipt} title="No routing rules" description="Auto-route specific charge categories from one guest to another folio (e.g. company billing)." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>From guest</TableHead>
                <TableHead>To folio</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r) => {
                const fromG = guests.find((g) => g.id === r.fromGuestId);
                const toF = folios.find((f) => f.id === r.toFolioId);
                const toG = guests.find((g) => g.id === toF?.guestId);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs">{fromG?.name ?? "Any"}</TableCell>
                    <TableCell className="text-xs">{toG?.name ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.categories.map((c) => (
                          <span key={c} className="inline-flex rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] capitalize">{c}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell><Switch checked={r.active} onCheckedChange={() => toggle(r.id)} /></TableCell>
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

function NewRuleDialog({
  folios, guests, onSubmit,
}: {
  folios: { id: string; guestId: string }[];
  guests: { id: string; name: string }[];
  onSubmit: (r: { name: string; fromGuestId?: string; toFolioId: string; categories: FolioCharge["category"][]; active: boolean }) => void;
}) {
  const [name, setName] = useState("");
  const [fromGuestId, setFromGuestId] = useState<string>("__any");
  const [toFolioId, setToFolioId] = useState<string>("");
  const [selected, setSelected] = useState<Set<FolioCharge["category"]>>(new Set());

  const toggleCat = (c: FolioCharge["category"]) => {
    const next = new Set(selected);
    next.has(c) ? next.delete(c) : next.add(c);
    setSelected(next);
  };

  return (
    <DialogContent className="sm:max-w-[450px]">
      <DialogHeader><DialogTitle>New routing rule</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Route minibar to company" /></div>
        <div className="space-y-1.5">
          <Label>From guest (optional)</Label>
          <Select value={fromGuestId} onValueChange={setFromGuestId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__any">Any guest</SelectItem>
              {guests.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>To folio</Label>
          <Select value={toFolioId} onValueChange={setToFolioId}>
            <SelectTrigger><SelectValue placeholder="Pick a folio" /></SelectTrigger>
            <SelectContent>
              {folios.map((f) => {
                const g = guests.find((x) => x.id === f.guestId);
                return <SelectItem key={f.id} value={f.id}>{g?.name ?? "Folio"} · {f.id.slice(0, 6)}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Categories</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCat(c)}
                className={`rounded-md border px-2.5 py-1 text-xs capitalize ${selected.has(c) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}
              >{c}</button>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => {
          if (!name.trim() || !toFolioId || selected.size === 0) { toast.error("Name, folio & categories required"); return; }
          onSubmit({
            name: name.trim(),
            fromGuestId: fromGuestId === "__any" ? undefined : fromGuestId,
            toFolioId,
            categories: Array.from(selected),
            active: true,
          });
        }}>Create</Button>
      </DialogFooter>
    </DialogContent>
  );
}
