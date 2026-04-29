import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Moon, Download, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHotelStore } from "@/store/hotel-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/night-audit")({
  head: () => ({
    meta: [
      { title: "Night Audit — NEXORA OS" },
      { name: "description", content: "Daily closing and backup." },
    ],
  }),
  component: NightAuditPage,
});

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function NightAuditPage() {
  const reservations = useHotelStore((s) => s.reservations);
  const rooms = useHotelStore((s) => s.rooms);
  const payments = useHotelStore((s) => s.payments);
  const settings = useHotelStore((s) => s.settings);
  const markNoShow = useHotelStore((s) => s.markNoShow);

  const [auditDate] = useState(todayIso());

  const summary = useMemo(() => {
    const arrivals = reservations.filter(
      (r) => r.checkIn === auditDate && r.status === "confirmed",
    );
    const inHouse = reservations.filter((r) => r.status === "checked-in");
    const departures = reservations.filter(
      (r) => r.status === "checked-out" && r.checkedOutAt?.startsWith(auditDate),
    );
    const dueDepart = reservations.filter(
      (r) => r.status === "checked-in" && r.checkOut <= auditDate,
    );
    const noShows = reservations.filter(
      (r) =>
        r.status === "confirmed" && r.checkIn < auditDate && !r.noShow,
    );
    const todaysPayments = payments.filter((p) => p.date === auditDate);
    const revenue = todaysPayments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);
    const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
    const totalRooms = rooms.filter((r) => !r.archived).length;
    const occupancy = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    return {
      arrivals,
      inHouse,
      departures,
      dueDepart,
      noShows,
      revenue,
      occupancy,
      occupiedRooms,
      totalRooms,
      paymentCount: todaysPayments.length,
    };
  }, [reservations, rooms, payments, auditDate]);

  const canClose = summary.dueDepart.length === 0;

  const runAudit = () => {
    // Auto-mark unchecked-in confirmed reservations from the past as no-show
    summary.noShows.forEach((r) => markNoShow(r.id));
    if (summary.noShows.length > 0) {
      toast.success(`${summary.noShows.length} reservation(s) marked No-Show`);
    }
    // Download backup snapshot
    const snapshot = {
      auditDate,
      generatedAt: new Date().toISOString(),
      hotel: settings.hotelName,
      summary: {
        arrivals: summary.arrivals.length,
        inHouse: summary.inHouse.length,
        departures: summary.departures.length,
        noShows: summary.noShows.length,
        revenue: summary.revenue,
        occupancy: summary.occupancy,
      },
      state: useHotelStore.getState(),
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `night-audit-${auditDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Night audit completed", {
      description: `Backup saved · ${settings.currency} ${summary.revenue.toFixed(2)} revenue`,
    });
  };

  return (
    <AppLayout
      title="Night Audit"
      subtitle={`Daily closing for ${new Date(auditDate).toLocaleDateString()}`}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Summary */}
        <Card className="border-border/60 p-5 shadow-card lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground">Daily snapshot</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Arrivals" value={summary.arrivals.length} />
            <Stat label="In-house" value={summary.inHouse.length} />
            <Stat label="Departures" value={summary.departures.length} />
            <Stat
              label="Occupancy"
              value={`${summary.occupancy.toFixed(0)}%`}
              hint={`${summary.occupiedRooms}/${summary.totalRooms}`}
            />
            <Stat
              label="Revenue"
              value={`${settings.currency} ${summary.revenue.toFixed(2)}`}
              hint={`${summary.paymentCount} payment${summary.paymentCount === 1 ? "" : "s"}`}
              wide
            />
            <Stat
              label="Pending no-shows"
              value={summary.noShows.length}
              hint="will be auto-cancelled"
              wide
            />
          </div>
        </Card>

        {/* Action */}
        <Card className="border-border/60 p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Run night audit</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Closes the day, marks no-shows, and downloads a JSON backup.
          </p>
          {!canClose && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                {summary.dueDepart.length} reservation
                {summary.dueDepart.length === 1 ? "" : "s"} should be checked out
                first.
              </div>
            </div>
          )}
          <Button
            className="mt-4 w-full"
            onClick={runAudit}
            disabled={!canClose}
          >
            <Moon className="h-4 w-4" /> Run audit & backup
          </Button>
          <Button
            variant="outline"
            className="mt-2 w-full"
            onClick={() => {
              const snapshot = useHotelStore.getState();
              const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `nexora-backup-${auditDate}.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success("Backup downloaded");
            }}
          >
            <Download className="h-4 w-4" /> Backup only (no closing)
          </Button>
        </Card>
      </div>
    </AppLayout>
  );
}

function Stat({
  label,
  value,
  hint,
  wide,
}: {
  label: string;
  value: string | number;
  hint?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/30 p-3",
        wide && "sm:col-span-2",
      )}
    >
      <div className="text-[10px] font-semibold uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-foreground">{value}</div>
      {hint && (
        <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}
