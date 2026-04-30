import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sparkles, X, CheckSquare, Zap, Users, BanIcon, Wand2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useHotelStore, type Room } from "@/store/hotel-store";
import { usePermission } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { RoomCard } from "@/components/housekeeping/RoomCard";
import { HousekeepingFilters, type FilterState } from "@/components/housekeeping/HousekeepingFilters";
import { AssignedPanel } from "@/components/housekeeping/AssignedPanel";
import { ExpressAssignDialog } from "@/components/housekeeping/ExpressAssignDialog";
import { ManageHousekeepersDialog } from "@/components/housekeeping/ManageHousekeepersDialog";
import { HousekeepingTeamsDialog } from "@/components/housekeeping/HousekeepingTeamsDialog";
import { RoomDetailDialog } from "@/components/housekeeping/RoomDetailDialog";
import { HousekeeperReportsDialog } from "@/components/housekeeping/HousekeeperReportsDialog";

export const Route = createFileRoute("/housekeeping")({
  head: () => ({
    meta: [
      { title: "Housekeeping — NEXORA OS" },
      { name: "description", content: "Multi-select rooms, assign to housekeepers/teams, review reports." },
    ],
  }),
  component: HousekeepingPage,
});

function HousekeepingPage() {
  const rooms = useHotelStore((s) => s.rooms.filter((r) => !r.archived));
  const housekeepers = useHotelStore((s) => s.housekeepers);
  const tickets = useHotelStore((s) => s.maintenanceTickets);
  const reports = useHotelStore((s) => s.housekeeperReports);
  const autoDistribute = useHotelStore((s) => s.autoDistributeDirtyRooms);
  const setDND = useHotelStore((s) => s.setRoomDND);
  const unassign = useHotelStore((s) => s.unassignRooms);

  const canAssign = usePermission("housekeeping.assign");
  const canManageStaff = usePermission("housekeeping.manage-staff");
  const canPrint = usePermission("housekeeping.print");
  const canReview = usePermission("housekeeping.review-reports");

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterState>({
    status: "all",
    floor: "all",
    building: "all",
    zone: "all",
    housekeeperId: "all",
  });
  const [showAssign, setShowAssign] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [detailRoom, setDetailRoom] = useState<Room | null>(null);

  const floors = useMemo(
    () => Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b),
    [rooms],
  );
  const buildings = useMemo(
    () => Array.from(new Set(rooms.map((r) => r.building).filter(Boolean) as string[])),
    [rooms],
  );
  const zones = useMemo(
    () => Array.from(new Set(rooms.map((r) => r.zone).filter(Boolean) as string[])),
    [rooms],
  );

  const filtered = useMemo(() => {
    return rooms
      .filter((r) => {
        if (filter.status !== "all") {
          if (filter.status === "assigned") {
            if (!r.assignedHousekeeperId) return false;
          } else if (filter.status === "unassigned") {
            if (r.assignedHousekeeperId) return false;
          } else {
            if ((r.housekeepingStatus ?? "clean") !== filter.status) return false;
          }
        }
        if (filter.floor !== "all" && String(r.floor) !== filter.floor) return false;
        if (filter.building !== "all" && r.building !== filter.building) return false;
        if (filter.zone !== "all" && r.zone !== filter.zone) return false;
        if (filter.housekeeperId !== "all") {
          if (filter.housekeeperId === "none") {
            if (r.assignedHousekeeperId) return false;
          } else if (r.assignedHousekeeperId !== filter.housekeeperId) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  }, [rooms, filter]);

  const counts = useMemo(() => {
    const c = { dirty: 0, departure: 0, stayover: 0, clean: 0, inspected: 0, ooo: 0, assigned: 0 };
    rooms.forEach((r) => {
      const s = r.housekeepingStatus ?? "clean";
      if (s === "dirty") c.dirty++;
      else if (s === "departure") c.departure++;
      else if (s === "stayover") c.stayover++;
      else if (s === "clean") c.clean++;
      else if (s === "inspected") c.inspected++;
      else if (s === "out-of-order") c.ooo++;
      if (r.assignedHousekeeperId) c.assigned++;
    });
    return c;
  }, [rooms]);

  const issueRoomIds = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => { if (t.roomId && t.status !== "resolved") set.add(t.roomId); });
    return set;
  }, [tickets]);

  const hkById = useMemo(() => new Map(housekeepers.map((h) => [h.id, h])), [housekeepers]);

  const toggleRoom = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const selectedArray = Array.from(selected);
  const pendingReports = reports.filter((r) => r.status === "submitted").length;

  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); };
  const selectAllVisible = () => setSelected(new Set(filtered.map((r) => r.id)));

  return (
    <AppLayout
      title="Housekeeping"
      subtitle={`${counts.dirty + counts.departure + counts.stayover} need cleaning · ${counts.assigned} assigned`}
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        {/* Main board */}
        <Card className="border-border/60 shadow-card">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              {selectMode ? (
                <Button variant="outline" size="sm" className="h-8 gap-1" onClick={exitSelect}>
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
              ) : (
                canAssign && (
                  <Button size="sm" className="h-8 gap-1" onClick={() => setSelectMode(true)}>
                    <CheckSquare className="h-3.5 w-3.5" /> Select
                  </Button>
                )
              )}
              {selectMode && (
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={selectAllVisible}>
                  Select all visible ({filtered.length})
                </Button>
              )}
              <HousekeepingFilters
                state={filter}
                onChange={setFilter}
                floors={floors}
                buildings={buildings}
                zones={zones}
                housekeepers={housekeepers}
              />
            </div>
            <div className="flex items-center gap-2">
              {canAssign && (
                <Button
                  variant="outline" size="sm" className="h-8 gap-1 text-xs"
                  onClick={() => {
                    const n = autoDistribute();
                    if (n === 0) toast("Nothing to distribute (no active housekeepers or no dirty rooms)");
                    else toast.success(`Auto-distributed ${n} room(s)`);
                  }}
                >
                  <Wand2 className="h-3.5 w-3.5" /> Auto Distribute
                </Button>
              )}
              {canManageStaff && (
                <>
                  <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setShowManage(true)}>
                    <Users className="h-3.5 w-3.5" /> Housekeepers
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setShowTeams(true)}>
                    <Users className="h-3.5 w-3.5" /> Teams
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Status pills */}
          <div className="flex flex-wrap gap-1.5 border-b border-border p-2 text-[10px]">
            <Pill label="Dirty" n={counts.dirty} color="bg-warning/15 text-warning-foreground" />
            <Pill label="Departure" n={counts.departure} color="bg-destructive/15 text-destructive" />
            <Pill label="Stayover" n={counts.stayover} color="bg-amber-500/15 text-amber-600" />
            <Pill label="Clean" n={counts.clean} color="bg-info/10 text-info" />
            <Pill label="Inspected" n={counts.inspected} color="bg-success/15 text-success" />
            <Pill label="OOO" n={counts.ooo} color="bg-destructive/10 text-destructive" />
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No rooms"
              description={rooms.length === 0 ? "Add rooms in the Rooms module first." : "No rooms match these filters."}
            />
          ) : (
            <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
              {filtered.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  housekeeper={room.assignedHousekeeperId ? hkById.get(room.assignedHousekeeperId) : undefined}
                  selectMode={selectMode}
                  selected={selected.has(room.id)}
                  hasIssue={issueRoomIds.has(room.id)}
                  onToggleSelect={() => toggleRoom(room.id)}
                  onClick={() => setDetailRoom(room)}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Right sidebar */}
        <div className="space-y-3">
          <AssignedPanel
            onOpenReports={() => setShowReports(true)}
            canPrint={canPrint}
            reportCount={pendingReports}
          />
        </div>
      </div>

      {/* Sticky selection bar */}
      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-border bg-card px-2 py-1.5 shadow-elegant">
          <div className="flex items-center gap-2">
            <span className="ml-2 text-xs font-semibold">
              {selected.size} room{selected.size > 1 ? "s" : ""} selected
            </span>
            <Button size="sm" className="h-8 gap-1" onClick={() => setShowAssign(true)} disabled={!canAssign}>
              <Zap className="h-3.5 w-3.5" /> Express Assign
            </Button>
            <Button
              variant="outline" size="sm" className="h-8 gap-1"
              onClick={() => {
                selectedArray.forEach((id) => setDND(id, true));
                toast.success("Marked DND");
              }}
            >
              <BanIcon className="h-3.5 w-3.5" /> DND
            </Button>
            <Button
              variant="outline" size="sm" className="h-8"
              onClick={() => {
                unassign(selectedArray);
                toast.success("Unassigned");
                setSelected(new Set());
              }}
            >
              Unassign
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSelected(new Set())}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <ExpressAssignDialog
        open={showAssign}
        onClose={() => setShowAssign(false)}
        selectedRoomIds={selectedArray}
        onDone={() => { setSelected(new Set()); setSelectMode(false); }}
      />
      <ManageHousekeepersDialog open={showManage} onClose={() => setShowManage(false)} />
      <HousekeepingTeamsDialog open={showTeams} onClose={() => setShowTeams(false)} />
      <RoomDetailDialog room={detailRoom} open={!!detailRoom} onClose={() => setDetailRoom(null)} />
      {canReview && (
        <HousekeeperReportsDialog open={showReports} onClose={() => setShowReports(false)} />
      )}
    </AppLayout>
  );
}

function Pill({ label, n, color }: { label: string; n: number; color: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 font-medium uppercase", color)}>
      {label} <span className="opacity-70">({n})</span>
    </span>
  );
}
