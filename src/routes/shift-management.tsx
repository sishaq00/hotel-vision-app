import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Clock, Play, Square, FileText } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useCurrentUser, useAuthStore } from "@/store/auth-store";
import { EndShiftReportDialog } from "@/components/shifts/EndShiftReportDialog";
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
  const me = useCurrentUser();
  const isAdmin = useAuthStore((s) => s.current()?.role === "admin");

  const [openStart, setOpenStart] = useState(false);
  const [endTarget, setEndTarget] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...shifts].sort((a, b) => (b.startedAt > a.startedAt ? 1 : -1)),
    [shifts],
  );

  // Staff sees only their shifts; admin sees all.
  const visible = useMemo(
    () => (isAdmin || !me ? sorted : sorted.filter((s) => s.userId === me.id)),
    [sorted, isAdmin, me],
  );

  const myOpenShift = me ? sorted.find((s) => s.status === "open" && s.userId === me.id) : undefined;
  const allOpenShifts = sorted.filter((s) => s.status === "open");

  return (
    <AppLayout
      title="Shift Management"
      subtitle={
        myOpenShift
          ? "You have an open shift"
          : `${allOpenShifts.length} open shift${allOpenShifts.length === 1 ? "" : "s"}`
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card p-5 shadow-sm lg:col-span-1">
          <h3 className="text-sm font-semibold text-foreground">Quick actions</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Open or close your front desk shift.
          </p>

          {!myOpenShift ? (
            <Button className="mt-4 w-full" onClick={() => setOpenStart(true)}>
              <Play className="h-4 w-4" /> Start my shift
            </Button>
          ) : (
            <div className="mt-4 rounded-md border border-success/30 bg-success/10 p-3 text-sm">
              <div className="font-medium text-foreground">Active shift</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Started {new Date(myOpenShift.startedAt).toLocaleTimeString()} ·
                Opening cash ${myOpenShift.openingCash.toFixed(2)}
              </div>
              <Button
                size="sm"
                variant="default"
                className="mt-3 w-full"
                onClick={() => setEndTarget(myOpenShift.id)}
              >
                <FileText className="h-3.5 w-3.5" /> End shift & view report
              </Button>
            </div>
          )}

          {isAdmin && allOpenShifts.length > 0 && (
            <div className="mt-6 space-y-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                All open shifts
              </h4>
              {allOpenShifts.map((s) => (
                <div key={s.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{s.userName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      since {new Date(s.startedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => setEndTarget(s.id)}
                  >
                    <Square className="h-3.5 w-3.5" /> End & view report
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm lg:col-span-2">
          <div className="border-b border-border p-5">
            <h3 className="text-sm font-semibold text-foreground">
              {isAdmin ? "Shift history (all users)" : "My shift history"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Last {Math.min(50, visible.length)} shift{visible.length === 1 ? "" : "s"}
            </p>
          </div>
          {visible.length === 0 ? (
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
                    <TableHead>Report</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.slice(0, 50).map((s) => {
                    const diff =
                      s.closingCash !== undefined ? s.closingCash - s.openingCash : null;
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
                          {s.closingCash !== undefined ? `$${s.closingCash.toFixed(2)}` : "—"}
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
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`/print-shift/${s.id}`, "_blank")}
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <StartShiftDialog
        open={openStart}
        userName={me?.fullName || me?.username || ""}
        onClose={() => setOpenStart(false)}
        onSubmit={(cash) => {
          if (!me) {
            toast.error("Please sign in first");
            return;
          }
          startShift(me.fullName || me.username, cash);
          toast.success(`Shift started`);
          setOpenStart(false);
        }}
      />
      <EndShiftReportDialog
        shiftId={endTarget}
        open={endTarget !== null}
        onClose={() => setEndTarget(null)}
        onConfirm={(cash, notes) => {
          if (endTarget) {
            endShift(endTarget, cash, notes || undefined);
            toast.success("Shift closed");
          }
          setEndTarget(null);
        }}
      />
    </AppLayout>
  );
}

function StartShiftDialog({
  open,
  userName,
  onClose,
  onSubmit,
}: {
  open: boolean;
  userName: string;
  onClose: () => void;
  onSubmit: (cash: number) => void;
}) {
  const [cash, setCash] = useState("0");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Start shift</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>User</Label>
            <Input value={userName} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Opening cash float</Label>
            <Input
              autoFocus
              type="number"
              step="0.01"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(parseFloat(cash) || 0)}>Start</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
