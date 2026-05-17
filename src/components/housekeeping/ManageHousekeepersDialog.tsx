// Manage external housekeepers + link to system users.
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHotelStore } from "@/store/hotel-store";
import { useAuthStore } from "@/store/auth-store";
import { Trash2, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";

export function ManageHousekeepersDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const housekeepers = useHotelStore((s) => s.housekeepers);
  const addHk = useHotelStore((s) => s.addHousekeeper);
  const updateHk = useHotelStore((s) => s.updateHousekeeper);
  const deleteHk = useHotelStore((s) => s.deleteHousekeeper);
  const users = useAuthStore((s) => s.users);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [capacity, setCapacity] = useState(15);
  const [source, setSource] = useState<"external" | "system-user">("external");
  const [systemUserId, setSystemUserId] = useState("");
  const [hourlyRate, setHourlyRate] = useState<number | "">("");

  const handleAdd = () => {
    if (source === "system-user") {
      if (!systemUserId) return toast.error("Pick a system user");
      const u = users.find((x) => x.id === systemUserId);
      if (!u) return;
      if (housekeepers.some((h) => h.systemUserId === u.id))
        return toast.error("Already added");
      addHk({
        name: u.fullName || u.username,
        source: "system-user",
        systemUserId: u.id,
        active: true,
        capacity,
        hourlyRate: hourlyRate === "" ? undefined : hourlyRate,
      });
    } else {
      if (!name.trim()) return toast.error("Name required");
      addHk({
        name: name.trim(),
        phone: phone.trim() || undefined,
        source: "external",
        active: true,
        capacity,
        hourlyRate: hourlyRate === "" ? undefined : hourlyRate,
      });
    }
    setName(""); setPhone(""); setSystemUserId(""); setHourlyRate("");
    toast.success("Housekeeper added");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Housekeepers</DialogTitle>
        </DialogHeader>

        {/* Add form */}
        <div className="rounded border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Add new</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Select value={source} onValueChange={(v) => setSource(v as "external" | "system-user")}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="external">External staff</SelectItem>
                <SelectItem value="system-user">From system user</SelectItem>
              </SelectContent>
            </Select>
            {source === "system-user" ? (
              <Select value={systemUserId} onValueChange={setSystemUserId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick user" /></SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => u.active)
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName || u.username}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <>
                <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
                <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 text-xs" />
              </>
            )}
            <Input
              type="number" min={1} placeholder="Capacity (rooms/day)"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value) || 1)}
              className="h-8 text-xs"
            />
            <Input
              type="number" min={0} step={0.5} placeholder="Hourly rate (optional)"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value === "" ? "" : Number(e.target.value))}
              className="h-8 text-xs"
            />
          </div>
          <Button onClick={handleAdd} size="sm" className="mt-2 gap-1">
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto rounded border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-left text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Source</th>
                <th className="p-2">Capacity</th>
                <th className="p-2">Rate</th>
                <th className="p-2">Active</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {housekeepers.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No housekeepers yet.</td></tr>
              )}
              {housekeepers.map((h) => (
                <tr key={h.id} className="border-t border-border">
                  <td className="p-2 font-medium">{h.name} {h.phone && <span className="text-muted-foreground">· {h.phone}</span>}</td>
                  <td className="p-2 text-muted-foreground">{h.source === "system-user" ? "System" : "External"}</td>
                  <td className="p-2">
                    <Input
                      type="number" min={1} value={h.capacity}
                      onChange={(e) => updateHk(h.id, { capacity: Number(e.target.value) || 1 })}
                      className="h-7 w-16 text-xs"
                    />
                  </td>
                  <td className="p-2">{h.hourlyRate != null ? `$${h.hourlyRate}` : "—"}</td>
                  <td className="p-2">
                    <Switch checked={h.active} onCheckedChange={(v) => updateHk(h.id, { active: v })} />
                  </td>
                  <td className="p-2 text-right">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                      if (confirm(`Remove ${h.name}?`)) deleteHk(h.id);
                    }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
