// Bell icon with dropdown of operational alerts (arrivals, departures, overdue).
import { useMemo } from "react";
import { Bell, LogIn, LogOut, AlertTriangle, BedDouble } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useHotelStore } from "@/store/hotel-store";
import { useNavigate } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";

export function NotificationsBell() {
  const reservations = useHotelStore((s) => s.reservations);
  const rooms = useHotelStore((s) => s.rooms);
  const hkReports = useHotelStore((s) => s.housekeeperReports);
  const navigate = useNavigate();
  const { t } = useT();

  const lastNightAuditDate = useHotelStore((s) => s.lastNightAuditDate);
  const pendingHkReports = hkReports.filter((r) => r.status === "submitted").length;

  const alerts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const arrivals = reservations.filter(
      (r) => r.status === "confirmed" && (r.checkIn ?? "").slice(0, 10) === today
    );
    const departures = reservations.filter(
      (r) => r.status === "checked-in" && (r.checkOut ?? "").slice(0, 10) === today
    );
    const overdue = reservations.filter(
      (r) => r.status === "checked-in" && (r.checkOut ?? "").slice(0, 10) < today
    );
    const ooo = rooms.filter((r) => r.status === "maintenance");
    // Night audit reminder: after 3am if yesterday wasn't audited yet
    const hour = new Date().getHours();
    const auditDue = hour >= 3 && (!lastNightAuditDate || lastNightAuditDate < yesterday);
    return { arrivals, departures, overdue, ooo, auditDue };
  }, [reservations, rooms, lastNightAuditDate]);

  const total =
    alerts.arrivals.length +
    alerts.departures.length +
    alerts.overdue.length +
    alerts.ooo.length +
    pendingHkReports +
    (alerts.auditDue ? 1 : 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 rounded p-0 text-muted-foreground"
          title={t("notifications.title") || "Notifications"}
        >
          <Bell className="h-4 w-4" />
          {total > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
              {total > 9 ? "9+" : total}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs">
          {t("notifications.title") || "Notifications"} · {total}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {total === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            {t("notifications.empty") || "All clear — no pending alerts"}
          </div>
        ) : (
          <>
            {alerts.arrivals.length > 0 && (
              <DropdownMenuItem onClick={() => navigate({ to: "/reservations" })} className="gap-2 text-xs">
                <LogIn className="h-3.5 w-3.5 text-primary" />
                <span className="flex-1">{t("notifications.arrivals") || "Arrivals today"}</span>
                <span className="font-semibold">{alerts.arrivals.length}</span>
              </DropdownMenuItem>
            )}
            {alerts.departures.length > 0 && (
              <DropdownMenuItem onClick={() => navigate({ to: "/reservations" })} className="gap-2 text-xs">
                <LogOut className="h-3.5 w-3.5 text-primary" />
                <span className="flex-1">{t("notifications.departures") || "Departures today"}</span>
                <span className="font-semibold">{alerts.departures.length}</span>
              </DropdownMenuItem>
            )}
            {alerts.overdue.length > 0 && (
              <DropdownMenuItem onClick={() => navigate({ to: "/reservations" })} className="gap-2 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="flex-1">{t("notifications.overdue") || "Overdue checkouts"}</span>
                <span className="font-semibold">{alerts.overdue.length}</span>
              </DropdownMenuItem>
            )}
            {alerts.ooo.length > 0 && (
              <DropdownMenuItem onClick={() => navigate({ to: "/rooms" })} className="gap-2 text-xs">
                <BedDouble className="h-3.5 w-3.5 text-amber-500" />
                <span className="flex-1">{t("notifications.ooo") || "Rooms out of service"}</span>
                <span className="font-semibold">{alerts.ooo.length}</span>
              </DropdownMenuItem>
            )}
            {alerts.auditDue && (
              <DropdownMenuItem onClick={() => navigate({ to: "/night-audit" })} className="gap-2 text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="flex-1">Night Audit pending</span>
                <span className="font-semibold">!</span>
              </DropdownMenuItem>
            )}
            {pendingHkReports > 0 && (
              <DropdownMenuItem onClick={() => navigate({ to: "/housekeeping" })} className="gap-2 text-xs">
                <BedDouble className="h-3.5 w-3.5 text-primary" />
                <span className="flex-1">Housekeeper reports pending</span>
                <span className="font-semibold">{pendingHkReports}</span>
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
