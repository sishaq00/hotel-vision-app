import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BedDouble, MoreVertical, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { NewRoomDialog } from "@/components/rooms/NewRoomDialog";
import { Input } from "@/components/ui/input";
import { useHotelStore, type RoomStatus } from "@/store/hotel-store";
import { toast } from "sonner";
import { Search } from "lucide-react";

export const Route = createFileRoute("/rooms")({
  head: () => ({
    meta: [
      { title: "Rooms — NEXORA OS" },
      { name: "description", content: "Manage room inventory and statuses." },
    ],
  }),
  component: RoomsPage,
});

const STATUSES: RoomStatus[] = ["available", "occupied", "cleaning", "maintenance"];

function RoomsPage() {
  const rooms = useHotelStore((s) => s.rooms);
  const updateStatus = useHotelStore((s) => s.updateRoomStatus);
  const deleteRoom = useHotelStore((s) => s.deleteRoom);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rooms.filter(
      (r) =>
        !q ||
        r.number.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q),
    );
  }, [rooms, query]);

  const counts = useMemo(() => {
    return STATUSES.reduce(
      (acc, s) => {
        acc[s] = rooms.filter((r) => r.status === s).length;
        return acc;
      },
      {} as Record<RoomStatus, number>,
    );
  }, [rooms]);

  return (
    <AppLayout title="Rooms" subtitle="Inventory and live status">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {STATUSES.map((s) => (
            <Card key={s} className="border-border/60 p-4 shadow-card">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {s}
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground">{counts[s] ?? 0}</p>
            </Card>
          ))}
        </div>

        <Card className="border-border/60 shadow-card">
          <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search rooms..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <NewRoomDialog />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={BedDouble}
              title={query ? "No matching rooms" : "No rooms yet"}
              description={
                query
                  ? "Try another search."
                  : "Add your first room to start managing inventory."
              }
              action={!query ? <NewRoomDialog /> : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((r) => (
                <Card
                  key={r.id}
                  className="group relative border-border/60 p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-2xl font-bold leading-tight text-foreground">
                        Room {r.number}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="truncate text-xs font-medium text-muted-foreground">
                          {r.type}
                        </span>
                        {r.typeCode && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-primary">
                            {r.typeCode}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Floor {r.floor}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {STATUSES.map((s) => (
                          <DropdownMenuItem
                            key={s}
                            disabled={r.status === s}
                            onClick={() => {
                              updateStatus(r.id, s);
                              toast.success(`Room ${r.number} → ${s}`);
                            }}
                            className="capitalize"
                          >
                            Set {s}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            deleteRoom(r.id);
                            toast("Room deleted");
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                    <StatusBadge status={r.status} />
                    <span className="text-base font-bold text-foreground">
                      ${r.price}
                      <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">
                        USD/night
                      </span>
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
