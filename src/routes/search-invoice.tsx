import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileSearch, Download } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useHotelStore } from "@/store/hotel-store";
import { downloadInvoicePDF } from "@/lib/invoice-pdf";

export const Route = createFileRoute("/search-invoice")({
  head: () => ({
    meta: [
      { title: "Search Invoice — NEXORA OS" },
      { name: "description", content: "Find any past invoice by number, guest, or date." },
    ],
  }),
  component: SearchInvoicePage,
});

function SearchInvoicePage() {
  const reservations = useHotelStore((s) => s.reservations);
  const guests = useHotelStore((s) => s.guests);
  const rooms = useHotelStore((s) => s.rooms);
  const settings = useHotelStore((s) => s.settings);

  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const invoices = useMemo(() => {
    return reservations
      .filter((r) => r.invoice)
      .map((r) => ({
        reservation: r,
        guest: guests.find((g) => g.id === r.guestId),
        room: rooms.find((rm) => rm.id === r.roomId),
      }))
      .filter((x): x is { reservation: typeof x.reservation; guest: typeof x.guest; room: NonNullable<typeof x.room> } => !!x.room)
      .filter(({ reservation, guest }) => {
        const inv = reservation.invoice!;
        if (query) {
          const q = query.toLowerCase();
          const hits =
            inv.invoiceNumber.toLowerCase().includes(q) ||
            (guest?.name ?? "").toLowerCase().includes(q);
          if (!hits) return false;
        }
        if (from && inv.issuedAt.slice(0, 10) < from) return false;
        if (to && inv.issuedAt.slice(0, 10) > to) return false;
        return true;
      })
      .sort((a, b) => (a.reservation.invoice!.issuedAt < b.reservation.invoice!.issuedAt ? 1 : -1));
  }, [reservations, guests, rooms, query, from, to]);

  return (
    <AppLayout title="Search Invoice" subtitle={`${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`}>
      <Card className="border-border/60 shadow-card">
        <div className="grid gap-3 border-b border-border p-5 md:grid-cols-[1fr_auto_auto]">
          <Input placeholder="Search by number or guest…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {invoices.length === 0 ? (
          <EmptyState icon={FileSearch} title="No invoices" description="Invoices appear here once guests check out." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map(({ reservation, guest, room }) => {
                const inv = reservation.invoice!;
                return (
                  <TableRow key={reservation.id}>
                    <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                    <TableCell>{new Date(inv.issuedAt).toLocaleDateString()}</TableCell>
                    <TableCell>{guest?.name ?? "—"}</TableCell>
                    <TableCell>{room?.number ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">{inv.currency} {inv.total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() =>
                        downloadInvoicePDF({ invoice: inv, reservation, guest, room, settings })
                      }>
                        <Download className="h-3 w-3" /> PDF
                      </Button>
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
