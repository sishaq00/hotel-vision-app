import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Boxes, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHotelStore } from "@/store/hotel-store";
import { toast } from "sonner";

export const Route = createFileRoute("/batch-process")({
  head: () => ({
    meta: [
      { title: "Batch Process — NEXORA OS" },
      { name: "description", content: "Bulk operations on rooms and reservations." },
    ],
  }),
  component: BatchProcessPage,
});

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function BatchProcessPage() {
  const reservations = useHotelStore((s) => s.reservations);
  const rooms = useHotelStore((s) => s.rooms.filter((r) => !r.archived));
  const markNoShow = useHotelStore((s) => s.markNoShow);
  const setRoomTypePrice = useHotelStore((s) => s.setRoomTypePrice);
  const updateHousekeeping = useHotelStore((s) => s.updateRoomHousekeeping);

  const today = todayIso();

  const noShowCandidates = useMemo(
    () =>
      reservations.filter(
        (r) => r.status === "confirmed" && r.checkIn < today && !r.noShow,
      ),
    [reservations, today],
  );

  const roomTypes = useMemo(() => {
    const types = new Set(rooms.map((r) => r.type));
    return Array.from(types);
  }, [rooms]);

  const [type, setType] = useState<string>("");
  const [newPrice, setNewPrice] = useState("100");

  const handleNoShow = () => {
    if (noShowCandidates.length === 0) {
      toast("Nothing to process");
      return;
    }
    noShowCandidates.forEach((r) => markNoShow(r.id));
    toast.success(`${noShowCandidates.length} marked as No-Show`);
  };

  const handlePrice = () => {
    if (!type) {
      toast.error("Choose a room type");
      return;
    }
    const p = parseFloat(newPrice);
    if (!(p > 0)) {
      toast.error("Enter a valid price");
      return;
    }
    const count = setRoomTypePrice(type, p);
    toast.success(`Updated ${count} room${count === 1 ? "" : "s"} of type ${type}`);
  };

  const handleMarkAllDirty = () => {
    let n = 0;
    rooms.forEach((r) => {
      if ((r.housekeepingStatus ?? "clean") !== "dirty") {
        updateHousekeeping(r.id, "dirty");
        n++;
      }
    });
    toast.success(`Marked ${n} room${n === 1 ? "" : "s"} as dirty`);
  };

  return (
    <AppLayout
      title="Batch Process"
      subtitle="Bulk operations on rooms, prices and reservations"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/60 p-5 shadow-card">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-warning/15 text-warning-foreground">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Cancel overdue No-Shows
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Marks all confirmed reservations whose check-in date is in the
                past as No-Show and cancels them.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 text-xs">
            <span className="font-semibold text-foreground">
              {noShowCandidates.length}
            </span>{" "}
            <span className="text-muted-foreground">candidate(s) to process</span>
          </div>
          <Button
            className="mt-4 w-full"
            variant={noShowCandidates.length === 0 ? "outline" : "default"}
            onClick={handleNoShow}
          >
            Run No-Show batch
          </Button>
        </Card>

        <Card className="border-border/60 p-5 shadow-card">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-info/10 text-info">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Bulk price update
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Apply a new nightly price to every room of a given type.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Room type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>New price</Label>
              <Input
                type="number"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
              />
            </div>
          </div>
          <Button className="mt-4 w-full" onClick={handlePrice}>
            Apply price update
          </Button>
        </Card>

        <Card className="border-border/60 p-5 shadow-card md:col-span-2">
          <h3 className="text-sm font-semibold text-foreground">
            Housekeeping reset
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Mark every active room as <em>dirty</em> at the start of a new day.
            Useful after night audit.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={handleMarkAllDirty}
          >
            Mark all rooms as dirty
          </Button>
        </Card>
      </div>
    </AppLayout>
  );
}
