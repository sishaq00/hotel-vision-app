// Print log viewer — list of all invoice prints with user, time, type.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, Printer, Receipt } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/system/EmptyState";
import { useConfirm } from "@/components/system/ConfirmDialog";
import { useHotelStore } from "@/store/hotel-store";
import { listPrintLog, clearPrintLog, type PrintLogEntry } from "@/lib/print-log";
import { toast } from "sonner";

export const Route = createFileRoute("/print-log")({
  head: () => ({
    meta: [
      { title: "Print Log — NEXORA OS" },
      { name: "description", content: "Audit trail of every printed invoice." },
    ],
  }),
  component: PrintLogPage,
});

function PrintLogPage() {
  const [entries, setEntries] = useState<PrintLogEntry[]>([]);
  const reservations = useHotelStore((s) => s.reservations);
  const guests = useHotelStore((s) => s.guests);
  const confirm = useConfirm();

  useEffect(() => {
    setEntries(listPrintLog());
  }, []);

  const handleClear = async () => {
    const ok = await confirm({
      title: "Clear print log?",
      description: "This permanently deletes all print history. Cannot be undone.",
      confirmLabel: "Clear",
      destructive: true,
    });
    if (!ok) return;
    clearPrintLog();
    setEntries([]);
    toast.success("Print log cleared");
  };

  return (
    <AppLayout title="Print Log" subtitle="Audit trail — every invoice printed by every shift">
      <Card className="border-border/60 shadow-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="text-sm text-muted-foreground">
            {entries.length} record{entries.length === 1 ? "" : "s"}
          </div>
          {entries.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleClear} className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Clear log
            </Button>
          )}
        </div>

        {entries.length === 0 ? (
          <EmptyState
            icon={Printer}
            title="No prints yet"
            description="Every invoice or receipt printed will be logged here automatically."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Guest / Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => {
                const r = reservations.find((x) => x.id === e.reservationId);
                const g = r ? guests.find((x) => x.id === r.guestId) : undefined;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(e.at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{e.user}</TableCell>
                    <TableCell>
                      {e.kind === "invoice-a4" ? (
                        <Badge variant="outline" className="gap-1">
                          <Printer className="h-3 w-3" /> A4
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Receipt className="h-3 w-3" /> 80mm
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{g?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {r?.invoice?.invoiceNumber ?? e.reservationId.slice(0, 8)}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppLayout>
  );
}
