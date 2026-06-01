// Detail view for a single room: status, assignment, notes, and quick actions.
import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHotelStore, type HousekeepingStatus, type Room } from "@/store/hotel-store";
import { Wrench, BanIcon, AlertOctagon, UserMinus, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/integrations/storage/hotel-storage";
import { StoragePhoto } from "@/components/system/StoragePhoto";

const ALL: HousekeepingStatus[] = ["dirty", "clean", "inspected", "out-of-order", "departure", "stayover"];

export function RoomDetailDialog({
  room,
  open,
  onClose,
}: {
  room: Room | null;
  open: boolean;
  onClose: () => void;
}) {
  const updateHk = useHotelStore((s) => s.updateRoomHousekeeping);
  const setDND = useHotelStore((s) => s.setRoomDND);
  const setRefused = useHotelStore((s) => s.setRoomRefused);
  const unassign = useHotelStore((s) => s.unassignRooms);
  const housekeepers = useHotelStore((s) => s.housekeepers);
  const addMaintenance = useHotelStore((s) => s.addMaintenanceTicket);
  const setState = useHotelStore.setState;

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!room) return null;
  const assignee = housekeepers.find((h) => h.id === room.assignedHousekeeperId);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !room) return;
    setUploading(true);
    try {
      const paths: string[] = [];
      for (const f of files) {
        const res = await uploadFile("housekeeping-photos", f, `${room.id}/${Date.now()}-${f.name}`);
        if (res.ok) paths.push(res.path);
      }
      setState((s) => ({
        rooms: s.rooms.map((r) =>
          r.id === room.id
            ? { ...r, housekeepingPhotos: [...(r.housekeepingPhotos ?? []), ...paths] }
            : r,
        ),
      }));
      toast.success(`${paths.length} photo(s) uploaded`);
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Room {room.number} — {room.type}</DialogTitle>
        </DialogHeader>


        <div className="space-y-3 text-xs">
          <Row k="Floor" v={String(room.floor)} />
          <Row k="Bed code" v={room.bedCode || room.typeCode} />
          {room.zone && <Row k="Zone" v={room.zone} />}
          {room.building && <Row k="Building" v={room.building} />}
          <Row k="Reservation status" v={room.status} />
          {assignee && <Row k="Assigned to" v={assignee.name} />}
          {room.assignedAt && <Row k="Assigned at" v={new Date(room.assignedAt).toLocaleString()} />}
          {room.taskType && <Row k="Task type" v={room.taskType} />}
          {room.cleaningStartedAt && <Row k="Started" v={new Date(room.cleaningStartedAt).toLocaleString()} />}
          {room.cleaningFinishedAt && <Row k="Finished" v={new Date(room.cleaningFinishedAt).toLocaleString()} />}
          {room.housekeepingNotes && (
            <div className="rounded border border-border bg-muted/30 p-2">
              <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Notes</p>
              <p>{room.housekeepingNotes}</p>
            </div>
          )}
          {room.housekeepingPhotos && room.housekeepingPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5">
              {room.housekeepingPhotos.map((p, i) => (
                <StoragePhoto
                  key={i}
                  src={p}
                  bucket="housekeeping-photos"
                  alt={`Room ${room.number} photo ${i + 1}`}
                  className="aspect-square w-full rounded border object-cover"
                />
              ))}
            </div>
          )}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              {uploading ? "Uploading..." : "Add photo"}
            </Button>
          </div>
        </div>


        <div className="space-y-2 border-t border-border pt-3">
          <label className="text-[10px] font-semibold uppercase text-muted-foreground">Override status</label>
          <Select value={room.housekeepingStatus ?? "clean"} onValueChange={(v) => {
            updateHk(room.id, v as HousekeepingStatus);
            toast.success(`Room ${room.number} → ${v}`);
          }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("-", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
          <Button
            variant={room.dndFlag ? "default" : "outline"}
            size="sm"
            className="gap-1"
            onClick={() => setDND(room.id, !room.dndFlag)}
          >
            <BanIcon className="h-3 w-3" /> {room.dndFlag ? "Clear DND" : "Mark DND"}
          </Button>
          <Button
            variant={room.refusedService ? "default" : "outline"}
            size="sm"
            className="gap-1"
            onClick={() => setRefused(room.id, !room.refusedService)}
          >
            <AlertOctagon className="h-3 w-3" /> {room.refusedService ? "Clear refusal" : "Mark refused"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => {
              const desc = prompt("Describe the issue:");
              if (!desc) return;
              const takeOOO = confirm("Take this room Out of Order until fixed?");
              addMaintenance({
                roomId: room.id,
                area: `Room ${room.number}`,
                description: desc,
                priority: "medium",
              });
              if (takeOOO) {
                updateHk(room.id, "out-of-order");
              }
              toast.success(takeOOO ? "Maintenance ticket created — room OOO" : "Maintenance ticket created");
            }}
          >
            <Wrench className="h-3 w-3" /> Report Issue
          </Button>
          {assignee && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => {
              unassign([room.id]);
              toast.success("Unassigned");
            }}>
              <UserMinus className="h-3 w-3" /> Unassign
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-1">
      <dt className="capitalize text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
