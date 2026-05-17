// Housekeeper's personal screen — see assigned rooms, start/finish, submit report.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useHotelStore, type Room } from "@/store/hotel-store";
import { useCurrentUser } from "@/store/auth-store";
import { Play, Check, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/dashboard/EmptyState";

export const Route = createFileRoute("/my-housekeeping")({
  head: () => ({ meta: [{ title: "My Rooms — Housekeeping" }] }),
  component: MyHousekeepingPage,
});

function MyHousekeepingPage() {
  const me = useCurrentUser();
  const housekeepers = useHotelStore((s) => s.housekeepers);
  const rooms = useHotelStore((s) => s.rooms);
  const start = useHotelStore((s) => s.startCleaning);
  const finish = useHotelStore((s) => s.finishCleaning);
  const submit = useHotelStore((s) => s.submitHousekeeperReport);

  const myHk = useMemo(
    () => housekeepers.find((h) => h.systemUserId === me?.id),
    [housekeepers, me],
  );

  const myRooms = useMemo(
    () => (myHk ? rooms.filter((r) => r.assignedHousekeeperId === myHk.id) : []),
    [rooms, myHk],
  );

  const [finishRoom, setFinishRoom] = useState<Room | null>(null);
  const [notes, setNotes] = useState("");

  if (!me) {
    return <AppLayout title="My Rooms"><p className="p-6 text-sm text-muted-foreground">Sign in first.</p></AppLayout>;
  }
  if (!myHk) {
    return (
      <AppLayout title="My Rooms" subtitle="No housekeeper profile linked to your account">
        <Card className="p-6">
          <EmptyState
            icon={Sparkles}
            title="Not registered as a housekeeper"
            description="Ask your manager to add you in Housekeeping → Manage Housekeepers."
          />
        </Card>
      </AppLayout>
    );
  }

  const done = myRooms.filter((r) => r.cleaningFinishedAt).length;
  const total = myRooms.length;
  const allDone = total > 0 && done === total;

  const handleSubmit = () => {
    const id = submit(myHk.id);
    if (id) toast.success("Report submitted to manager");
    else toast.error("No finished rooms to submit");
  };

  const handleFinish = () => {
    if (!finishRoom) return;
    finish(finishRoom.id, notes.trim() || undefined);
    toast.success(`Room ${finishRoom.number} marked done`);
    setFinishRoom(null); setNotes("");
  };

  return (
    <AppLayout
      title="My Rooms"
      subtitle={`${done}/${total} completed · ${myHk.name}`}
    >
      <Card className="border-border/60 p-4">
        {myRooms.length === 0 ? (
          <EmptyState icon={Sparkles} title="No assignments" description="Your manager hasn't assigned any rooms yet." />
        ) : (
          <ul className="divide-y divide-border">
            {myRooms.map((r) => {
              const inProgress = r.cleaningStartedAt && !r.cleaningFinishedAt;
              const finished = !!r.cleaningFinishedAt;
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold">Room {r.number}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {r.taskType?.replace("-", " ") ?? "task"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Floor {r.floor} · {r.bedCode || r.typeCode}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {finished ? (
                      <span className="inline-flex items-center gap-1 rounded bg-success/15 px-2 py-1 text-xs font-medium text-success">
                        <Check className="h-3.5 w-3.5" /> Done
                      </span>
                    ) : inProgress ? (
                      <Button size="sm" className="gap-1" onClick={() => setFinishRoom(r)}>
                        <Check className="h-3.5 w-3.5" /> Finish
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => start(r.id)}>
                        <Play className="h-3.5 w-3.5" /> Start
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {total > 0 && (
          <div className="mt-4 flex justify-end border-t border-border pt-4">
            <Button onClick={handleSubmit} disabled={done === 0} className={cn("gap-1", allDone && "animate-pulse")}>
              <Send className="h-4 w-4" /> Submit Report ({done})
            </Button>
          </div>
        )}
      </Card>

      <Dialog open={!!finishRoom} onOpenChange={(v) => !v && setFinishRoom(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Finish Room {finishRoom?.number}</DialogTitle></DialogHeader>
          <Textarea
            placeholder="Notes for the manager (optional) — e.g. broken lamp, missing towel…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFinishRoom(null); setNotes(""); }}>Cancel</Button>
            <Button onClick={handleFinish}>Mark Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
