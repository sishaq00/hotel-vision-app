import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileMinus, Search, Printer } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useHotelStore } from "@/store/hotel-store";
import { ExportButtons } from "@/components/system/ExportButtons";

export const Route = createFileRoute("/credit-notes")({
  head: () => ({
    meta: [
      { title: "Credit Notes — NEXORA OS" },
      { name: "description", content: "Issued credit notes and refunds." },
    ],
  }),
  component: CreditNotesPage,
});

function CreditNotesPage() {
  const creditNotes = useHotelStore((s) => s.creditNotes);
  const reservations = useHotelStore((s) => s.reservations);
  const guests = useHotelStore((s) => s.guests);
  const settings = useHotelStore((s) => s.settings);
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...creditNotes]
      .sort((a, b) => (b.issuedAt > a.issuedAt ? 1 : -1))
      .map((n) => {
        const r = reservations.find((x) => x.id === n.reservationId);
        const g = r ? guests.find((x) => x.id === r.guestId) : undefined;
        return { note: n, guestName: g?.name ?? "—" };
      })
      .filter(({ note, guestName }) => {
        if (!q) return true;
        return (
          note.number.toLowerCase().includes(q) ||
          note.invoiceNumber.toLowerCase().includes(q) ||
          guestName.toLowerCase().includes(q) ||
          note.reason.toLowerCase().includes(q)
        );
      });
  }, [creditNotes, reservations, guests, query]);

  const total = rows.reduce((s, { note }) => s + note.amount, 0);

  return (
    <AppLayout title="Credit Notes" subtitle="Refunds and invoice corrections">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-border/60 p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Issued
            </p>
            <p className="mt-2 text-3xl font-bold text-destructive">
              {settings.currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </Card>
          <Card className="border-border/60 p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Notes Count
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">{creditNotes.length}</p>
          </Card>
          <Card className="border-border/60 p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Cancelled Invoices
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {creditNotes.filter((n) => n.cancelInvoice).length}
            </p>
          </Card>
        </div>

        <Card className="border-border/60 shadow-card">
          <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by number, invoice, guest, reason…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <ExportButtons
              rows={rows.map(({ note, guestName }) => ({
                Number: note.number,
                Invoice: note.invoiceNumber,
                Guest: guestName,
                Amount: note.amount,
                Reason: note.reason,
                "Cancelled Invoice": note.cancelInvoice ? "Yes" : "No",
                Issued: note.issuedAt,
              }))}
              filename="credit-notes"
            />
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={FileMinus}
              title={query ? "No matching credit notes" : "No credit notes yet"}
              description={
                query
                  ? "Try another search."
                  : "Credit notes appear here after you issue them from a paid invoice."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ note, guestName }) => (
                    <TableRow key={note.id}>
                      <TableCell className="font-mono font-semibold">{note.number}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {note.invoiceNumber}
                      </TableCell>
                      <TableCell className="font-medium">{guestName}</TableCell>
                      <TableCell className="max-w-[260px] truncate" title={note.reason}>
                        {note.reason}
                      </TableCell>
                      <TableCell>
                        {note.cancelInvoice ? (
                          <Badge variant="destructive">Invoice cancelled</Badge>
                        ) : (
                          <Badge variant="secondary">Partial refund</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-destructive">
                        −{settings.currency} {note.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(note.issuedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost" className="h-8 gap-1.5">
                          <Link
                            to="/print-credit-note/$noteId"
                            params={{ noteId: note.id }}
                            target="_blank"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Print
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
