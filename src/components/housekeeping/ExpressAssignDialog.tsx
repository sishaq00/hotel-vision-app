// Express Assign — pick a housekeeper or team for the currently-selected rooms.
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHotelStore, type HousekeepingTaskType } from "@/store/hotel-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TASK_TYPES: HousekeepingTaskType[] = ["departure", "stayover", "touch-up", "deep-clean", "inspection"];

export function ExpressAssignDialog({
  open,
  onClose,
  selectedRoomIds,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  selectedRoomIds: string[];
  onDone: () => void;
}) {
  const housekeepers = useHotelStore((s) => s.housekeepers.filter((h) => h.active));
  const teams = useHotelStore((s) => s.housekeepingTeams);
  const assignToHk = useHotelStore((s) => s.assignRoomsToHousekeeper);
  const assignToTeam = useHotelStore((s) => s.assignRoomsToTeam);

  const [tab, setTab] = useState<"individual" | "team">("individual");
  const [hkId, setHkId] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const [taskType, setTaskType] = useState<HousekeepingTaskType | "auto">("auto");

  const teamPreview = useMemo(() => {
    if (!teamId) return null;
    const team = teams.find((t) => t.id === teamId);
    if (!team) return null;
    const members = team.memberIds
      .map((id) => housekeepers.find((h) => h.id === id))
      .filter(Boolean);
    return { team, members };
  }, [teamId, teams, housekeepers]);

  const handleConfirm = () => {
    const tt = taskType === "auto" ? undefined : taskType;
    if (tab === "individual") {
      if (!hkId) return toast.error("Select a housekeeper");
      const n = assignToHk(selectedRoomIds, hkId, tt);
      toast.success(`Assigned ${n} room(s)`);
    } else {
      if (!teamId) return toast.error("Select a team");
      const n = assignToTeam(selectedRoomIds, teamId, tt);
      toast.success(`Distributed ${n} room(s) across team`);
    }
    onDone();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Express Assign — {selectedRoomIds.length} room(s)</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "individual" | "team")}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="individual">Individual</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="space-y-3 pt-3">
            <label className="text-xs font-medium">Housekeeper</label>
            {housekeepers.length === 0 ? (
              <p className="rounded border border-warning/40 bg-warning/10 p-2 text-xs text-warning-foreground">
                No active housekeepers. Add one in Manage Staff.
              </p>
            ) : (
              <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto">
                {housekeepers.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setHkId(h.id)}
                    className={cn(
                      "flex items-center gap-2 rounded border px-2 py-1.5 text-left text-xs",
                      hkId === h.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                      {h.initials || h.name[0]}
                    </span>
                    <span className="truncate">{h.name}</span>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="team" className="space-y-3 pt-3">
            <label className="text-xs font-medium">Team (round-robin)</label>
            {teams.length === 0 ? (
              <p className="rounded border border-warning/40 bg-warning/10 p-2 text-xs text-warning-foreground">
                No teams configured. Create one in Manage Staff.
              </p>
            ) : (
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.memberIds.length} members)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {teamPreview && teamPreview.members.length > 0 && (
              <div className="rounded border border-border bg-muted/30 p-2 text-xs">
                <p className="mb-1 font-medium">Will distribute across:</p>
                <div className="flex flex-wrap gap-1">
                  {teamPreview.members.map((m) => (
                    <span key={m!.id} className="rounded bg-background px-2 py-0.5">
                      {m!.name}
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 text-muted-foreground">
                  ≈ {Math.ceil(selectedRoomIds.length / teamPreview.members.length)} rooms each
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="space-y-1.5">
          <label className="text-xs font-medium">Task type</label>
          <Select value={taskType} onValueChange={(v) => setTaskType(v as HousekeepingTaskType | "auto")}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (infer from status)</SelectItem>
              {TASK_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">{t.replace("-", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
