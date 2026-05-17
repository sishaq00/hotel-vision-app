import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BedDouble, MoreVertical, Archive, Plus, Search,
  LayoutGrid, List, Sparkles, Wrench, CheckCircle2,
  Clock, XCircle, Wifi, Wind, Eye,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { NewRoomDialog } from "@/components/rooms/NewRoomDialog";
import { ExportButtons } from "@/components/system/ExportButtons";
import { useConfirm } from "@/components/system/ConfirmDialog";
import { useHotelStore, type Room, type RoomStatus } from "@/store/hotel-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rooms")({
  head: () => ({
    meta: [
      { title: "Rooms — NEXORA OS" },
      { name: "description", content: "Manage room inventory and statuses." },
    ],
  }),
  component: RoomsPage,
});

// ─── Status config ────────────────────────────────────────────────────────────

type HKStatus = "clean" | "dirty" | "inspected" | "departure" | "out-of-order" | "do-not-disturb" | undefined;

const ROOM_STATUS_CFG: Record<RoomStatus, { label: string; icon: typeof CheckCircle2; bar: string; badge: string }> = {
  available:   { label: "Available",   icon: CheckCircle2, bar: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" },
  occupied:    { label: "Occupied",    icon: BedDouble,    bar: "bg-blue-500",    badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400" },
  cleaning:    { label: "Cleaning",    icon: Sparkles,     bar: "bg-amber-500",   badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400" },
  maintenance: { label: "Maintenance", icon: Wrench,       bar: "bg-rose-500",    badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400" },
};

const HK_CFG: Record<string, { label: string; cls: string }> = {
  clean:           { label: "Clean",      cls: "text-emerald-600" },
  inspected:       { label: "Inspected",  cls: "text-emerald-700 font-semibold" },
  dirty:           { label: "Dirty",      cls: "text-amber-600" },
  departure:       { label: "Departure",  cls: "text-orange-600" },
  "out-of-order":  { label: "OOO",        cls: "text-rose-600" },
  "do-not-disturb":{ label: "DND",        cls: "text-purple-600" },
};

function RoomStatusBadge({ status }: { status: RoomStatus }) {
  const cfg = ROOM_STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium", cfg.badge)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ─── KPI tiles ────────────────────────────────────────────────────────────────

function KpiBar({ rooms }: { rooms: Room[] }) {
  const counts = useMemo(() => {
    const c: Record<RoomStatus, number> = { available: 0, occupied: 0, cleaning: 0, maintenance: 0 };
    for (const r of rooms) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rooms]);

  const total = rooms.length;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {(Object.entries(ROOM_STATUS_CFG) as [RoomStatus, typeof ROOM_STATUS_CFG[RoomStatus]][]).map(([status, cfg]) => {
        const Icon = cfg.icon;
        const pct = total > 0 ? Math.round((counts[status] / total) * 100) : 0;
        return (
          <div key={status} className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm">
            <div className={cn("absolute left-0 top-0 h-full w-1 rounded-l-xl", cfg.bar)} />
            <div className="pl-2">
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{pct}%</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-foreground">{counts[status]}</p>
              <p className="text-xs text-muted-foreground">{cfg.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Room card (grid view) ────────────────────────────────────────────────────

function RoomCard({ room, onStatusChange, onArchive }: {
  room: Room;
  onStatusChange: (id: string, s: RoomStatus) => void;
  onArchive: (room: Room) => void;
}) {
  const cfg = ROOM_STATUS_CFG[room.status];
  const hk  = room.housekeepingStatus ? HK_CFG[room.housekeepingStatus] : null;

  return (
    <div className={cn(
      "group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5",
    )}>
      {/* Top accent bar */}
      <div className={cn("h-1 w-full", cfg.bar)} />

      <div className="flex flex-1 flex-col p-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-bold leading-tight text-foreground">
              Room {room.number}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{room.type}</span>
              {room.typeCode && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                  {room.typeCode}
                </span>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {(Object.keys(ROOM_STATUS_CFG) as RoomStatus[]).map((s) => (
                <DropdownMenuItem key={s} disabled={room.status === s}
                  onClick={() => onStatusChange(room.id, s)} className="text-xs capitalize">
                  Set {ROOM_STATUS_CFG[s].label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs text-destructive focus:text-destructive"
                onClick={() => onArchive(room)}>
                <Archive className="mr-2 h-3.5 w-3.5" /> Archive room
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta info */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span>Floor {room.floor ?? "—"}</span>
          {room.bedCode && <span>{room.bedCode}</span>}
          {room.smokingAllowed && <span className="text-amber-600">Smoking</span>}
          {room.accessible && <span className="text-blue-600">Accessible</span>}
        </div>

        {/* Features icons */}
        <div className="mt-2 flex gap-2">
          {room.smokingAllowed === false && <Wind className="h-3.5 w-3.5 text-muted-foreground/50" title="Non-smoking" />}
          {room.accessible && <Eye className="h-3.5 w-3.5 text-blue-500/70" title="Accessible" />}
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-3">
          <RoomStatusBadge status={room.status} />
          <div className="text-right">
            <p className="text-base font-bold text-foreground">
              ${room.price}
              <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">/night</span>
            </p>
            {hk && (
              <p className={cn("text-[10px]", hk.cls)}>{hk.label}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Room row (list view) ─────────────────────────────────────────────────────

function RoomRow({ room, onStatusChange, onArchive }: {
  room: Room;
  onStatusChange: (id: string, s: RoomStatus) => void;
  onArchive: (room: Room) => void;
}) {
  const hk = room.housekeepingStatus ? HK_CFG[room.housekeepingStatus] : null;

  return (
    <tr className="group border-b border-border/40 transition-colors hover:bg-muted/30">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white", ROOM_STATUS_CFG[room.status].bar)}>
            {room.number}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Room {room.number}</p>
            <p className="text-[11px] text-muted-foreground">Floor {room.floor ?? "—"}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="text-sm text-foreground">{room.type}</p>
          {room.typeCode && <p className="font-mono text-[10px] text-muted-foreground">{room.typeCode}</p>}
        </div>
      </td>
      <td className="px-4 py-3"><RoomStatusBadge status={room.status} /></td>
      <td className="px-4 py-3">
        {hk ? <span className={cn("text-xs", hk.cls)}>{hk.label}</span> : <span className="text-xs text-muted-foreground">—</span>}
      </td>
      <td className="px-4 py-3 text-right">
        <p className="text-sm font-semibold text-foreground">${room.price}</p>
        <p className="text-[10px] text-muted-foreground">per night</p>
      </td>
      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {(Object.keys(ROOM_STATUS_CFG) as RoomStatus[]).map((s) => (
              <DropdownMenuItem key={s} disabled={room.status === s}
                onClick={() => onStatusChange(room.id, s)} className="text-xs capitalize">
                Set {ROOM_STATUS_CFG[s].label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-destructive focus:text-destructive"
              onClick={() => onArchive(room)}>
              <Archive className="mr-2 h-3.5 w-3.5" /> Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const FILTER_TABS: { label: string; value: RoomStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Available", value: "available" },
  { label: "Occupied", value: "occupied" },
  { label: "Cleaning", value: "cleaning" },
  { label: "Maintenance", value: "maintenance" },
];

function RoomsPage() {
  const allRooms    = useHotelStore((s) => s.rooms);
  const updateStatus = useHotelStore((s) => s.updateRoomStatus);
  const archiveRoom = useHotelStore((s) => s.archiveRoom);
  const confirm     = useConfirm();

  const [query,  setQuery]  = useState("");
  const [filter, setFilter] = useState<RoomStatus | "all">("all");
  const [view,   setView]   = useState<"grid" | "list">("grid");

  const rooms = useMemo(() => allRooms.filter((r) => !r.archived), [allRooms]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rooms.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.number.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        (r.typeCode ?? "").toLowerCase().includes(q) ||
        String(r.floor ?? "").includes(q)
      );
    });
  }, [rooms, query, filter]);

  // Group by floor
  const grouped = useMemo(() => {
    const map = new Map<number, Room[]>();
    for (const r of filtered) {
      const f = r.floor ?? 0;
      if (!map.has(f)) map.set(f, []);
      map.get(f)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  const handleStatusChange = (id: string, s: RoomStatus) => {
    updateStatus(id, s);
    const r = rooms.find((x) => x.id === id);
    toast.success(`Room ${r?.number} → ${ROOM_STATUS_CFG[s].label}`);
  };

  const handleArchive = async (room: Room) => {
    const ok = await confirm({
      title: "Archive room?",
      description: `Archive room ${room.number}? It will no longer be bookable.`,
      confirmLabel: "Archive",
      destructive: true,
    });
    if (!ok) return;
    const result = archiveRoom(room.id);
    if (result.ok) toast.success(`Room ${room.number} archived`);
    else toast.error("Cannot archive room", { description: result.error });
  };

  const exportRows = rooms.map((r) => ({
    Number: r.number, Type: r.type, Code: r.typeCode, Floor: r.floor,
    Price: r.price, Status: r.status, Housekeeping: r.housekeepingStatus ?? "",
    Smoking: r.smokingAllowed ? "Yes" : "", Accessible: r.accessible ? "Yes" : "",
  }));

  return (
    <AppLayout title="Rooms" subtitle={`${rooms.length} rooms in inventory`}>
      <div className="space-y-5">

        {/* KPI bar */}
        <KpiBar rooms={rooms} />

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter tabs */}
          <div className="flex items-center rounded-lg border border-border/60 bg-card p-1 shadow-sm">
            {FILTER_TABS.map((tab) => {
              const count = tab.value === "all"
                ? rooms.length
                : rooms.filter((r) => r.status === tab.value).length;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFilter(tab.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                    filter === tab.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px]",
                    filter === tab.value
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Room number, type, floor…" value={query}
              onChange={(e) => setQuery(e.target.value)} className="pl-9 h-9" />
          </div>

          {/* View toggle + export + add */}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border/60 bg-card p-1">
              <button type="button" onClick={() => setView("grid")}
                className={cn("rounded-md p-1.5 transition-colors", view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setView("list")}
                className={cn("rounded-md p-1.5 transition-colors", view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                <List className="h-4 w-4" />
              </button>
            </div>
            <ExportButtons rows={exportRows} filename="rooms" />
            <NewRoomDialog />
          </div>
        </div>

        {/* Content */}
        {filtered.length === 0 ? (
          <EmptyState icon={BedDouble}
            title={query || filter !== "all" ? "No matching rooms" : "No rooms yet"}
            description={query || filter !== "all" ? "Try adjusting the filter." : "Add your first room to get started."}
            action={!query && filter === "all" ? <NewRoomDialog /> : undefined}
          />
        ) : view === "grid" ? (
          <div className="space-y-6">
            {grouped.map(([floor, list]) => (
              <div key={floor}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Floor {floor} — {list.length} room{list.length !== 1 ? "s" : ""}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {list.map((r) => (
                    <RoomCard key={r.id} room={r} onStatusChange={handleStatusChange} onArchive={handleArchive} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  {["Room", "Type", "Status", "Housekeeping", "Rate", ""].map((h) => (
                    <th key={h} className={cn(
                      "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                      h === "Rate" || h === "" ? "text-right" : "text-left",
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map(([floor, list]) => (
                  <>
                    <tr key={`floor-${floor}`} className="bg-muted/20">
                      <td colSpan={6} className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Floor {floor}
                      </td>
                    </tr>
                    {list.map((r) => (
                      <RoomRow key={r.id} room={r} onStatusChange={handleStatusChange} onArchive={handleArchive} />
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
