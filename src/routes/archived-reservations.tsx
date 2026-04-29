import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Archive, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ReservationsTable } from "@/components/reservations/ReservationsTable";
import { useHotelStore } from "@/store/hotel-store";

export const Route = createFileRoute("/archived-reservations")({
  head: () => ({
    meta: [
      { title: "Archived Reservations — NEXORA OS" },
      { name: "description", content: "Cancelled and completed reservations." },
    ],
  }),
  component: ArchivedReservationsPage,
});

function ArchivedReservationsPage() {
  const reservations = useHotelStore((s) => s.reservations);
  const guests = useHotelStore((s) => s.guests);
  const rooms = useHotelStore((s) => s.rooms);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "checked-out" | "cancelled">("all");

  const list = useMemo(() => {
    const q = query.toLowerCase();
    return reservations
      .filter((r) => r.status === "checked-out" || r.status === "cancelled")
      .filter((r) => (filter === "all" ? true : r.status === filter))
      .filter((r) => {
        if (!q) return true;
        const g = guests.find((x) => x.id === r.guestId);
        const rm = rooms.find((x) => x.id === r.roomId);
        return (
          g?.name.toLowerCase().includes(q) ||
          rm?.number.toLowerCase().includes(q) ||
          (r.confirmationNumber ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }, [reservations, guests, rooms, query, filter]);

  const tabs: { value: typeof filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "checked-out", label: "Checked-out" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <AppLayout
      title="Archived Reservations"
      subtitle="Completed and cancelled bookings"
    >
      <Card className="border-border/60 shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search guest, room, confirmation #..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {tabs.map((t) => (
              <button
                key={t.value}
                onClick={() => setFilter(t.value)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === t.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={Archive}
            title="No archived reservations"
            description={
              query
                ? "No matches for this search."
                : "Cancelled and checked-out reservations will appear here."
            }
          />
        ) : (
          <ReservationsTable
            reservations={list}
            actions={{ invoice: true }}
          />
        )}
      </Card>
    </AppLayout>
  );
}
