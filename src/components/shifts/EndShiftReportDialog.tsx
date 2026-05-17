// End-of-shift report: shows everything the user did, captures closing cash + signature, prints.
import { useMemo, useState } from "react";
import { Printer, FileDown, ChevronDown, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHotelStore } from "@/store/hotel-store";
import { buildShiftReport, formatDuration } from "@/lib/shift-report";
import { downloadReportPDF } from "@/lib/report-pdf";
import { toast } from "sonner";

interface Props {
  shiftId: string | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (closingCash: number, notes: string) => void;
}

export function EndShiftReportDialog({ shiftId, open, onClose, onConfirm }: Props) {
  const settings = useHotelStore((s) => s.settings);
  const [closingCash, setClosingCash] = useState("");
  const [notes, setNotes] = useState("");

  const report = useMemo(() => {
    if (!shiftId || !open) return null;
    return buildShiftReport(shiftId);
  }, [shiftId, open]);

  if (!report) return null;

  const cashNum = parseFloat(closingCash);
  const isValidCash = Number.isFinite(cashNum);
  const cashDiff = isValidCash ? +(cashNum - report.expectedClosingCash).toFixed(2) : 0;
  const hasDiff = isValidCash && Math.abs(cashDiff) > 0.005;

  const handlePrint = () => {
    if (!shiftId) return;
    window.open(`/print-shift/${shiftId}`, "_blank", "width=900,height=1100");
  };

  const handlePDF = () => {
    const cur = settings.currency;
    const rows: Record<string, unknown>[] = [
      { item: "Employee", detail: report.shift.userName },
      { item: "Shift start", detail: new Date(report.shift.startedAt).toLocaleString() },
      { item: "Shift end", detail: new Date(report.endedAtIso).toLocaleString() },
      { item: "Duration", detail: formatDuration(report.durationMinutes) },
      { item: "Opening cash", detail: `${cur} ${report.shift.openingCash.toFixed(2)}` },
      { item: "Cash payments", detail: `${cur} ${report.totals.paymentsTotal.toFixed(2)}` },
      { item: "Product sales", detail: `${cur} ${report.totals.productSalesTotal.toFixed(2)}` },
      { item: "Refunds", detail: `${cur} ${report.totals.refundsTotal.toFixed(2)}` },
      { item: "Expected closing cash", detail: `${cur} ${report.expectedClosingCash.toFixed(2)}` },
      { item: "Operations count", detail: String(report.totals.operationsCount) },
      { item: "—", detail: "—" },
      ...report.checkIns.map((e) => ({ item: `Check-in · ${new Date(e.timestamp).toLocaleTimeString()}`, detail: e.description })),
      ...report.checkOuts.map((e) => ({ item: `Check-out · ${new Date(e.timestamp).toLocaleTimeString()}`, detail: `${e.description} · ${cur} ${(e.amount ?? 0).toFixed(2)}` })),
      ...report.extensions.map((e) => ({ item: `Extend/Shorten · ${new Date(e.timestamp).toLocaleTimeString()}`, detail: `${e.description} · Δ ${cur} ${(e.amount ?? 0).toFixed(2)}` })),
      ...report.productSales.map((p) => ({ item: `Sale · ${new Date(p.soldAt).toLocaleTimeString()}`, detail: `${p.quantity}× ${p.productName}${p.roomNumber ? ` → Room ${p.roomNumber}` : ""} · ${cur} ${p.total.toFixed(2)}` })),
      ...report.cashPayments.map((e) => ({ item: `Payment · ${new Date(e.timestamp).toLocaleTimeString()}`, detail: `${e.description} · ${cur} ${(e.amount ?? 0).toFixed(2)}` })),
    ];
    downloadReportPDF({
      title: `Shift Report — ${report.shift.userName} — ${new Date(report.shift.startedAt).toLocaleDateString()}`,
      rows,
      settings,
    });
  };

  const handleConfirm = () => {
    if (!isValidCash) {
      toast.error("Enter the closing cash count");
      return;
    }
    if (hasDiff && !notes.trim()) {
      toast.error("Cash difference detected — please add a note explaining it");
      return;
    }
    onConfirm(cashNum, notes.trim());
  };

  const cur = settings.currency;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>End of shift report</span>
            <span className="text-xs font-normal text-muted-foreground">
              {report.shift.userName} · {formatDuration(report.durationMinutes)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(92vh-220px)] overflow-y-auto px-6 py-4">
          {/* Summary cards */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Operations" value={report.totals.operationsCount} />
            <Stat label="Cash collected" value={`${cur} ${report.totals.cashCollected.toFixed(2)}`} accent />
            <Stat label="Product sales" value={`${cur} ${report.totals.productSalesTotal.toFixed(2)}`} />
            <Stat label="Refunds" value={`${cur} ${report.totals.refundsTotal.toFixed(2)}`} />
            <Stat label="Opening cash" value={`${cur} ${report.shift.openingCash.toFixed(2)}`} />
            <Stat label="Expected closing" value={`${cur} ${report.expectedClosingCash.toFixed(2)}`} accent />
            <Stat label="Nights extended" value={String(report.totals.nightsExtended)} />
            <Stat label="Stay-change Δ" value={`${cur} ${report.totals.extensionAmount.toFixed(2)}`} />
          </div>

          {/* Sections */}
          <Section title={`Check-ins (${report.checkIns.length})`} rows={report.checkIns.map((e) => ({
            time: new Date(e.timestamp).toLocaleTimeString(),
            description: e.description,
          }))} />
          <Section title={`Check-outs (${report.checkOuts.length})`} rows={report.checkOuts.map((e) => ({
            time: new Date(e.timestamp).toLocaleTimeString(),
            description: e.description,
            amount: `${cur} ${(e.amount ?? 0).toFixed(2)}`,
          }))} />
          <Section title={`Extend / Shorten stay (${report.extensions.length})`} rows={report.extensions.map((e) => {
            const d = (e.details ?? {}) as { nightsDelta?: number; oldCheckOut?: string; newCheckOut?: string };
            return {
              time: new Date(e.timestamp).toLocaleTimeString(),
              description: e.description,
              change: `${d.oldCheckOut ?? "—"} → ${d.newCheckOut ?? "—"} (${d.nightsDelta ?? 0} nights)`,
              amount: `${cur} ${(e.amount ?? 0).toFixed(2)}`,
            };
          })} />
          <Section title={`Product sales (${report.productSales.length})`} rows={report.productSales.map((p) => ({
            time: new Date(p.soldAt).toLocaleTimeString(),
            product: `${p.quantity}× ${p.productName}`,
            room: p.roomNumber ? `Room ${p.roomNumber}` : "—",
            amount: `${cur} ${p.total.toFixed(2)}`,
          }))} />
          <Section title={`Cash payments (${report.cashPayments.length})`} rows={report.cashPayments.map((e) => ({
            time: new Date(e.timestamp).toLocaleTimeString(),
            description: e.description,
            amount: `${cur} ${(e.amount ?? 0).toFixed(2)}`,
          }))} />
          <Section title={`New reservations (${report.newReservations.length})`} rows={report.newReservations.map((e) => ({
            time: new Date(e.timestamp).toLocaleTimeString(),
            description: e.description,
            amount: `${cur} ${(e.amount ?? 0).toFixed(2)}`,
          }))} />
          {report.cancellations.length > 0 && (
            <Section title={`Cancellations (${report.cancellations.length})`} rows={report.cancellations.map((e) => ({
              time: new Date(e.timestamp).toLocaleTimeString(),
              description: e.description,
            }))} />
          )}
          {report.refunds.length > 0 && (
            <Section title={`Refunds (${report.refunds.length})`} rows={report.refunds.map((e) => ({
              time: new Date(e.timestamp).toLocaleTimeString(),
              description: e.description,
              amount: `${cur} ${(e.amount ?? 0).toFixed(2)}`,
            }))} />
          )}
          {report.roomChanges.length > 0 && (
            <Section title={`Room status changes (${report.roomChanges.length})`} rows={report.roomChanges.map((e) => ({
              time: new Date(e.timestamp).toLocaleTimeString(),
              description: e.description,
            }))} />
          )}

          {/* Closing cash entry */}
          <Card className="mt-4 border-primary/30 bg-primary/5 p-4">
            <h4 className="mb-2 text-sm font-semibold">Cash drawer reconciliation</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Counted closing cash *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  placeholder={report.expectedClosingCash.toFixed(2)}
                />
                {hasDiff && (
                  <div className="flex items-center gap-1.5 text-xs text-warning">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Difference: {cashDiff > 0 ? "+" : ""}{cur} {cashDiff.toFixed(2)} {cashDiff > 0 ? "(over)" : "(short)"}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Notes / handover {hasDiff && <span className="text-destructive">*</span>}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={hasDiff ? "Reason for cash difference…" : "Anything to flag for next shift…"}
                  rows={2}
                />
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter className="border-t border-border px-6 py-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={handlePDF}>
            <FileDown className="h-4 w-4" /> Export PDF
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button onClick={handleConfirm}>Confirm & close shift</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-md border p-2 ${accent ? "border-primary/30 bg-primary/10" : "border-border bg-muted/30"}`}>
      <div className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="text-base font-bold">{value}</div>
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: Record<string, string>[] }) {
  const [open, setOpen] = useState(true);
  if (rows.length === 0) return null;
  const cols = Object.keys(rows[0]);
  return (
    <Card className="mb-3 overflow-hidden border-border/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between border-b border-border bg-muted/20 px-4 py-2 text-left text-xs font-semibold"
      >
        {title}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {cols.map((c) => (
                  <TableHead key={c} className="capitalize text-[10px]">{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  {cols.map((c) => (
                    <TableCell key={c} className="text-xs">{r[c]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
