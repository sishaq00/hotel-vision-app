import { useState } from "react";
import { Plus } from "lucide-react";
import type { RoomType } from "@/store/hotel-store";
import { useHotelStore } from "@/store/hotel-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function NewRoomDialog() {
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("");
  const [type, setType] = useState<RoomType>("Single");
  const [floor, setFloor] = useState(1);
  const [price, setPrice] = useState(100);

  const addRoom = useHotelStore((s) => s.addRoom);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim()) {
      toast.error("Room number is required");
      return;
    }
    addRoom({ number, type, floor, price, status: "available" });
    toast.success(`Room ${number} added`);
    setNumber("");
    setType("Single");
    setFloor(1);
    setPrice(100);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-md">
          <Plus className="h-4 w-4" />
          Add Room
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add new room</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="number">Room number</Label>
              <Input
                id="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="101"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="floor">Floor</Label>
              <Input
                id="floor"
                type="number"
                min={1}
                value={floor}
                onChange={(e) => setFloor(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as RoomType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Double">Double</SelectItem>
                  <SelectItem value="Suite">Suite</SelectItem>
                  <SelectItem value="Deluxe">Deluxe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price / night</Label>
              <Input
                id="price"
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add room</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
