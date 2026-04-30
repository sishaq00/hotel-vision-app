// Manage Housekeeping Teams.
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHotelStore } from "@/store/hotel-store";
import { Trash2, Plus, Users } from "lucide-react";
import { toast } from "sonner";

export function HousekeepingTeamsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const teams = useHotelStore((s) => s.housekeepingTeams);
  const housekeepers = useHotelStore((s) => s.housekeepers.filter((h) => h.active));
  const addTeam = useHotelStore((s) => s.addHousekeepingTeam);
  const updateTeam = useHotelStore((s) => s.updateHousekeepingTeam);
  const deleteTeam = useHotelStore((s) => s.deleteHousekeepingTeam);

  const [name, setName] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const toggleMember = (id: string) => {
    setMemberIds((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  };

  const handleAdd = () => {
    if (!name.trim()) return toast.error("Team name required");
    if (memberIds.length === 0) return toast.error("Pick at least one member");
    addTeam({ name: name.trim(), leaderId: leaderId || undefined, memberIds });
    setName(""); setLeaderId(""); setMemberIds([]);
    toast.success("Team created");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Housekeeping Teams</DialogTitle>
        </DialogHeader>

        <div className="rounded border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">New team</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
            <Select value={leaderId} onValueChange={setLeaderId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Leader (optional)" /></SelectTrigger>
              <SelectContent>
                {housekeepers.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-2">
            <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">Members</p>
            <div className="flex flex-wrap gap-1.5">
              {housekeepers.map((h) => (
                <button
                  key={h.id}
                  onClick={() => toggleMember(h.id)}
                  className={`rounded border px-2 py-1 text-xs ${
                    memberIds.includes(h.id)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {h.name}
                </button>
              ))}
              {housekeepers.length === 0 && (
                <span className="text-xs text-muted-foreground">No active housekeepers.</span>
              )}
            </div>
          </div>
          <Button onClick={handleAdd} size="sm" className="mt-2 gap-1">
            <Plus className="h-3 w-3" /> Create team
          </Button>
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {teams.length === 0 && (
            <p className="p-4 text-center text-xs text-muted-foreground">No teams yet.</p>
          )}
          {teams.map((t) => {
            const leader = housekeepers.find((h) => h.id === t.leaderId);
            return (
              <div key={t.id} className="rounded border border-border p-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t.memberIds.length} member(s) {leader && `· Leader: ${leader.name}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                    if (confirm(`Delete team "${t.name}"?`)) deleteTeam(t.id);
                  }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {t.memberIds.map((mid) => {
                    const m = housekeepers.find((h) => h.id === mid);
                    return (
                      <button
                        key={mid}
                        onClick={() => updateTeam(t.id, { memberIds: t.memberIds.filter((x) => x !== mid) })}
                        className="rounded bg-muted px-2 py-0.5 text-[10px] hover:bg-destructive/20"
                        title="Click to remove"
                      >
                        {m?.name ?? "—"} ×
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
