import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Clock, Play, Square } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useHotelStore } from "@/store/hotel-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/shift-management")({
  head: () => ({
    meta: [
      { title: "Shift Management — NEXORA OS" },
      { name: "description", content: "Front desk shifts and cash drawer." },
    ],
  }),
  component: ShiftManagementPage,
});

function ShiftManagementPage() {
  const shifts = useHotelStore((s) => s.shifts);
  const startShift = useHotelStore((s) => s.startShift);
  const endShift = useHotelStore((s) => s.endShift);

  const [openDialog, setOpenDialog] = useState<"start" | "end" | null>(null);
  const [target, setTarget] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...shifts].sort((a, b) => (b.startedAt > a.startedAt ? 1 : -1)),
    [shifts],
  );

  const openShifts = sorted.filter((s) => s.status === "open");

  return (
    <AppLayout
      title="Shift Management"
      subtitle={`${openShifts.length} open shift${openShifts.length === 1 ? "" : "s"}`}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 p-5 shadow-card lg:col-span-1">
          <h3 className="text-sm font-semibold text-foreground">Quick actions</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Open or close a front desk shift.
          </p>
          <Button className="mt-4 w-full" onClick={() => setOpenDialog("start")}>
            <Play className="h-4 w-4" /> Start new shift
          </Button>
          <div className="mt-6 space-y-2">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground">
              Currently open
            </h4>
            {openShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active shifts.</p>
            ) : (
              openShifts.map((s) => (
                <div
                  key={s.id}
                  className="rounded-md border border-border p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{s.userName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      since {new Date(s.startedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Opening cash: ${s.openingCash.toFixed(2)}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => {
                      setTarget(s.id);
                      setOpenDialog("end");
                    }}
                  >
                    <Square className="h-3.5 w-3.5" /> End shift
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="border-border/60 shadow-card lg:col-span-2">
          <div className="border-b border-border p-5">
            <h3 className="text-sm font-semibold text-foreground">Shift history</h3>
            <p className="text-xs text-muted-foreground">
              Last {Math.min(50, sorted.length)} shift{sorted.length === 1 ? "" : "s"}
            </p>
          </div>
          {sorted.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No shifts yet"
              description="Start your first shift to begin tracking."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="text-right">Open cash</TableHead>
                    <TableHead className="text-right">Close cash</TableHead>
                    <TableHead className="text-right">Diff</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.slice(0, 50).map((s) => {
                    const diff =
                      s.closingCash !== undefined
                        ? s.closingCash - s.openingCash
                        : null;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.userName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(s.startedAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {s.endedAt ? new Date(s.endedAt).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          ${s.openingCash.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.closingCash !== undefined
                            ? `$${s.closingCash.toFixed(2)}`
                            : "—"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right text-xs font-medium",
                            diff === null
                              ? "text-muted-foreground"
                              : diff < 0
                                ? "text-destructive"
                                : diff > 0
                                  ? "text-success"
                                  : "text-muted-foreground",
                          )}
                        >
                          {diff !== null ? `${diff >= 0 ? "+" : ""}$${diff.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium capitalize",
                              s.status === "open"
                                ? "bg-success/10 text-success border-success/20"
                                : "bg-muted text-muted-foreground border-border",
                            )}
                          >
                            {s.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <StartShiftDialog
        open={openDialog === "start"}
        onClose={() => setOpenDialog(null)}
        onSubmit={(name, cash) => {
          startShift(name, cash);
          toast.success(`Shift started for ${name}`);
          setOpenDialog(null);
        }}
      />
      <EndShiftDialog
        open={openDialog === "end"}
        onClose={() => {
          setOpenDialog(null);
          setTarget(null);
        }}
        onSubmit={(cash, notes) => {
          if (target) {
            endShift(target, cash, notes);
            toast.success("Shift closed");
          }
          setOpenDialog(null);
          setTarget(null);
        }}
      />
    </AppLayout>
  );
}

function StartShiftDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, cash: number) => void;
}) {
  const [name, setName] = useState("");
  const [cash, setCash] = useState("0");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Start shift</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Front desk user</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Opening cash</Label>
            <Input
              type="number"
              step="0.01"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!name.trim()) {
                toast.error("Name is required");
                return;
              }
              onSubmit(name.trim(), parseFloat(cash) || 0);
            }}
          >
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EndShiftDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (cash: number, notes?: string) => void;
}) {
  const [cash, setCash] = useState("0");
  const [notes, setNotes] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>End shift</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Closing cash</Label>
            <Input
              autoFocus
              type="number"
              step="0.01"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any handover info..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(parseFloat(cash) || 0, notes.trim() || undefined)}>
            Close shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
