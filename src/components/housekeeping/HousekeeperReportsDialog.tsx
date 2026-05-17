// Manager view of submitted housekeeper reports — review and bulk-update room statuses.
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHotelStore, type HousekeepingStatus } from "@/store/hotel-store";
import { CheckCircle2, FileText, Printer } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

const STATUSES: HousekeepingStatus[] = ["clean", "inspected", "dirty", "out-of-order"];

export function HousekeeperReportsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const reports = useHotelStore((s) => s.housekeeperReports);
  const review = useHotelStore((s) => s.reviewHousekeeperReport);
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = reports.find((r) => r.id === selectedId);
  const [decisions, setDecisions] = useState<Record<string, HousekeepingStatus>>({});

  // initialize defaults to "clean" when opening a report
  useMemo(() => {
    if (selected) {
      const init: Record<string, HousekeepingStatus> = {};
      selected.rooms.forEach((r) => { init[r.roomId] = "clean"; });
      setDecisions(init);
    }
  }, [selected]);

  const submitted = reports.filter((r) => r.status === "submitted");

  const handleApply = () => {
    if (!selected) return;
    const arr = Object.entries(decisions).map(([roomId, newStatus]) => ({ roomId, newStatus }));
    review(selected.id, arr);
    toast.success(`${arr.length} room(s) updated from "${selected.housekeeperName}" report`);
    setSelectedId("");
  };

  const setAll = (s: HousekeepingStatus) => {
    if (!selected) return;
    const next: Record<string, HousekeepingStatus> = {};
    selected.rooms.forEach((r) => { next[r.roomId] = s; });
    setDecisions(next);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Housekeeper Reports ({submitted.length} pending)</DialogTitle>
        </DialogHeader>

        {!selected ? (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {reports.length === 0 && (
              <p className="p-6 text-center text-xs text-muted-foreground">No reports submitted yet.</p>
            )}
            {reports.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className="flex w-full items-center justify-between rounded border border-border p-3 text-left text-xs hover:bg-muted"
              >
                <div>
                  <p className="font-semibold">{r.housekeeperName}</p>
                  <p className="text-muted-foreground">
                    {r.date} · {r.rooms.length} room(s)
                    {r.totalValue ? ` · $${r.totalValue.toFixed(2)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    r.status === "submitted"
                      ? "bg-warning/20 text-warning-foreground"
                      : "bg-success/20 text-success"
                  }`}>{r.status}</span>
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded border border-border bg-muted/30 p-2 text-xs">
              <div>
                <p className="font-semibold">{selected.housekeeperName}</p>
                <p className="text-muted-foreground">
                  {selected.date} · submitted {new Date(selected.submittedAt).toLocaleTimeString()}
                </p>
              </div>
              <Button
                variant="outline" size="sm" className="h-7 gap-1 text-xs"
                onClick={() => navigate({ to: "/print/housekeeper-report/$reportId", params: { reportId: selected.id } })}
              >
                <Printer className="h-3 w-3" /> Print
              </Button>
            </div>

            {selected.status === "submitted" && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Bulk set to:</span>
                {STATUSES.map((s) => (
                  <Button key={s} variant="outline" size="sm" className="h-7 text-xs capitalize" onClick={() => setAll(s)}>
                    {s.replace("-", " ")}
                  </Button>
                ))}
              </div>
            )}

            <div className="max-h-[50vh] overflow-y-auto rounded border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/50 text-left text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2">Room</th>
                    <th className="p-2">Task</th>
                    <th className="p-2">Finished</th>
                    <th className="p-2">Notes</th>
                    <th className="p-2">New status</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.rooms.map((r) => (
                    <tr key={r.roomId} className="border-t border-border">
                      <td className="p-2 font-semibold">{r.roomNumber}</td>
                      <td className="p-2 capitalize text-muted-foreground">{r.taskType?.replace("-", " ") ?? "—"}</td>
                      <td className="p-2 text-muted-foreground">{new Date(r.finishedAt).toLocaleTimeString()}</td>
                      <td className="p-2 max-w-[180px] truncate text-muted-foreground">{r.notes ?? "—"}</td>
                      <td className="p-2">
                        {selected.status === "submitted" ? (
                          <Select
                            value={decisions[r.roomId] ?? "clean"}
                            onValueChange={(v) => setDecisions((d) => ({ ...d, [r.roomId]: v as HousekeepingStatus }))}
                          >
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("-", " ")}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground">reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedId("")}>Back</Button>
              {selected.status === "submitted" && (
                <Button onClick={handleApply} className="gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Apply & close report
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
