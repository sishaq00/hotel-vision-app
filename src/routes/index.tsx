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

  const isEnd = !!openShift;

  const handleSubmit = () => {
    if (isEnd && openShift) {
      endShift(openShift.id, closingCash);
      toast.success(`Shift ended for ${openShift.userName}`);
    } else {
      if (!name.trim()) {
        toast.error("Enter your name to start the shift");
        return;
      }
      startShift(name.trim(), openingCash);
      toast.success(`Shift started for ${name.trim()}`);
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
          <DialogTitle>{isEnd ? "End Shift" : "Start Shift"}</DialogTitle>
          <DialogDescription>
            {isEnd
              ? `Close the shift for ${openShift?.userName}.`
              : "Open a new front desk shift."}
          </DialogDescription>
        </DialogHeader>
        {isEnd ? (
          <div className="space-y-2">
            <Label htmlFor="closingCash">Closing cash drawer</Label>
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
              <Label htmlFor="name">Employee name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingCash">Opening cash drawer</Label>
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
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{isEnd ? "End Shift" : "Start Shift"}</Button>
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
  const navigate = useNavigate();

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

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-4">
        {/* Three big sections — House / Bookings / Availability */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* House */}
          <section>
            <SectionHeader title="House" />
            <div className="grid grid-cols-2 gap-2">
              <KpiTile
                label="In House"
                value={kpis.inHouse}
                footerLeft={`Stay Overs: ${kpis.stayOvers}`}
                footerRight={`Arrivals: ${kpis.arrivalsCheckedIn}`}
                accent="violet"
              />
              <KpiTile
                label="Departures"
                value={kpis.departuresToday}
                footerLeft={`Total: ${kpis.departuresToday}`}
                footerRight={`Checked Out: ${kpis.checkedOutToday}`}
                accent="violet"
              />
              <KpiTile
                label="Dirty Rooms"
                value={kpis.dirty}
                footerLeft={`Today: ${kpis.dirty}`}
                footerRight={`Rollover: ${kpis.dirtyRollover}`}
                accent="amber"
              />
              <KpiTile
                label="Ready Rooms"
                value={kpis.ready}
                footerLeft={`Total: ${kpis.ready}`}
                footerRight={`Clean: ${kpis.ready}`}
                accent="green"
              />
            </div>
          </section>

          {/* Bookings */}
          <section>
            <SectionHeader title="Bookings" />
            <div className="grid grid-cols-2 gap-2">
              <KpiTile
                label="Arrivals"
                value={kpis.arrivals}
                footerLeft={`Total: ${kpis.arrivals}`}
                footerRight={`Checked In: ${kpis.arrivalsCheckedInCount}`}
                accent="violet"
              />
              <KpiTile
                label="No Show / Late Cancel"
                value={kpis.noShows}
                footerLeft={`Total: ${kpis.noShows}`}
                footerRight={`Rollover: 0`}
                accent="rose"
              />
              <KpiTile
                label="Advance Deposits"
                value={kpis.depositCount}
                footerLeft={`Paid: ${kpis.depositPaid.toFixed(0)}`}
                footerRight={`Pending: 0`}
                accent="blue"
              />
              <KpiTile
                label="Booked Today"
                value={kpis.bookedToday}
                footerLeft={`Today: ${kpis.bookedToday}`}
                footerRight={`Future: ${kpis.futureBooked}`}
                accent="green"
              />
            </div>
          </section>

          {/* Availability */}
          <section>
            <SectionHeader title="Availability" />
            <div className="grid grid-cols-2 gap-2">
              <KpiTile label="Total Rooms" value={kpis.total} accent="slate" />
              <KpiTile label="Out Of Order" value={kpis.outOfOrder} accent="rose" />
              <KpiTile label="Sold" value={kpis.sold} accent="violet" />
              <KpiTile label="Available" value={kpis.available} accent="green" />
            </div>
          </section>
        </div>

        {/* 6 Quick action buttons (3 cols × 2 rows) */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <QuickAction
            label="Walk In"
            icon={Footprints}
            onClick={() => setReservationOpen(true)}
          />
          <QuickAction
            label="New Booking"
            icon={CalendarPlus}
            onClick={() => setReservationOpen(true)}
          />
          <QuickAction label="New Group Master" icon={Users} to="/group-master" />

          <QuickAction
            label={openShift ? `End Shift (${openShift.userName})` : "Start Shift"}
            icon={Clock}
            onClick={() => setShiftOpen(true)}
          />
          <QuickAction
            label="Search Reservations"
            icon={Search}
            to="/search-reservations"
          />
          <QuickAction
            label="Grid View and Floor Plan"
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
