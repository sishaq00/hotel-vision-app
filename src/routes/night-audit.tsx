// Night Audit Wizard — 4-step closing process: review → no-show → backup → daily report PDF.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Moon,
  AlertTriangle,
  CheckCircle2,
  FileDown,
  ShieldCheck,
  ListChecks,
  ChevronRight,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHotelStore } from "@/store/hotel-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { downloadReportPDF } from "@/lib/report-pdf";

export const Route = createFileRoute("/night-audit")({
  head: () => ({
    meta: [
      { title: "Night Audit — NEXORA OS" },
      { name: "description", content: "Daily closing wizard with auto no-show, backup, and report." },
    ],
  }),
  component: NightAuditWizard,
});

const todayIso = () => new Date().toISOString().slice(0, 10);

interface StepDef {
  key: string;
  title: string;
  description: string;
  icon: typeof Moon;
}

const STEPS: StepDef[] = [
  { key: "review", title: "Review the day", description: "Verify arrivals, departures, occupancy, and revenue.", icon: ListChecks },
  { key: "no-show", title: "Mark no-shows", description: "Auto-mark unchecked-in confirmed reservations from prior days.", icon: AlertTriangle },
  { key: "backup", title: "Create snapshot", description: "Download a JSON backup of the entire system state.", icon: ShieldCheck },
  { key: "report", title: "Daily report", description: "Generate a printable PDF closing report.", icon: FileDown },
];

function NightAuditWizard() {
  const reservations = useHotelStore((s) => s.reservations);
  const rooms = useHotelStore((s) => s.rooms);
  const payments = useHotelStore((s) => s.payments);
  const settings = useHotelStore((s) => s.settings);
  const guests = useHotelStore((s) => s.guests);
  const markNoShow = useHotelStore((s) => s.markNoShow);
  const runHkReclassify = useHotelStore((s) => s.runNightAuditHousekeeping);
  const postNightlyRoomCharges = useHotelStore((s) => s.postNightlyRoomCharges);

  const setLastNightAuditDate = useHotelStore((s) => s.setLastNightAuditDate);
  const lastAuditDate = useHotelStore((s) => s.lastNightAuditDate);

  const [auditDate, setAuditDate] = useState(todayIso());
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

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
      (r) => r.status === "confirmed" && r.checkIn < auditDate && !r.noShow,
    );
    const todaysPayments = payments.filter((p) => p.date === auditDate);
    const revenue = todaysPayments
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + p.amount, 0);
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

  const markStepDone = (key: string) =>
    setCompleted((c) => ({ ...c, [key]: true }));

  const advance = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));

  // ---- Step actions ------------------------------------------------------
  const stepReview = () => {
    if (summary.dueDepart.length > 0) {
      toast.error(`${summary.dueDepart.length} reservation(s) need to check out first`);
      return;
    }
    markStepDone("review");
    advance();
  };

  const stepNoShow = () => {
    summary.noShows.forEach((r) => markNoShow(r.id));
    if (summary.noShows.length > 0) {
      toast.success(`${summary.noShows.length} reservation(s) marked No-Show`);
    } else {
      toast("No no-shows to mark");
    }
    markStepDone("no-show");
    advance();
  };

  const stepBackup = () => {
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
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `night-audit-${auditDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup saved");
    markStepDone("backup");
    advance();
  };

  const stepReport = () => {
    const guestById = new Map(guests.map((g) => [g.id, g]));
    const roomById = new Map(rooms.map((r) => [r.id, r]));
    const rows: Record<string, unknown>[] = [
      { metric: "Audit date", value: auditDate },
      { metric: "Hotel", value: settings.hotelName },
      { metric: "Arrivals", value: summary.arrivals.length },
      { metric: "In-house", value: summary.inHouse.length },
      { metric: "Departures", value: summary.departures.length },
      { metric: "No-shows marked", value: summary.noShows.length },
      { metric: "Occupancy", value: `${summary.occupancy.toFixed(1)}%` },
      { metric: "Occupied rooms", value: `${summary.occupiedRooms}/${summary.totalRooms}` },
      { metric: "Payments count", value: summary.paymentCount },
      { metric: "Revenue", value: `${settings.currency} ${summary.revenue.toFixed(2)}` },
      { metric: "—", value: "—" },
      ...summary.departures.map((d) => ({
        metric: `Departure: ${guestById.get(d.guestId)?.name ?? "—"}`,
        value: `Room ${roomById.get(d.roomId)?.number ?? "—"} · ${d.invoice?.invoiceNumber ?? "—"} · ${settings.currency} ${(d.invoice?.total ?? d.totalAmount).toFixed(2)}`,
      })),
    ];
    downloadReportPDF({
      title: `Night Audit Report — ${auditDate}`,
      rows,
      settings,
    });
    markStepDone("report");
    setLastNightAuditDate(auditDate);
    // Post nightly room charges (one per checked-in reservation, idempotent per date)
    const charges = postNightlyRoomCharges(auditDate);
    // Reclassify housekeeping rooms based on reservations
    const hk = runHkReclassify();
    toast.success("Night audit completed", {
      description: `${settings.currency} ${summary.revenue.toFixed(2)} · ${summary.occupancy.toFixed(0)}% occupancy · HK: ${hk.stayover} stayover, ${hk.departure} departure · ${charges.count} nightly charge(s) ${settings.currency} ${charges.total.toFixed(2)}`,
    });
  };

  const allDone = STEPS.every((s) => completed[s.key]);

  return (
    <AppLayout
      title="Night Audit"
      subtitle={`Closing for ${new Date(auditDate).toLocaleDateString()}${lastAuditDate ? ` · last run: ${lastAuditDate}` : ""}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Audit date:</label>
        <input
          type="date"
          value={auditDate}
          onChange={(e) => setAuditDate(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Wizard */}
        <Card className="border-border/60 p-5 shadow-card">
          {/* Stepper */}
          <div className="mb-6 flex items-center justify-between gap-2">
            {STEPS.map((s, i) => {
              const isActive = i === step;
              const isDone = completed[s.key];
              const Icon = s.icon;
              return (
                <div key={s.key} className="flex flex-1 items-center">
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-all",
                      isActive && "border-primary bg-primary/10 text-primary",
                      !isActive && isDone && "border-success/40 bg-success/10 text-success",
                      !isActive && !isDone && "border-border bg-muted/30 text-muted-foreground",
                    )}
                  >
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    <span className="hidden sm:inline">{i + 1}. {s.title}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step content */}
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Review the day</h3>
              <p className="text-xs text-muted-foreground">{STEPS[0].description}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                  hint={`${summary.paymentCount} payment(s)`}
                  wide
                />
                <Stat
                  label="Pending no-shows"
                  value={summary.noShows.length}
                  wide
                />
              </div>
              {summary.dueDepart.length > 0 && (
                <Warn text={`${summary.dueDepart.length} reservation(s) past their checkout date — please check them out before continuing.`} />
              )}
              <div className="flex justify-end">
                <Button onClick={stepReview} disabled={summary.dueDepart.length > 0}>
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Mark no-shows</h3>
              <p className="text-xs text-muted-foreground">{STEPS[1].description}</p>
              <div className="rounded-md border border-border bg-muted/20 p-4 text-sm">
                {summary.noShows.length === 0 ? (
                  <p className="text-muted-foreground">No pending no-shows. ✅</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {summary.noShows.slice(0, 10).map((r) => {
                      const g = guests.find((x) => x.id === r.guestId);
                      return (
                        <li key={r.id} className="flex justify-between">
                          <span>{g?.name ?? "Guest"}</span>
                          <span className="text-muted-foreground">{r.checkIn}</span>
                        </li>
                      );
                    })}
                    {summary.noShows.length > 10 && (
                      <li className="text-muted-foreground">+{summary.noShows.length - 10} more…</li>
                    )}
                  </ul>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
                <Button onClick={stepNoShow}>
                  Mark all & continue <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Create snapshot</h3>
              <p className="text-xs text-muted-foreground">{STEPS[2].description}</p>
              <div className="rounded-md border border-info/30 bg-info/10 p-4 text-xs text-foreground">
                A full JSON backup will be downloaded containing rooms, reservations, guests, payments, and settings.
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={stepBackup}>
                  Download backup & continue <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Daily closing report</h3>
              <p className="text-xs text-muted-foreground">{STEPS[3].description}</p>
              <div className="rounded-md border border-border bg-muted/20 p-4 text-xs">
                The PDF includes hotel branding, daily metrics, and a list of today's checkouts with invoice totals.
              </div>
              {allDone && (
                <div className="rounded-md border border-success/40 bg-success/10 p-3 text-xs text-success">
                  ✅ Night audit complete for {auditDate}.
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={stepReport}>
                  <FileDown className="h-4 w-4" /> Generate PDF report
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Side: live snapshot */}
        <Card className="border-border/60 p-5 shadow-card">
          <h3 className="text-sm font-semibold">Tonight's snapshot</h3>
          <dl className="mt-3 space-y-2 text-xs">
            <Row k="Date" v={auditDate} />
            <Row k="Hotel" v={settings.hotelName} />
            <Row k="Arrivals" v={String(summary.arrivals.length)} />
            <Row k="In-house" v={String(summary.inHouse.length)} />
            <Row k="Departures" v={String(summary.departures.length)} />
            <Row k="No-shows" v={String(summary.noShows.length)} />
            <Row k="Occupancy" v={`${summary.occupancy.toFixed(0)}%`} />
            <Row k="Revenue" v={`${settings.currency} ${summary.revenue.toFixed(2)}`} />
          </dl>
        </Card>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value, hint, wide }: { label: string; value: string | number; hint?: string; wide?: boolean }) {
  return (
    <div className={cn("rounded-lg border border-border bg-muted/30 p-3", wide && "sm:col-span-2")}>
      <div className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Warn({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <span>{text}</span>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-1">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium text-foreground">{v}</dd>
    </div>
  );
}
