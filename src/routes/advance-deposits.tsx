import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CreditCard, Plus, Check, Undo2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useHotelStore, type PaymentMethod, type AdvanceDepositStatus } from "@/store/hotel-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/advance-deposits")({
  head: () => ({
    meta: [
      { title: "Advance Deposits — NEXORA OS" },
      { name: "description", content: "Held, applied and refunded deposits." },
    ],
  }),
  component: AdvanceDepositsPage,
});

const STATUS_STYLE: Record<AdvanceDepositStatus, string> = {
  held: "bg-info/10 text-info border-info/20",
  applied: "bg-success/10 text-success border-success/20",
  refunded: "bg-muted text-muted-foreground border-border",
};

function AdvanceDepositsPage() {
  const deposits = useHotelStore((s) => s.advanceDeposits);
  const guests = useHotelStore((s) => s.guests);
  const settings = useHotelStore((s) => s.settings);
  const add = useHotelStore((s) => s.addAdvanceDeposit);
  const apply = useHotelStore((s) => s.applyAdvanceDeposit);
  const refund = useHotelStore((s) => s.refundAdvanceDeposit);

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<AdvanceDepositStatus | "all">("all");

  const list = useMemo(() => {
    return [...deposits]
      .filter((d) => filter === "all" || d.status === filter)
      .sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
  }, [deposits, filter]);

  const totals = useMemo(() => {
    const held = deposits.filter((d) => d.status === "held").reduce((s, d) => s + d.amount, 0);
    const applied = deposits.filter((d) => d.status === "applied").reduce((s, d) => s + d.amount, 0);
    return { held, applied };
  }, [deposits]);

  return (
    <AppLayout title="Advance Deposits" subtitle={`${settings.currency} ${totals.held.toFixed(2)} held · ${settings.currency} ${totals.applied.toFixed(2)} applied`}>
      <Card className="border-border/60 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div className="flex gap-2">
            {(["all", "held", "applied", "refunded"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  filter === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                )}
              >{f}</button>
            ))}
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" /> New deposit</Button>
            </DialogTrigger>
            <NewDepositDialog
              guests={guests.filter((g) => !g.archived)}
              onSubmit={(d) => { add(d); toast.success("Deposit recorded"); setOpen(false); }}
            />
          </Dialog>
        </div>
        {list.length === 0 ? (
          <EmptyState icon={CreditCard} title="No deposits" description="Record advance deposits to hold against future stays." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((d) => {
                const g = guests.find((x) => x.id === d.guestId);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{g?.name ?? "—"}</TableCell>
                    <TableCell className="font-mono">{settings.currency} {d.amount.toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{d.method}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium capitalize", STATUS_STYLE[d.status])}>
                        {d.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(d.receivedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {d.status === "held" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => { apply(d.id); toast.success("Applied"); }}>
                            <Check className="h-3 w-3" /> Apply
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { refund(d.id); toast("Refunded"); }}>
                            <Undo2 className="h-3 w-3" /> Refund
                          </Button>
                        </>
                      )}
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

function NewDepositDialog({
  guests,
  onSubmit,
}: {
  guests: { id: string; name: string }[];
  onSubmit: (d: { guestId: string; amount: number; method: PaymentMethod; notes?: string }) => void;
}) {
  const [guestId, setGuestId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [notes, setNotes] = useState("");
  return (
    <DialogContent className="sm:max-w-[420px]">
      <DialogHeader><DialogTitle>Record deposit</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Guest</Label>
          <Select value={guestId} onValueChange={setGuestId}>
            <SelectTrigger><SelectValue placeholder="Pick a guest" /></SelectTrigger>
            <SelectContent>
              {guests.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => {
          const a = parseFloat(amount);
          if (!guestId || !Number.isFinite(a) || a <= 0) { toast.error("Guest & amount required"); return; }
          onSubmit({ guestId, amount: a, method, notes: notes.trim() || undefined });
        }}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}
