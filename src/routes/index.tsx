import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CalendarPlus,
  Search,
  Grid3x3,
  Clock,
  Users,
  Plus,
  Footprints,
  Info,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { NewReservationDialog } from "@/components/reservations/NewReservationDialog";
import { Card } from "@/components/ui/card";
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

export const Route = createFileRoute("/")({
  component: Dashboard,
});

// ---------- Compact KPI tile (matches HOTEL KEY look) ---------------------

interface KpiTileProps {
  label: string;
  value: number | string;
  footerLeft?: string;
  footerRight?: string;
  accent?: "blue" | "green" | "amber" | "rose" | "violet" | "slate";
}

const accentMap = {
  blue: "border-l-info",
  green: "border-l-success",
  amber: "border-l-warning",
  rose: "border-l-destructive",
  violet: "border-l-primary",
  slate: "border-l-muted-foreground",
};

function KpiTile({ label, value, footerLeft, footerRight, accent = "blue" }: KpiTileProps) {
  return (
    <Card
      className={cn(
        "relative flex flex-col justify-between border-l-4 bg-card p-3 shadow-card transition-all hover:shadow-card-hover",
        accentMap[accent],
      )}
    >
      <div className="flex items-start justify-between">
        <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
        <Info className="h-3 w-3 text-muted-foreground/40" />
      </div>
      <div className="my-1 flex flex-col items-center text-center">
        <p className="text-3xl font-bold leading-none text-foreground">{value}</p>
        <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">{label}</p>
      </div>
      {(footerLeft || footerRight) && (
        <div className="mt-1 flex items-center justify-between border-t border-border/50 pt-1.5 text-[10px] text-muted-foreground">
          <span>{footerLeft ?? ""}</span>
          <span>{footerRight ?? ""}</span>
        </div>
      )}
    </Card>
  );
}

// ---------- Section header --------------------------------------------------

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="mb-2 text-center text-sm font-semibold text-muted-foreground">
      {title}
    </h2>
  );
}

// ---------- Quick action button --------------------------------------------

function QuickAction({
  label,
  icon: Icon,
  onClick,
  to,
}: {
  label: string;
  icon: typeof Plus;
  onClick?: () => void;
  to?: string;
}) {
  const className =
    "flex h-12 w-full items-center justify-center gap-2 rounded-md bg-info text-sm font-medium text-info-foreground shadow-sm transition-all hover:brightness-110 active:scale-[0.99]";
  if (to) {
    return (
      <Link to={to} className={className}>
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// ---------- Start/End shift dialog -----------------------------------------

function ShiftDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
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
      if (!name.trim()) {
        toast.error(t("shift.name-required"));
        return;
      }
      startShift(name.trim(), openingCash);
      toast.success(`${t("shift.started")} ${name.trim()}`);
    }
    onOpenChange(false);
    setName("");
    setOpeningCash(0);
    setClosingCash(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{isEnd ? t("shift.end") : t("shift.start")}</DialogTitle>
          <DialogDescription>
            {isEnd
              ? `${t("shift.close-desc")} ${openShift?.userName}.`
              : t("shift.open-desc")}
          </DialogDescription>
        </DialogHeader>
        {isEnd ? (
          <div className="space-y-2">
            <Label htmlFor="closingCash">{t("shift.closing-cash")}</Label>
            <Input
              id="closingCash"
              type="number"
              value={closingCash}
              onChange={(e) => setClosingCash(Number(e.target.value))}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">{t("shift.employee")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingCash">{t("shift.opening-cash")}</Label>
              <Input
                id="openingCash"
                type="number"
                value={openingCash}
                onChange={(e) => setOpeningCash(Number(e.target.value))}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit}>{isEnd ? t("shift.end") : t("shift.start")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Dashboard -------------------------------------------------------

function Dashboard() {
  const rooms = useHotelStore((s) => s.rooms);
  const reservations = useHotelStore((s) => s.reservations);
  const advanceDeposits = useHotelStore((s) => s.advanceDeposits);
  const openShift = useHotelStore((s) => s.shifts.find((x) => x.status === "open"));
  const { t } = useT();

  const [shiftOpen, setShiftOpen] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);

  const today = todayISO();

  const kpis = useMemo(() => {
    const inHouse = reservations.filter((r) => r.status === "checked-in").length;
    const stayOvers = reservations.filter(
      (r) => r.status === "checked-in" && r.checkOut > today,
    ).length;
    const arrivalsCheckedIn = reservations.filter(
      (r) => r.checkedInAt && r.checkedInAt.slice(0, 10) === today,
    ).length;

    const departuresToday = reservations.filter(
      (r) => r.checkOut === today && r.status !== "cancelled",
    ).length;
    const checkedOutToday = reservations.filter(
      (r) => r.checkedOutAt && r.checkedOutAt.slice(0, 10) === today,
    ).length;

    const dirty = rooms.filter((r) => r.housekeepingStatus === "dirty").length;
    const ready = rooms.filter(
      (r) => !r.housekeepingStatus || r.housekeepingStatus === "clean" || r.housekeepingStatus === "inspected",
    ).length;
    const dirtyRollover = rooms.filter(
      (r) => r.housekeepingStatus === "dirty" && r.status === "available",
    ).length;

    const arrivals = reservations.filter(
      (r) => r.checkIn === today && r.status !== "cancelled",
    ).length;
    const arrivalsCheckedInCount = reservations.filter(
      (r) => r.checkIn === today && r.status === "checked-in",
    ).length;

    const noShows = reservations.filter((r) => r.noShow).length;

    const heldDeposits = advanceDeposits.filter((d) => d.status === "held");
    const depositCount = heldDeposits.length;
    const depositPaid = heldDeposits.reduce((acc, d) => acc + d.amount, 0);

    const bookedToday = reservations.filter(
      (r) => r.createdAt.slice(0, 10) === today,
    ).length;
    const futureBooked = reservations.filter(
      (r) => r.checkIn > today && r.status !== "cancelled",
    ).length;

    const total = rooms.filter((r) => !r.archived).length;
    const outOfOrder = rooms.filter(
      (r) => r.housekeepingStatus === "out-of-order" || r.status === "maintenance",
    ).length;
    const sold = rooms.filter((r) => r.status === "occupied").length;
    const available = rooms.filter(
      (r) => r.status === "available" && !r.archived,
    ).length;

    return {
      inHouse,
      stayOvers,
      arrivalsCheckedIn,
      departuresToday,
      checkedOutToday,
      dirty,
      ready,
      dirtyRollover,
      arrivals,
      arrivalsCheckedInCount,
      noShows,
      depositCount,
      depositPaid,
      bookedToday,
      futureBooked,
      total,
      outOfOrder,
      sold,
      available,
    };
  }, [rooms, reservations, advanceDeposits, today]);

  // Performance KPIs: Occupancy, ADR, RevPAR
  const perf = useMemo(() => {
    const sellable = rooms.filter(
      (r) => !r.archived && r.status !== "maintenance",
    ).length;
    const occupied = reservations.filter((r) => r.status === "checked-in").length;
    const occupancyPct = sellable > 0 ? (occupied / sellable) * 100 : 0;

    // ADR = revenue from rooms sold today / occupied rooms
    const checkedInToday = reservations.filter(
      (r) => r.status === "checked-in" || r.checkedInAt?.slice(0, 10) === today,
    );
    const totalRevenue = checkedInToday.reduce((s, r) => {
      const rm = rooms.find((x) => x.id === r.roomId);
      return s + (rm?.price ?? 0);
    }, 0);
    const adr = checkedInToday.length > 0 ? totalRevenue / checkedInToday.length : 0;

    // RevPAR = total room revenue / total available rooms
    const revpar = sellable > 0 ? totalRevenue / sellable : 0;

    return {
      occupancyPct,
      adr,
      revpar,
      sellable,
      occupied,
    };
  }, [rooms, reservations, today]);

  return (
    <AppLayout title={t("nav.dashboard")}>
      <div className="space-y-4">
        {/* Three big sections — House / Bookings / Availability */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* House */}
          <section>
            <SectionHeader title={t("dash.house")} />
            <div className="grid grid-cols-2 gap-2">
              <KpiTile
                label={t("dash.in-house")}
                value={kpis.inHouse}
                footerLeft={`${t("dash.stay-overs")}: ${kpis.stayOvers}`}
                footerRight={`${t("dash.arrivals")}: ${kpis.arrivalsCheckedIn}`}
                accent="violet"
              />
              <KpiTile
                label={t("dash.departures")}
                value={kpis.departuresToday}
                footerLeft={`${t("dash.total")}: ${kpis.departuresToday}`}
                footerRight={`${t("dash.checked-out")}: ${kpis.checkedOutToday}`}
                accent="violet"
              />
              <KpiTile
                label={t("dash.dirty-rooms")}
                value={kpis.dirty}
                footerLeft={`${t("dash.today")}: ${kpis.dirty}`}
                footerRight={`${t("dash.rollover")}: ${kpis.dirtyRollover}`}
                accent="amber"
              />
              <KpiTile
                label={t("dash.ready-rooms")}
                value={kpis.ready}
                footerLeft={`${t("dash.total")}: ${kpis.ready}`}
                footerRight={`${t("dash.clean")}: ${kpis.ready}`}
                accent="green"
              />
            </div>
          </section>

          {/* Bookings */}
          <section>
            <SectionHeader title={t("dash.bookings")} />
            <div className="grid grid-cols-2 gap-2">
              <KpiTile
                label={t("dash.arrivals")}
                value={kpis.arrivals}
                footerLeft={`${t("dash.total")}: ${kpis.arrivals}`}
                footerRight={`${t("dash.checked-in")}: ${kpis.arrivalsCheckedInCount}`}
                accent="violet"
              />
              <KpiTile
                label={t("dash.no-show")}
                value={kpis.noShows}
                footerLeft={`${t("dash.total")}: ${kpis.noShows}`}
                footerRight={`${t("dash.rollover")}: 0`}
                accent="rose"
              />
              <KpiTile
                label={t("dash.advance-deposits")}
                value={kpis.depositCount}
                footerLeft={`${t("dash.paid")}: ${kpis.depositPaid.toFixed(0)}`}
                footerRight={`${t("dash.pending")}: 0`}
                accent="blue"
              />
              <KpiTile
                label={t("dash.booked-today")}
                value={kpis.bookedToday}
                footerLeft={`${t("dash.today")}: ${kpis.bookedToday}`}
                footerRight={`${t("dash.future")}: ${kpis.futureBooked}`}
                accent="green"
              />
            </div>
          </section>

          {/* Availability */}
          <section>
            <SectionHeader title={t("dash.availability")} />
            <div className="grid grid-cols-2 gap-2">
              <KpiTile label={t("dash.total-rooms")} value={kpis.total} accent="slate" />
              <KpiTile label={t("dash.out-of-order")} value={kpis.outOfOrder} accent="rose" />
              <KpiTile label={t("dash.sold")} value={kpis.sold} accent="violet" />
              <KpiTile label={t("dash.available")} value={kpis.available} accent="green" />
            </div>
          </section>
        </div>

        {/* Performance KPIs */}
        <section>
          <SectionHeader title="Performance" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <KpiTile
              label="Occupancy"
              value={`${perf.occupancyPct.toFixed(1)}%`}
              footerLeft={`${perf.occupied}/${perf.sellable} rooms`}
              footerRight="checked-in"
              accent="blue"
            />
            <KpiTile
              label="ADR"
              value={perf.adr.toFixed(0)}
              footerLeft="Avg Daily Rate"
              footerRight="per occupied"
              accent="green"
            />
            <KpiTile
              label="RevPAR"
              value={perf.revpar.toFixed(0)}
              footerLeft="Revenue per available room"
              footerRight="today"
              accent="violet"
            />
          </div>
        </section>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <QuickAction
            label={t("qa.walk-in")}
            icon={Footprints}
            onClick={() => setReservationOpen(true)}
          />
          <QuickAction
            label={t("qa.new-booking")}
            icon={CalendarPlus}
            onClick={() => setReservationOpen(true)}
          />
          <QuickAction label={t("qa.new-group")} icon={Users} to="/group-master" />

          <QuickAction
            label={openShift ? `${t("qa.end-shift")} (${openShift.userName})` : t("qa.start-shift")}
            icon={Clock}
            onClick={() => setShiftOpen(true)}
          />
          <QuickAction
            label={t("qa.search-res")}
            icon={Search}
            to="/search-reservations"
          />
          <QuickAction
            label={t("qa.grid-view")}
            icon={Grid3x3}
            to="/availability"
          />
        </div>

        {/* Hidden reservation dialog opened via Walk-In/New Booking */}
        <NewReservationDialog
          open={reservationOpen}
          onOpenChange={setReservationOpen}
          trigger={null}
        />

        <ShiftDialog open={shiftOpen} onOpenChange={setShiftOpen} />
      </div>
    </AppLayout>
  );
}
