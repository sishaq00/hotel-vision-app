import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BedDouble, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ReservationsTable } from "@/components/reservations/ReservationsTable";
import { useHotelStore } from "@/store/hotel-store";

export const Route = createFileRoute("/in-house")({
  head: () => ({
    meta: [
      { title: "In House — NEXORA OS" },
      { name: "description", content: "Currently checked-in reservations." },
    ],
  }),
  component: InHousePage,
});

function InHousePage() {
  const reservations = useHotelStore((s) => s.reservations);
  const guests = useHotelStore((s) => s.guests);
  const rooms = useHotelStore((s) => s.rooms);
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.toLowerCase();
    return reservations
      .filter((r) => r.status === "checked-in")
      .filter((r) => {
        if (!q) return true;
        const g = guests.find((x) => x.id === r.guestId);
        const rm = rooms.find((x) => x.id === r.roomId);
        return (
          g?.name.toLowerCase().includes(q) ||
          rm?.number.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.checkOut > b.checkOut ? 1 : -1));
  }, [reservations, guests, rooms, query]);

  return (
    <AppLayout
      title="In House"
      subtitle={`${list.length} guest${list.length === 1 ? "" : "s"} currently in-house`}
    >
      <Card className="border-border/60 shadow-card">
        <div className="border-b border-border p-5">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by guest or room..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={BedDouble}
            title={query ? "No matching guests" : "No guests in-house"}
            description={
              query
                ? "Try a different search term."
                : "Once a reservation is checked in, it will appear here."
            }
          />
        ) : (
          <ReservationsTable
            reservations={list}
            actions={{ checkOut: true, cancel: true }}
          />
        )}
      </Card>
    </AppLayout>
  );
}
