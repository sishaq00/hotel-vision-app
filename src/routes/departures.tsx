import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LogOut, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ReservationsTable } from "@/components/reservations/ReservationsTable";
import { useHotelStore } from "@/store/hotel-store";

export const Route = createFileRoute("/departures")({
  head: () => ({
    meta: [
      { title: "Departures — NEXORA OS" },
      { name: "description", content: "Today's expected check-outs." },
    ],
  }),
  component: DeparturesPage,
});

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function DeparturesPage() {
  const reservations = useHotelStore((s) => s.reservations);
  const guests = useHotelStore((s) => s.guests);
  const rooms = useHotelStore((s) => s.rooms);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"today" | "all">("today");

  const today = todayIso();

  const list = useMemo(() => {
    const q = query.toLowerCase();
    return reservations
      .filter((r) => r.status === "checked-in")
      .filter((r) => (scope === "today" ? r.checkOut <= today : true))
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
  }, [reservations, guests, rooms, query, scope, today]);

  return (
    <AppLayout
      title="Departures"
      subtitle={`${list.length} departure${list.length === 1 ? "" : "s"} ${scope === "today" ? "due today" : "in total"}`}
    >
      <Card className="border-border/60 shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by guest or room..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setScope("today")}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                scope === "today"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              Today &amp; overdue
            </button>
            <button
              onClick={() => setScope("all")}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                scope === "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              All in-house
            </button>
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={LogOut}
            title="No departures"
            description={
              query
                ? "No matching reservations."
                : "No check-outs due in the selected window."
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
