// Right-side panel summarizing today's housekeeping assignments per housekeeper.
import { useMemo } from "react";
import { Printer, FileBarChart2, Layers, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHotelStore } from "@/store/hotel-store";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";

export function AssignedPanel({
  onOpenReports,
  canPrint,
  reportCount,
}: {
  onOpenReports: () => void;
  canPrint: boolean;
  reportCount: number;
}) {
  const rooms = useHotelStore((s) => s.rooms);
  const housekeepers = useHotelStore((s) => s.housekeepers);
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const byHk = new Map<string, { assigned: number; done: number }>();
    rooms.forEach((r) => {
      if (!r.assignedHousekeeperId) return;
      const cur = byHk.get(r.assignedHousekeeperId) ?? { assigned: 0, done: 0 };
      cur.assigned++;
      if (r.cleaningFinishedAt) cur.done++;
      byHk.set(r.assignedHousekeeperId, cur);
    });
    return housekeepers
      .map((h) => ({
        hk: h,
        ...(byHk.get(h.id) ?? { assigned: 0, done: 0 }),
      }))
      .filter((s) => s.assigned > 0)
      .sort((a, b) => b.assigned - a.assigned);
  }, [rooms, housekeepers]);

  const totalAssigned = stats.reduce((s, x) => s + x.assigned, 0);
  const totalDone = stats.reduce((s, x) => s + x.done, 0);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Assigned ({totalDone}/{totalAssigned})
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={onOpenReports}
        >
          <FileBarChart2 className="h-3 w-3" /> Reports
          {reportCount > 0 && (
            <span className="rounded-full bg-destructive px-1.5 text-[9px] font-bold text-destructive-foreground">
              {reportCount}
            </span>
          )}
        </Button>
      </div>

      {stats.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No assignments yet. Select rooms and use Express Assign.
        </p>
      ) : (
        <ul className="space-y-2">
          {stats.map(({ hk, assigned, done }) => {
            const pct = assigned > 0 ? (done / assigned) * 100 : 0;
            return (
              <li key={hk.id} className="rounded border border-border/60 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {hk.initials || hk.name[0]}
                    </span>
                    <span className="truncate text-xs font-medium">{hk.name}</span>
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {done}/{assigned}
                  </span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      pct === 100 ? "bg-success" : "bg-primary",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canPrint && stats.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
          <Button
            variant="outline"
            size="sm"
            className="h-7 justify-start gap-2 text-xs"
            onClick={() => navigate({ to: "/print/housekeeping/all" })}
          >
            <Printer className="h-3 w-3" /> Print All Assignments
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 justify-start gap-2 text-xs"
            onClick={() => navigate({ to: "/print/housekeeping/by-floor" })}
          >
            <Layers className="h-3 w-3" /> Print By Floor
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 justify-start gap-2 text-xs"
            onClick={() => navigate({ to: "/print/housekeeping/summary" })}
          >
            <Users className="h-3 w-3" /> Summary Report
          </Button>
        </div>
      )}
    </div>
  );
}
