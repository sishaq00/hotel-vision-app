import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ReservationsTable } from "@/components/reservations/ReservationsTable";
import { useHotelStore } from "@/store/hotel-store";

export const Route = createFileRoute("/search-reservations")({
  head: () => ({
    meta: [
      { title: "Search Reservations — NEXORA OS" },
      { name: "description", content: "Search by name, phone, email, confirmation number, invoice, room or date range." },
    ],
  }),
  component: SearchReservationsPage,
});

const STATUSES = ["all", "confirmed", "checked-in", "checked-out", "cancelled", "no-show"] as const;

function SearchReservationsPage() {
  const reservations = useHotelStore((s) => s.reservations);
  const guests = useHotelStore((s) => s.guests);
  const rooms = useHotelStore((s) => s.rooms);

  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");

  const hasFilters = !!query.trim() || !!from || !!to || status !== "all";

  const results = useMemo(() => {
    if (!hasFilters) return [];
    const q = query.trim().toLowerCase();
    return reservations
      .filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        // Date range overlaps the stay
        if (from && r.checkOut < from) return false;
        if (to && r.checkIn > to) return false;
        if (!q) return true;
        const g = guests.find((x) => x.id === r.guestId);
        const rm = rooms.find((x) => x.id === r.roomId);
        return (
          (g?.name ?? "").toLowerCase().includes(q) ||
          (g?.phone ?? "").toLowerCase().includes(q) ||
          (g?.email ?? "").toLowerCase().includes(q) ||
          (rm?.number ?? "").toLowerCase().includes(q) ||
          (r.confirmationNumber ?? "").toLowerCase().includes(q) ||
          (r.invoice?.invoiceNumber ?? "").toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }, [reservations, guests, rooms, query, from, to, status, hasFilters]);

  return (
    <AppLayout
      title="Search Reservations"
      subtitle="Confirmation #, guest name, phone, email, invoice #, room or date range"
    >
      <Card className="border-border/60 shadow-card">
        <div className="space-y-4 border-b border-border p-5">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Confirmation #, invoice #, name, phone, email, room..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 text-base"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="from" className="text-xs">Stay from</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to" className="text-xs">Stay to</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => { setQuery(""); setFrom(""); setTo(""); setStatus("all"); }}
              >
                <X className="h-4 w-4" /> Clear
              </Button>
            </div>
          </div>

          {hasFilters && (
            <p className="text-xs text-muted-foreground">
              {results.length} result{results.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {!hasFilters ? (
          <EmptyState
            icon={SearchIcon}
            title="Start searching"
            description="Search across confirmation number, invoice number, guest name, phone, email, room, status or a date range."
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon={SearchIcon}
            title="No matches"
            description="Nothing matched these filters. Try a different term or date range."
          />
        ) : (
          <ReservationsTable
            reservations={results}
            extraColumn={{
              header: "Confirmation #",
              render: (r) => (
                <span className="font-mono text-xs text-muted-foreground">
                  {r.confirmationNumber ?? "—"}
                </span>
              ),
            }}
          />
        )}
      </Card>
    </AppLayout>
  );
}
