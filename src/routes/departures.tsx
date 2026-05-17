import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  LogOut, Search, AlertTriangle, CheckCircle2, Clock, Banknote,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ReservationsTable } from "@/components/reservations/ReservationsTable";
import { useHotelStore, todayISO } from "@/store/hotel-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/departures")({
  head: () => ({ meta: [{ title: "Departures — NEXORA OS" }] }),
  component: DeparturesPage,
});

const SCOPES = [
  { value: "today",   label: "Due today" },
  { value: "overdue", label: "Overdue" },
  { value: "all",     label: "All in-house" },
] as const;
type Scope = (typeof SCOPES)[number]["value"];

function DeparturesPage() {
  const reservations          = useHotelStore((s) => s.reservations);
  const guests                = useHotelStore((s) => s.guests);
  const rooms                 = useHotelStore((s) => s.rooms);
  const getReservationBalance = useHotelStore((s) => s.getReservationBalance);

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("today");

  const today = todayISO();

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const inHouse = reservations.filter((r) => r.status === "checked-in");
    const dueToday  = inHouse.filter((r) => r.checkOut === today).length;
    const overdue   = inHouse.filter((r) => r.checkOut < today).length;
    const withBal   = inHouse.filter((r) => getReservationBalance(r.id).balance > 0).length;
    const doneToday = reservations.filter(
      (r) => r.status === "checked-out" && r.checkedOutAt?.slice(0, 10) === today,
    ).length;
    return { dueToday, overdue, withBal, doneToday };
  }, [reservations, today, getReservationBalance]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const list = useMemo(() => {
    const q = query.toLowerCase();
    return reservations
      .filter((r) => r.status === "checked-in")
      .filter((r) => {
        if (scope === "today")   return r.checkOut === today;
        if (scope === "overdue") return r.checkOut < today;
        return true;
      })
      .filter((r) => {
        if (!q) return true;
        const g  = guests.find((x) => x.id === r.guestId);
        const rm = rooms.find((x) => x.id === r.roomId);
        return g?.name.toLowerCase().includes(q) || rm?.number.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        // Sort overdue first, then by checkout date
        if (a.checkOut < today && b.checkOut >= today) return -1;
        if (b.checkOut < today && a.checkOut >= today) return 1;
        return a.checkOut < b.checkOut ? -1 : 1;
      });
  }, [reservations, guests, rooms, query, scope, today]);

  return (
    <AppLayout
      title="Departures"
      subtitle={`${stats.dueToday} due today · ${stats.overdue} overdue`}
    >
      <div className="space-y-4">

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Due today",      value: stats.dueToday,  icon: Clock,         accent: "border-l-amber-500",  iconCls: "text-amber-500"   },
            { label: "Checked out",    value: stats.doneToday, icon: CheckCircle2,  accent: "border-l-emerald-500",iconCls: "text-emerald-500" },
            { label: "Overdue",        value: stats.overdue,   icon: AlertTriangle, accent: "border-l-rose-500",   iconCls: "text-rose-500"    },
            { label: "With balance",   value: stats.withBal,   icon: Banknote,      accent: "border-l-orange-500", iconCls: "text-orange-500"  },
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
          <div className="flex items-center rounded-lg border border-border/60 bg-card p-1 shadow-sm">
            {SCOPES.map((s) => (
              <button key={s.value} type="button" onClick={() => setScope(s.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  scope === s.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  scope !== s.value && s.value === "overdue" && stats.overdue > 0 && "text-rose-500",
                )}>
                {s.label}
                {s.value === "overdue" && stats.overdue > 0 && (
                  <span className="ml-1 rounded-full bg-rose-100 px-1.5 text-[10px] font-bold text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                    {stats.overdue}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Guest, room…" value={query}
              onChange={(e) => setQuery(e.target.value)} className="pl-9 h-9" />
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          {list.length === 0 ? (
            <EmptyState icon={LogOut}
              title="No departures"
              description={query ? "No matching guests." : "No check-outs due in this window."}
            />
          ) : (
            <ReservationsTable
              reservations={list}
              actions={{ checkOut: true, cancel: false }}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
