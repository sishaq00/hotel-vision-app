import { useState } from "react";
import { Plus, Layers } from "lucide-react";
import { useHotelStore } from "@/store/hotel-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// Auto-generate a short code from a room type name (e.g. "Royal Suite" -> "RS")
function autoCode(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return parts
    .slice(0, 3)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function NewRoomDialog() {
  const [open, setOpen] = useState(false);
  const addRoom = useHotelStore((s) => s.addRoom);

  // ---- Single room form ----
  const [number, setNumber] = useState("");
  const [type, setType] = useState("");
  const [typeCode, setTypeCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [floor, setFloor] = useState(1);
  const [price, setPrice] = useState(100);

  // ---- Bulk form ----
  const [bulkType, setBulkType] = useState("");
  const [bulkCode, setBulkCode] = useState("");
  const [bulkCodeTouched, setBulkCodeTouched] = useState(false);
  const [bulkFloor, setBulkFloor] = useState(1);
  const [bulkPrice, setBulkPrice] = useState(100);
  const [rangeFrom, setRangeFrom] = useState(101);
  const [rangeTo, setRangeTo] = useState(120);
  const [prefix, setPrefix] = useState("");

  const resetSingle = () => {
    setNumber("");
    setType("");
    setTypeCode("");
    setCodeTouched(false);
    setFloor(1);
    setPrice(100);
  };
  const resetBulk = () => {
    setBulkType("");
    setBulkCode("");
    setBulkCodeTouched(false);
    setBulkFloor(1);
    setBulkPrice(100);
    setRangeFrom(101);
    setRangeTo(120);
    setPrefix("");
  };

  const submitSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim()) return toast.error("Room number is required");
    if (!type.trim()) return toast.error("Room type is required");
    const code = (typeCode.trim() || autoCode(type)).toUpperCase();
    addRoom({ number: number.trim(), type: type.trim(), typeCode: code, floor, price, status: "available" });
    toast.success(`Room ${number} added`, { description: `${type} · ${code}` });
    resetSingle();
    setOpen(false);
  };

  const submitBulk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkType.trim()) return toast.error("Room type is required");
    if (rangeTo < rangeFrom) return toast.error("Invalid range");
    const count = rangeTo - rangeFrom + 1;
    if (count > 500) return toast.error("Max 500 rooms at once");
    const code = (bulkCode.trim() || autoCode(bulkType)).toUpperCase();
    for (let n = rangeFrom; n <= rangeTo; n++) {
      addRoom({
        number: `${prefix}${n}`,
        type: bulkType.trim(),
        typeCode: code,
        floor: bulkFloor,
        price: bulkPrice,
        status: "available",
      });
    }
    toast.success(`${count} rooms created`, { description: `${bulkType} · ${code}` });
    resetBulk();
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Setup rooms</DialogTitle>
          <DialogDescription>
            Add a single room or create a whole floor at once. Room types are fully custom — name them after your hotel layout.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="gap-2">
              <Plus className="h-4 w-4" /> Single
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2">
              <Layers className="h-4 w-4" /> Bulk
            </TabsTrigger>
          </TabsList>

          {/* ---------- SINGLE ---------- */}
          <TabsContent value="single" className="mt-4">
            <form onSubmit={submitSingle} className="space-y-4">
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
                    min={0}
                    value={floor}
                    onChange={(e) => setFloor(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="type">Room type</Label>
                  <Input
                    id="type"
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value);
                      if (!codeTouched) setTypeCode(autoCode(e.target.value));
                    }}
                    placeholder="e.g. Royal Suite"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="typeCode">Type code</Label>
                  <Input
                    id="typeCode"
                    value={typeCode}
                    maxLength={6}
                    onChange={(e) => {
                      setCodeTouched(true);
                      setTypeCode(e.target.value.toUpperCase());
                    }}
                    placeholder="RS"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="price">Price / night (USD)</Label>
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
          </TabsContent>

          {/* ---------- BULK ---------- */}
          <TabsContent value="bulk" className="mt-4">
            <form onSubmit={submitBulk} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bulkType">Room type</Label>
                  <Input
                    id="bulkType"
                    value={bulkType}
                    onChange={(e) => {
                      setBulkType(e.target.value);
                      if (!bulkCodeTouched) setBulkCode(autoCode(e.target.value));
                    }}
                    placeholder="e.g. Standard Double"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bulkCode">Type code</Label>
                  <Input
                    id="bulkCode"
                    value={bulkCode}
                    maxLength={6}
                    onChange={(e) => {
                      setBulkCodeTouched(true);
                      setBulkCode(e.target.value.toUpperCase());
                    }}
                    placeholder="STD"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prefix">Number prefix</Label>
                  <Input
                    id="prefix"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="(optional, e.g. A)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bulkFloor">Floor</Label>
                  <Input
                    id="bulkFloor"
                    type="number"
                    min={0}
                    value={bulkFloor}
                    onChange={(e) => setBulkFloor(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rangeFrom">From #</Label>
                  <Input
                    id="rangeFrom"
                    type="number"
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rangeTo">To #</Label>
                  <Input
                    id="rangeTo"
                    type="number"
                    value={rangeTo}
                    onChange={(e) => setRangeTo(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="bulkPrice">Price / night (USD)</Label>
                  <Input
                    id="bulkPrice"
                    type="number"
                    min={0}
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                Will create{" "}
                <span className="font-semibold text-foreground">
                  {Math.max(0, rangeTo - rangeFrom + 1)}
                </span>{" "}
                rooms numbered{" "}
                <span className="font-mono text-foreground">
                  {prefix}
                  {rangeFrom}
                </span>{" "}
                →{" "}
                <span className="font-mono text-foreground">
                  {prefix}
                  {rangeTo}
                </span>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create rooms</Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
