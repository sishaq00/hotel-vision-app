// Rate Overrides Audit — manager view of every manual price change.
// Reads from localStorage via listRateOverrideLog().
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  Download,
  Search,
  TrendingDown,
  TrendingUp,
  Activity,
  UserCheck,
  ExternalLink,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/system/EmptyState";
import { useConfirm } from "@/components/system/ConfirmDialog";
import { useHotelStore } from "@/store/hotel-store";
import {
  listRateOverrideLog,
  clearRateOverrideLog,
  type RateOverrideEntry,
  type RateOverrideContext,
} from "@/lib/print-log";
import { downloadExcel } from "@/lib/excel";
import { toast } from "sonner";

export const Route = createFileRoute("/rate-overrides")({
  head: () => ({
    meta: [
      { title: "Rate Overrides Audit — NEXORA OS" },
      {
        name: "description",
        content:
          "Manager audit of every manual rate override applied at the front desk.",
      },
    ],
  }),
  component: RateOverridesPage,
});

type DateFilter = "all" | "today" | "7d" | "month";
type ContextFilter = "all" | RateOverrideContext;

const CONTEXT_LABELS: Record<RateOverrideContext, string> = {
  "new-reservation": "New Reservation",
  "extend-stay": "Extend Stay",
  "checkout-adjustment": "Checkout Adjust",
};

const CONTEXT_VARIANTS: Record<RateOverrideContext, string> = {
  "new-reservation": "bg-primary/15 text-primary border-primary/30",
  "extend-stay": "bg-info/15 text-info border-info/30",
  "checkout-adjustment": "bg-warning/15 text-warning border-warning/30",
};

function RateOverridesPage() {
  const [entries, setEntries] = useState<RateOverrideEntry[]>([]);
  const [query, setQuery] = useState("");
  const [contextFilter, setContextFilter] = useState<ContextFilter>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const reservations = useHotelStore((s) => s.reservations);
  const settings = useHotelStore((s) => s.settings);
  const confirm = useConfirm();

  useEffect(() => {
    setEntries(listRateOverrideLog());
  }, []);

  const currency = settings.currency || "USD";

  const reload = () => setEntries(listRateOverrideLog());

  const handleClear = async () => {
    const ok = await confirm({
      title: "Clear rate-override log?",
      description:
        "This permanently deletes the audit trail of all manual price changes. Cannot be undone.",
      confirmLabel: "Clear",
      destructive: true,
    });
    if (!ok) return;
    clearRateOverrideLog();
    setEntries([]);
    toast.success("Rate override log cleared");
  };

  // Unique users for filter
  const users = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => set.add(e.user));
    return Array.from(set).sort();
  }, [entries]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    const ms = {
      today: 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    return entries.filter((e) => {
      if (contextFilter !== "all" && e.context !== contextFilter) return false;
      if (userFilter !== "all" && e.user !== userFilter) return false;
      if (dateFilter !== "all") {
        const age = now - new Date(e.at).getTime();
        if (age > ms[dateFilter]) return false;
      }
      if (q) {
        const hay =
          `${e.user} ${e.guestName ?? ""} ${e.roomNumber ?? ""} ${e.reason} ${CONTEXT_LABELS[e.context]}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, query, contextFilter, userFilter, dateFilter]);

  // KPI calculations (over filtered set)
  const stats = useMemo(() => {
    let totalDiscount = 0;
    let totalIncrease = 0;
    const userCount = new Map<string, number>();
    for (const e of filtered) {
      const delta = e.newAmount - e.oldAmount;
      if (delta < 0) totalDiscount += Math.abs(delta);
      else if (delta > 0) totalIncrease += delta;
      userCount.set(e.user, (userCount.get(e.user) ?? 0) + 1);
    }
    let topUser = "—";
    let topCount = 0;
    userCount.forEach((c, u) => {
      if (c > topCount) {
        topCount = c;
        topUser = u;
      }
    });
    return {
      total: filtered.length,
      totalDiscount,
      totalIncrease,
      topUser,
      topCount,
    };
  }, [filtered]);

  const fmtMoney = (n: number) =>
    `${currency} ${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const fmtDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const getReservation = (id?: string) =>
    id ? reservations.find((r) => r.id === id) : undefined;

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const rows = filtered.map((e) => {
      const delta = e.newAmount - e.oldAmount;
      return {
        When: fmtDate(e.at),
        User: e.user,
        Context: CONTEXT_LABELS[e.context],
        Room: e.roomNumber ?? "",
        Guest: e.guestName ?? "",
        Unit: e.unit,
        "Original Price": e.oldAmount,
        "Manual Price": e.newAmount,
        Delta: delta,
        "Delta %":
          e.oldAmount > 0
            ? `${((delta / e.oldAmount) * 100).toFixed(1)}%`
            : "—",
        Reason: e.reason,
      };
    });
    downloadExcel(
      rows,
      `rate-overrides-${new Date().toISOString().slice(0, 10)}`,
      "Overrides",
    );
    toast.success(`Exported ${rows.length} record${rows.length === 1 ? "" : "s"}`);
  };

  return (
    <AppLayout
      title="Rate Overrides Audit"
      subtitle="Every manual price change made at the front desk — who, when, how much, and why."
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-4">
        <KpiTile
          icon={Activity}
          label="Total overrides"
          value={stats.total.toString()}
          tone="primary"
        />
        <KpiTile
          icon={TrendingDown}
          label="Discounts granted"
          value={fmtMoney(stats.totalDiscount)}
          tone="success"
        />
        <KpiTile
          icon={TrendingUp}
          label="Up-charges"
          value={fmtMoney(stats.totalIncrease)}
          tone="destructive"
        />
        <KpiTile
          icon={UserCheck}
          label="Top user"
          value={stats.topUser}
          hint={stats.topCount > 0 ? `${stats.topCount} override${stats.topCount === 1 ? "" : "s"}` : undefined}
          tone="warning"
        />
      </div>

      <Card className="border-border/60 shadow-card">
        {/* Filter bar */}
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search guest, room, reason, user…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={contextFilter} onValueChange={(v) => setContextFilter(v as ContextFilter)}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All contexts</SelectItem>
                <SelectItem value="new-reservation">New Reservation</SelectItem>
                <SelectItem value="extend-stay">Extend Stay</SelectItem>
                <SelectItem value="checkout-adjustment">Checkout Adjust</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            {entries.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleClear} className="gap-1.5">
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* Count */}
        <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
          Showing {filtered.length} of {entries.length} record{entries.length === 1 ? "" : "s"}
        </div>

        {entries.length === 0 ? (
          <EmptyState
            icon={Pencil}
            title="No rate overrides yet"
            description="When a receptionist sets a custom price during a new reservation, stay extension, or checkout, it will be logged here automatically."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description="Try clearing filters or changing the search query."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Context</TableHead>
                  <TableHead>Room / Guest</TableHead>
                  <TableHead className="text-right">Original</TableHead>
                  <TableHead className="text-right">Manual</TableHead>
                  <TableHead className="text-right">Delta</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => {
                  const delta = e.newAmount - e.oldAmount;
                  const isDiscount = delta < 0;
                  const isIncrease = delta > 0;
                  const pct =
                    e.oldAmount > 0
                      ? ((delta / e.oldAmount) * 100).toFixed(1)
                      : null;
                  const reservation = getReservation(e.reservationId);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {fmtDate(e.at)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {e.user}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${CONTEXT_VARIANTS[e.context]}`}
                        >
                          {CONTEXT_LABELS[e.context]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          {e.roomNumber && (
                            <span className="font-medium">Room {e.roomNumber}</span>
                          )}
                          {e.guestName && (
                            <span className="text-xs text-muted-foreground">
                              {e.guestName}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                        {fmtMoney(e.oldAmount)}
                        {e.unit === "per-night" && (
                          <div className="text-[10px] uppercase tracking-wide opacity-70">
                            per night
                          </div>
                        )}
                        {e.unit === "total" && (
                          <div className="text-[10px] uppercase tracking-wide opacity-70">
                            total
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold tabular-nums">
                        {fmtMoney(e.newAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className={`inline-flex flex-col items-end font-mono text-sm tabular-nums ${
                            isDiscount
                              ? "text-success"
                              : isIncrease
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }`}
                        >
                          <span className="font-semibold">
                            {delta >= 0 ? "+" : ""}
                            {fmtMoney(delta)}
                          </span>
                          {pct !== null && (
                            <span className="text-[10px] opacity-80">
                              {delta >= 0 ? "+" : ""}
                              {pct}%
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[260px] text-xs text-muted-foreground">
                        <span className="line-clamp-2" title={e.reason}>
                          {e.reason}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {reservation && (
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                          >
                            <Link
                              to="/search-reservations"
                              search={{ q: reservation.id } as never}
                              title="Open reservation"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </AppLayout>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Pencil;
  label: string;
  value: string;
  hint?: string;
  tone: "primary" | "success" | "destructive" | "warning";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
  };
  return (
    <Card className="border-border/60 p-3 shadow-card">
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-0.5 truncate text-base font-bold text-foreground" title={value}>
            {value}
          </p>
          {hint && (
            <p className="text-[10px] text-muted-foreground">{hint}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
