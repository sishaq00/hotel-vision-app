import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CalendarPlus,
  Search,
  Grid3x3,
  Clock,
  Users,
  Footprints,
  LogIn,
  LogOut,
  BedDouble,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { NewReservationDialog } from "@/components/reservations/NewReservationDialog";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { RoomsGridPanel } from "@/components/dashboard/RoomsGridPanel";
import { TodayGuestsPanel } from "@/components/dashboard/TodayGuestsPanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHotelStore, todayISO } from "@/store/hotel-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/")(
  { component: Dashboard },
);

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accent: "blue" | "green" | "amber" | "red" | "purple" | "slate";
  icon: typeof BedDouble;
  onClick?: () => void;
  to?: string;
}

const ACCENT = {
  blue:   { bar: "bg-blue-500",   icon: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"   },
  green:  { bar: "bg-emerald-500",icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" },
  amber:  { bar: "bg-amber-500",  icon: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"   },
  red:    { bar: "bg-rose-500",   icon: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"     },
  purple: { bar: "bg-violet-500", icon: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400" },
  slate:  { bar: "bg-slate-400",  icon: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"   },
};

function KpiCard({ label, value, sub, trend, trendLabel, accent, icon: Icon, onClick, to }: KpiCardProps) {
  const a = ACCENT[accent];
  const inner = (
    <div
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:shadow-md",
        (onClick || to) && "cursor-pointer hover:border-border",
      )}
      onClick={onClick}
    >
      {/* Accent bar */}
      <div className={cn("absolute left-0 top-0 h-full w-1 rounded-l-xl", a.bar)} />

      <div className="flex items-start justify-between pl-2">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", a.icon)}>
          <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        </div>
        {trend && trendLabel && (
          <span className={cn(
            "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
            trend === "up" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
            trend === "down" && "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
            trend === "neutral" && "bg-muted text-muted-foreground",
          )}>
            {trend === "up" && <ArrowUpRight className="h-3 w-3" />}
            {trend === "down" && <ArrowDownRight className="h-3 w-3" />}
            {trendLabel}
          </span>
        )}
      </div>

      <div className="pl-2">
        <p className="text-2xl font-semibold leading-none tracking-tight text-foreground">
          {value}
        </p>
        <p className="mt-1 text-[11px] font-medium text-muted-foreground">{label}</p>
        {sub && <p className="mt-0.5 text-[10px] text-muted-foreground/70">{sub}</p>}
      </div>
    </div>
  );

  if (to) return <Link to={to} className="block">{inner}</Link>;
  return inner;
}

// ─── Alert banner ────────────────────────────────────────────────────────────

function AlertBanner({ items }: { items: { label: string; to: string }[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/30">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
        Needs attention:
      </span>
      {items.map((it) => (
        <Link
          key={it.label}
          to={it.to}
          className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300"
        >
          {it.label} →
        </Link>
      ))}
    </div>
  );
}

// ─── Quick action button ─────────────────────────────────────────────────────

function QA({ label, icon: Icon, onClick, to }: {
  label: string; icon: typeof LogIn; onClick?: () => void; to?: string;
}) {
  const cls = "flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-accent hover:shadow-md active:scale-[0.98]";
  if (to) return <Link to={to} className={cls}><Icon className="h-4 w-4 text-muted-foreground" />{label}</Link>;
  return <button type="button" onClick={onClick} className={cls}><Icon className="h-4 w-4 text-muted-foreground" />{label}</button>;
}

// ─── Shift dialog (unchanged logic) ─────────────────────────────────────────

function ShiftDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const openShift = useHotelStore((s) => s.shifts.find((x) => x.status === "open"));
  const startShift = useHotelStore((s) => s.startShift);
  const endShift = useHotelStore((s) => s.endShift);
  const [name, setName] = useState("");
  const [openingCash, setOpeningCash] = useState(0);
  const [closingCash, setClosingCash] = useState(0);
  const { t } = useT();
  const isEnd = !!openShift;

  const handleSubmit = () => {
    if (isEnd && openShift) {
      endShift(openShift.id, closingCash);
      toast.success(`${t("shift.ended")} ${openShift.userName}`);
    } else {
      if (!name.trim()) { toast.error(t("shift.name-required")); return; }
      startShift(name.trim(), openingCash);
      toast.success(`${t("shift.started")} ${name.trim()}`);
    }
    onOpenChange(false);
    setName(""); setOpeningCash(0); setClosingCash(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{isEnd ? t("shift.end") : t("shift.start")}</DialogTitle>
          <DialogDescription>
            {isEnd ? `${t("shift.close-desc")} ${openShift?.userName}.` : t("shift.open-desc")}
          </DialogDescription>
        </DialogHeader>
        {isEnd ? (
          <div className="space-y-2">
            <Label htmlFor="closingCash">{t("shift.closing-cash")}</Label>
            <Input id="closingCash" type="number" value={closingCash}
              onChange={(e) => setClosingCash(Number(e.target.value))} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">{t("shift.employee")}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingCash">{t("shift.opening-cash")}</Label>
              <Input id="openingCash" type="number" value={openingCash}
                onChange={(e) => setOpeningCash(Number(e.target.value))} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit}>{isEnd ? t("shift.end") : t("shift.start")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function Dashboard() {
  const rooms        = useHotelStore((s) => s.rooms);
  const reservations = useHotelStore((s) => s.reservations);
  const advanceDeposits = useHotelStore((s) => s.advanceDeposits);
  const openShift    = useHotelStore((s) => s.shifts.find((x) => x.status === "open"));
  const settings     = useHotelStore((s) => s.settings);
  const { t }        = useT();

  const [shiftOpen, setShiftOpen]           = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);
  const today = todayISO();

  // ── Computed KPIs ──────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const sellable   = rooms.filter((r) => !r.archived && r.status !== "maintenance").length;
    const occupied   = reservations.filter((r) => r.status === "checked-in").length;
    const occupancyPct = sellable > 0 ? Math.round((occupied / sellable) * 100) : 0;

    const arrivals   = reservations.filter((r) => r.checkIn === today && r.status !== "cancelled").length;
    const arrivedCI  = reservations.filter((r) => r.checkIn === today && r.status === "checked-in").length;

    const departures = reservations.filter((r) => r.checkOut === today && r.status !== "cancelled").length;
    const checkedOut = reservations.filter((r) => r.checkedOutAt?.slice(0, 10) === today).length;
    const overdueOut = reservations.filter((r) => r.checkOut < today && r.status === "checked-in").length;

    const available  = rooms.filter((r) => r.status === "available" && !r.archived).length;
    const dirty      = rooms.filter((r) => r.housekeepingStatus === "dirty" || r.housekeepingStatus === "departure").length;
    const ooo        = rooms.filter((r) => r.status === "maintenance" || r.housekeepingStatus === "out-of-order").length;

    const checkedInToday = reservations.filter(
      (r) => r.status === "checked-in" || r.checkedInAt?.slice(0, 10) === today,
    );
    const totalRevenue = checkedInToday.reduce((s, r) => {
      const rm = rooms.find((x) => x.id === r.roomId);
      return s + (rm?.price ?? 0);
    }, 0);
    const adr    = checkedInToday.length > 0 ? Math.round(totalRevenue / checkedInToday.length) : 0;
    const revpar = sellable > 0 ? Math.round(totalRevenue / sellable) : 0;

    const noShows    = reservations.filter((r) => r.noShow).length;
    const futureBookings = reservations.filter((r) => r.checkIn > today && r.status !== "cancelled").length;
    const bookedToday = reservations.filter((r) => r.createdAt.slice(0, 10) === today).length;
    const heldDeposits = advanceDeposits.filter((d) => d.status === "held").length;

    // Alerts — items that need immediate action
    const alerts: { label: string; to: string }[] = [];
    if (overdueOut > 0) alerts.push({ label: `${overdueOut} overdue checkout${overdueOut > 1 ? "s" : ""}`, to: "/departures" });
    if (dirty > 0)      alerts.push({ label: `${dirty} dirty room${dirty > 1 ? "s" : ""}`, to: "/housekeeping" });
    if (noShows > 0)    alerts.push({ label: `${noShows} no-show${noShows > 1 ? "s" : ""}`, to: "/arrivals" });

    return {
      sellable, occupied, occupancyPct,
      arrivals, arrivedCI,
      departures, checkedOut, overdueOut,
      available, dirty, ooo,
      adr, revpar, totalRevenue,
      noShows, futureBookings, bookedToday, heldDeposits,
      alerts,
    };
  }, [rooms, reservations, advanceDeposits, today]);

  const currency = settings.currency ?? "$";

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-5">

        {/* ── Alert banner ─────────────────────────────────────────────── */}
        <AlertBanner items={kpis.alerts} />

        {/* ── Row 1: Performance KPIs ──────────────────────────────────── */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Today's Performance
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard
              label="Occupancy"
              value={`${kpis.occupancyPct}%`}
              sub={`${kpis.occupied} of ${kpis.sellable} rooms`}
              accent="blue"
              icon={TrendingUp}
              to="/in-house"
            />
            <KpiCard
              label="Revenue today"
              value={`${currency}${kpis.totalRevenue.toLocaleString()}`}
              sub={`ADR ${currency}${kpis.adr} · RevPAR ${currency}${kpis.revpar}`}
              accent="green"
              icon={TrendingUp}
              to="/report-queue"
            />
            <KpiCard
              label="Arrivals"
              value={kpis.arrivals}
              sub={`${kpis.arrivedCI} checked in`}
              trend={kpis.arrivedCI === kpis.arrivals ? "up" : "neutral"}
              trendLabel={kpis.arrivedCI === kpis.arrivals ? "All done" : `${kpis.arrivals - kpis.arrivedCI} pending`}
              accent="purple"
              icon={LogIn}
              to="/arrivals"
            />
            <KpiCard
              label="Departures"
              value={kpis.departures}
              sub={`${kpis.checkedOut} checked out`}
              trend={kpis.overdueOut > 0 ? "down" : "neutral"}
              trendLabel={kpis.overdueOut > 0 ? `${kpis.overdueOut} overdue` : "On time"}
              accent={kpis.overdueOut > 0 ? "red" : "amber"}
              icon={LogOut}
              to="/departures"
            />
            <KpiCard
              label="Available rooms"
              value={kpis.available}
              sub={`${kpis.dirty} cleaning · ${kpis.ooo} OOO`}
              accent="slate"
              icon={BedDouble}
              to="/rooms"
            />
          </div>
        </section>

        {/* ── Row 2: Secondary KPIs ─────────────────────────────────────── */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bookings & Housekeeping
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Future bookings"   value={kpis.futureBookings} accent="blue"   icon={CalendarPlus} to="/search-reservations" />
            <KpiCard label="Booked today"      value={kpis.bookedToday}    accent="green"  icon={CalendarPlus} to="/search-reservations" />
            <KpiCard label="Held deposits"     value={kpis.heldDeposits}   accent="amber"  icon={Clock}        to="/advance-deposits" />
            <KpiCard label="No-shows"          value={kpis.noShows}        accent={kpis.noShows > 0 ? "red" : "slate"} icon={Users} to="/arrivals" />
          </div>
        </section>

        {/* ── Row 3: Quick actions ──────────────────────────────────────── */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Actions
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <QA label="Walk-in"         icon={Footprints}   onClick={() => setReservationOpen(true)} />
            <QA label="New reservation" icon={CalendarPlus} onClick={() => setReservationOpen(true)} />
            <QA label="Check-in"        icon={LogIn}        to="/arrivals" />
            <QA label="Check-out"       icon={LogOut}       to="/departures" />
            <QA label="Availability"    icon={Grid3x3}      to="/availability" />
            <QA
              label={openShift ? `End shift · ${openShift.userName}` : "Start shift"}
              icon={Clock}
              onClick={() => setShiftOpen(true)}
            />
          </div>
        </section>

        {/* ── Row 4: Trend charts ───────────────────────────────────────── */}
        <DashboardCharts />

        {/* ── Row 5: Room grid ──────────────────────────────────────────── */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Room Status Grid
          </p>
          <RoomsGridPanel />
        </section>

        {/* ── Row 6: Today's guests ─────────────────────────────────────── */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            In-House Guests
          </p>
          <TodayGuestsPanel />
        </section>

        {/* Hidden dialogs */}
        <NewReservationDialog open={reservationOpen} onOpenChange={setReservationOpen} trigger={null} />
        <ShiftDialog open={shiftOpen} onOpenChange={setShiftOpen} />
      </div>
    </AppLayout>
  );
}
