import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BedDouble, Search, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ReservationsTable } from "@/components/reservations/ReservationsTable";
import { useHotelStore, todayISO } from "@/store/hotel-store";
import { cn } from "@/lib/utils";

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
  const guests       = useHotelStore((s) => s.guests);
  const rooms        = useHotelStore((s) => s.rooms);
  const [query, setQuery] = useState("");

  const today = todayISO();

  const list = useMemo(() => {
    const q = query.toLowerCase();
    return reservations
      .filter((r) => r.status === "checked-in")
      .filter((r) => {
        if (!q) return true;
        const g  = guests.find((x) => x.id === r.guestId);
        const rm = rooms.find((x) => x.id === r.roomId);
        return (
          g?.name.toLowerCase().includes(q) ||
          rm?.number.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.checkOut > b.checkOut ? 1 : -1));
  }, [reservations, guests, rooms, query]);

  const stats = useMemo(() => {
    const inHouse       = reservations.filter((r) => r.status === "checked-in");
    const checkoutToday = inHouse.filter((r) => r.checkOut === today).length;
    const overdue       = inHouse.filter((r) => r.checkOut < today).length;
    return { total: inHouse.length, checkoutToday, overdue };
  }, [reservations, today]);

  return (
    <AppLayout
      title="In House"
      subtitle={`${stats.total} guest${stats.total === 1 ? "" : "s"} currently checked in`}
    >
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "In house",       value: stats.total,         cls: "border-l-4 border-l-blue-500",    icon: BedDouble      },
            { label: "Checkout today", value: stats.checkoutToday, cls: "border-l-4 border-l-amber-500",   icon: Clock          },
            { label: "Overdue",        value: stats.overdue,       cls: "border-l-4 border-l-rose-500",    icon: AlertTriangle  },
          ].map(({ label, value, cls, icon: Icon }) => (
            <div key={label} className={cn("relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm", cls)}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-semibold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
                <Icon className="h-5 w-5 text-muted-foreground/50" />
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by guest or room…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 h-9"
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
        </div>
      </div>
    </AppLayout>
  );
}
