import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarCheck, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ReservationsTable } from "@/components/reservations/ReservationsTable";
import { useHotelStore } from "@/store/hotel-store";

export const Route = createFileRoute("/arrivals")({
  head: () => ({
    meta: [
      { title: "Arrivals — NEXORA OS" },
      { name: "description", content: "Today's expected check-ins." },
    ],
  }),
  component: ArrivalsPage,
});

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function ArrivalsPage() {
  const reservations = useHotelStore((s) => s.reservations);
  const guests = useHotelStore((s) => s.guests);
  const rooms = useHotelStore((s) => s.rooms);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"today" | "all">("today");

  const today = todayIso();

  const list = useMemo(() => {
    const q = query.toLowerCase();
    return reservations
      .filter((r) => r.status === "confirmed")
      .filter((r) => (scope === "today" ? r.checkIn <= today : true))
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
      .sort((a, b) => (a.checkIn > b.checkIn ? 1 : -1));
  }, [reservations, guests, rooms, query, scope, today]);

  return (
    <AppLayout
      title="Arrivals"
      subtitle={`${list.length} expected ${scope === "today" ? "today" : "in total"}`}
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
              All upcoming
            </button>
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No arrivals"
            description={
              query
                ? "No matching reservations."
                : "No expected arrivals for the selected window."
            }
          />
        ) : (
          <ReservationsTable
            reservations={list}
            actions={{ checkIn: true, cancel: true }}
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
