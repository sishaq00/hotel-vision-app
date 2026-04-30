// Compact room tile for the Housekeeping board.
// Shows number, bed code, status badge, assignee chip, and DND/issue flags.
import type { Room, Housekeeper, HousekeepingStatus } from "@/store/hotel-store";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { BanIcon, AlertOctagon, Wrench } from "lucide-react";

const STATUS_STYLE: Record<HousekeepingStatus, string> = {
  dirty: "bg-warning/15 text-warning-foreground border-warning/40",
  clean: "bg-info/10 text-info border-info/30",
  inspected: "bg-success/15 text-success border-success/40",
  "out-of-order": "bg-destructive/15 text-destructive border-destructive/40",
  departure: "bg-destructive/15 text-destructive border-destructive/40",
  stayover: "bg-amber-500/15 text-amber-600 border-amber-500/40 dark:text-amber-400",
};

export function RoomCard({
  room,
  housekeeper,
  selected,
  selectMode,
  onToggleSelect,
  onClick,
  hasIssue,
}: {
  room: Room;
  housekeeper?: Housekeeper;
  selected?: boolean;
  selectMode?: boolean;
  onToggleSelect?: () => void;
  onClick?: () => void;
  hasIssue?: boolean;
}) {
  const hk = (room.housekeepingStatus ?? "clean") as HousekeepingStatus;
  return (
    <div
      onClick={selectMode ? onToggleSelect : onClick}
      className={cn(
        "group relative cursor-pointer rounded-lg border bg-card p-2.5 text-left transition-all",
        "hover:border-primary/50 hover:shadow-sm",
        selected && "border-primary ring-2 ring-primary/30",
        !selected && "border-border",
      )}
    >
      {/* Select checkbox */}
      {selectMode && (
        <div className="absolute left-1.5 top-1.5">
          <Checkbox
            checked={!!selected}
            onCheckedChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4"
          />
        </div>
      )}

      {/* Flags row (top-right) */}
      <div className="absolute right-1.5 top-1.5 flex gap-1">
        {room.dndFlag && (
          <span title="Do Not Disturb" className="rounded bg-amber-500/20 p-0.5">
            <BanIcon className="h-3 w-3 text-amber-600" />
          </span>
        )}
        {room.refusedService && (
          <span title="Guest refused service" className="rounded bg-destructive/20 p-0.5">
            <AlertOctagon className="h-3 w-3 text-destructive" />
          </span>
        )}
        {hasIssue && (
          <span title="Maintenance issue" className="rounded bg-orange-500/20 p-0.5">
            <Wrench className="h-3 w-3 text-orange-600" />
          </span>
        )}
      </div>

      <div className={cn("font-bold text-foreground", selectMode && "ml-6")}>{room.number}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {room.bedCode || room.typeCode}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase",
            STATUS_STYLE[hk],
          )}
        >
          <span className="h-1 w-1 rounded-full bg-current" />
          {hk === "out-of-order" ? "OOO" : hk}
        </span>
        {housekeeper && (
          <span
            title={housekeeper.name}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground"
          >
            {housekeeper.initials || housekeeper.name[0]}
          </span>
        )}
      </div>

      {room.cleaningFinishedAt && (
        <div className="mt-1 text-[9px] text-success">✓ Done</div>
      )}
      {!room.cleaningFinishedAt && room.cleaningStartedAt && (
        <div className="mt-1 text-[9px] text-info">In progress…</div>
      )}
    </div>
  );
}
