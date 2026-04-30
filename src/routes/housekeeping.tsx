import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHotelStore, type HousekeepingStatus } from "@/store/hotel-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/housekeeping")({
  head: () => ({
    meta: [
      { title: "Housekeeping — NEXORA OS" },
      { name: "description", content: "Manage room cleanliness status." },
    ],
  }),
  component: HousekeepingPage,
});

const HK_STATUSES: HousekeepingStatus[] = ["dirty", "clean", "inspected", "out-of-order", "departure", "stayover"];

const STATUS_STYLE: Record<HousekeepingStatus, string> = {
  dirty: "bg-warning/15 text-warning-foreground border-warning/30",
  clean: "bg-info/10 text-info border-info/20",
  inspected: "bg-success/10 text-success border-success/20",
  "out-of-order": "bg-destructive/10 text-destructive border-destructive/20",
  departure: "bg-destructive/10 text-destructive border-destructive/20",
  stayover: "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

function HousekeepingPage() {
  const rooms = useHotelStore((s) => s.rooms.filter((r) => !r.archived));
  const updateHousekeeping = useHotelStore((s) => s.updateRoomHousekeeping);
  const [filter, setFilter] = useState<"all" | HousekeepingStatus>("all");

  const sorted = useMemo(
    () =>
      [...rooms].sort((a, b) =>
        a.number.localeCompare(b.number, undefined, { numeric: true }),
      ),
    [rooms],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return sorted;
    return sorted.filter((r) => (r.housekeepingStatus ?? "clean") === filter);
  }, [sorted, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: sorted.length };
    for (const s of HK_STATUSES) c[s] = 0;
    sorted.forEach((r) => {
      const k = r.housekeepingStatus ?? "clean";
      c[k] = (c[k] ?? 0) + 1;
    });
    return c;
  }, [sorted]);

  return (
    <AppLayout
      title="Housekeeping"
      subtitle="Track room cleanliness: dirty → clean → inspected → ready"
    >
      <Card className="border-border/60 shadow-card">
        <div className="flex flex-wrap gap-2 border-b border-border p-4">
          {(["all", ...HK_STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {s.replace("-", " ")} <span className="ml-1 opacity-70">({counts[s] ?? 0})</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No rooms"
            description={
              rooms.length === 0
                ? "Add rooms in the Rooms module first."
                : "No rooms match this filter."
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((room) => {
              const hk = room.housekeepingStatus ?? "clean";
              return (
                <div
                  key={room.id}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-baseline justify-between">
                    <div className="font-semibold text-foreground">
                      Room {room.number}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Fl {room.floor}
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {room.typeCode}
                  </div>
                  <span
                    className={cn(
                      "mt-2 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium capitalize",
                      STATUS_STYLE[hk],
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {hk.replace("-", " ")}
                  </span>
                  <div className="mt-3">
                    <Select
                      value={hk}
                      onValueChange={(v) => {
                        updateHousekeeping(room.id, v as HousekeepingStatus);
                        toast.success(`Room ${room.number}: ${v.replace("-", " ")}`);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HK_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s.replace("-", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
