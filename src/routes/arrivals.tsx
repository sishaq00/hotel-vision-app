import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CalendarCheck, Search, LogIn, UserX, Clock, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ReservationsTable } from "@/components/reservations/ReservationsTable";
import { useHotelStore, todayISO } from "@/store/hotel-store";
import { cn } from "@/lib/utils";
import { NewReservationDialog } from "@/components/reservations/NewReservationDialog";

export const Route = createFileRoute("/arrivals")({
  head: () => ({ meta: [{ title: "Arrivals — NEXORA OS" }] }),
  component: ArrivalsPage,
});

const SCOPES = [
  { value: "today",    label: "Today & overdue" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "all",      label: "All upcoming" },
] as const;
type Scope = (typeof SCOPES)[number]["value"];

function ArrivalsPage() {
  const reservations = useHotelStore((s) => s.reservations);
  const guests       = useHotelStore((s) => s.guests);
  const rooms        = useHotelStore((s) => s.rooms);

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("today");

  const today    = todayISO();
  const tomorrow = new Date(new Date(today).getTime() + 86400000).toISOString().slice(0, 10);

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const confirmed = reservations.filter((r) => r.status === "confirmed");
    return {
      pending:   confirmed.filter((r) => r.checkIn === today).length,
      overdue:   confirmed.filter((r) => r.checkIn < today).length,
      noShows:   reservations.filter((r) => r.noShow).length,
      checkedIn: reservations.filter((r) => r.status === "checked-in" && r.checkedInAt?.slice(0, 10) === today).length,
    };
  }, [reservations, today]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const list = useMemo(() => {
    const q = query.toLowerCase();
    return reservations
      .filter((r) => r.status === "confirmed")
      .filter((r) => {
        if (scope === "today")    return r.checkIn <= today;
        if (scope === "tomorrow") return r.checkIn === tomorrow;
        return true;
      })
      .filter((r) => {
        if (!q) return true;
        const g  = guests.find((x) => x.id === r.guestId);
        const rm = rooms.find((x) => x.id === r.roomId);
        return (
          g?.name.toLowerCase().includes(q) ||
          rm?.number.toLowerCase().includes(q) ||
          (r.confirmationNumber ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.checkIn > b.checkIn ? 1 : -1));
  }, [reservations, guests, rooms, query, scope, today, tomorrow]);

  return (
    <AppLayout
      title="Arrivals"
      subtitle={`${stats.pending} pending check-in${stats.pending !== 1 ? "s" : ""} today`}
    >
      <div className="space-y-4">

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Pending today",  value: stats.pending,   icon: Clock,         accent: "border-l-amber-500",  iconCls: "text-amber-500"   },
            { label: "Checked in",     value: stats.checkedIn, icon: CheckCircle2,  accent: "border-l-emerald-500",iconCls: "text-emerald-500" },
            { label: "Overdue",        value: stats.overdue,   icon: AlertTriangle, accent: "border-l-rose-500",   iconCls: "text-rose-500"    },
            { label: "No-shows",       value: stats.noShows,   icon: UserX,         accent: "border-l-slate-400",  iconCls: "text-slate-400"   },
          ].map(({ label, value, icon: Icon, accent, iconCls }) => (
            <div key={label} className={cn(
              "relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm border-l-4",
              accent,
            )}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-semibold text-foreground">{value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
                </div>
                <Icon className={cn("h-5 w-5", iconCls)} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Scope tabs */}
          <div className="flex items-center rounded-lg border border-border/60 bg-card p-1 shadow-sm">
            {SCOPES.map((s) => (
              <button key={s.value} type="button" onClick={() => setScope(s.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  scope === s.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Guest, room, confirmation #…" value={query}
              onChange={(e) => setQuery(e.target.value)} className="pl-9 h-9" />
          </div>

          <div className="ml-auto">
            <NewReservationDialog />
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          {list.length === 0 ? (
            <EmptyState icon={CalendarCheck}
              title="No arrivals"
              description={query ? "No matching reservations." : "No arrivals for this period."}
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
        </div>
      </div>
    </AppLayout>
  );
}
