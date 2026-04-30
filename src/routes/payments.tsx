import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CreditCard, Plus, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useHotelStore, type PaymentMethod } from "@/store/hotel-store";
import { ExportButtons } from "@/components/system/ExportButtons";
import { toast } from "sonner";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Payments — NEXORA OS" },
      { name: "description", content: "Track payments and invoices." },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const payments = useHotelStore((s) => s.payments);
  const reservations = useHotelStore((s) => s.reservations);
  const guests = useHotelStore((s) => s.guests);
  const addPayment = useHotelStore((s) => s.addPayment);

  const [open, setOpen] = useState(false);
  const [reservationId, setReservationId] = useState("");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [query, setQuery] = useState("");

  const totals = useMemo(() => {
    const paid = payments.filter((p) => p.status === "paid").reduce((a, p) => a + p.amount, 0);
    const pending = payments.filter((p) => p.status === "pending").reduce((a, p) => a + p.amount, 0);
    return { paid, pending };
  }, [payments]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return [...payments]
      .sort((a, b) => (b.date > a.date ? 1 : -1))
      .filter((p) => {
        if (!q) return true;
        const r = reservations.find((x) => x.id === p.reservationId);
        const g = r ? guests.find((x) => x.id === r.guestId) : undefined;
        return (
          g?.name.toLowerCase().includes(q) ||
          p.method.toLowerCase().includes(q) ||
          p.status.toLowerCase().includes(q)
        );
      });
  }, [payments, reservations, guests, query]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservationId || amount <= 0) {
      toast.error("Select a reservation and enter an amount");
      return;
    }
    addPayment({
      reservationId,
      amount,
      method,
      status: "paid",
      date: new Date().toISOString().slice(0, 10),
    });
    toast.success("Payment recorded");
    setReservationId("");
    setAmount(0);
    setMethod("card");
    setOpen(false);
  };

  return (
    <AppLayout title="Payments" subtitle="Invoices and transactions">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-border/60 p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Collected
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">${totals.paid.toLocaleString()}</p>
          </Card>
          <Card className="border-border/60 p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pending
            </p>
            <p className="mt-2 text-3xl font-bold text-warning-foreground">
              ${totals.pending.toLocaleString()}
            </p>
          </Card>
          <Card className="border-border/60 p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Transactions
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">{payments.length}</p>
          </Card>
        </div>

        <Card className="border-border/60 shadow-card">
          <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <ExportButtons
                rows={payments.map((p) => {
                  const r = reservations.find((x) => x.id === p.reservationId);
                  const g = r ? guests.find((x) => x.id === r.guestId) : null;
                  return {
                    Date: p.date,
                    Guest: g?.name ?? "—",
                    Reservation: p.reservationId,
                    Amount: p.amount,
                    Method: p.method,
                    Status: p.status,
                  };
                })}
                filename="payments"
              />
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 shadow-md">
                    <Plus className="h-4 w-4" /> Record payment
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                  <DialogTitle>Record payment</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Reservation</Label>
                    <Select value={reservationId} onValueChange={setReservationId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reservation" />
                      </SelectTrigger>
                      <SelectContent>
                        {reservations.map((r) => {
                          const g = guests.find((x) => x.id === r.guestId);
                          return (
                            <SelectItem key={r.id} value={r.id}>
                              {g?.name ?? "Guest"} · ${r.totalAmount}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        min={0}
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Method</Label>
                      <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="transfer">Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title={query ? "No matching payments" : "No payments yet"}
              description={
                query
                  ? "Try another search."
                  : "Record your first payment to see it here."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const r = reservations.find((x) => x.id === p.reservationId);
                    const g = r ? guests.find((x) => x.id === r.guestId) : undefined;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-muted-foreground">{p.date}</TableCell>
                        <TableCell className="font-medium">{g?.name ?? "—"}</TableCell>
                        <TableCell className="capitalize">{p.method}</TableCell>
                        <TableCell><StatusBadge status={p.status} /></TableCell>
                        <TableCell className="text-right font-semibold">
                          ${p.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
