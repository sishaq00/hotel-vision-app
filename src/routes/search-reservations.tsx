import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ReservationsTable } from "@/components/reservations/ReservationsTable";
import { useHotelStore } from "@/store/hotel-store";

export const Route = createFileRoute("/search-reservations")({
  head: () => ({
    meta: [
      { title: "Search Reservations — NEXORA OS" },
      { name: "description", content: "Search by name, phone, confirmation, room number." },
    ],
  }),
  component: SearchReservationsPage,
});

function SearchReservationsPage() {
  const reservations = useHotelStore((s) => s.reservations);
  const guests = useHotelStore((s) => s.guests);
  const rooms = useHotelStore((s) => s.rooms);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return reservations
      .filter((r) => {
        const g = guests.find((x) => x.id === r.guestId);
        const rm = rooms.find((x) => x.id === r.roomId);
        return (
          (g?.name ?? "").toLowerCase().includes(q) ||
          (g?.phone ?? "").toLowerCase().includes(q) ||
          (g?.email ?? "").toLowerCase().includes(q) ||
          (rm?.number ?? "").toLowerCase().includes(q) ||
          (r.confirmationNumber ?? "").toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }, [reservations, guests, rooms, query]);

  return (
    <AppLayout
      title="Search Reservations"
      subtitle="Search by guest name, phone, confirmation number or room"
    >
      <Card className="border-border/60 shadow-card">
        <div className="border-b border-border p-5">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Type a name, phone, confirmation #, or room number..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 text-base"
            />
          </div>
          {query && (
            <p className="mt-2 text-xs text-muted-foreground">
              {results.length} result{results.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {!query ? (
          <EmptyState
            icon={SearchIcon}
            title="Start typing to search"
            description="Searches across guest name, phone, email, confirmation number, room and status."
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon={SearchIcon}
            title="No matches"
            description={`Nothing matched "${query}". Try a different term.`}
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
