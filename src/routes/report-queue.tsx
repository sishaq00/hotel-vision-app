import { createFileRoute } from "@tanstack/react-router";
import { ListChecks, Trash2, Download } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useHotelStore, type ReportRunStatus } from "@/store/hotel-store";
import { REPORT_DEFINITIONS, rowsToCSV, downloadFile } from "@/lib/reports";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/report-queue")({
  head: () => ({
    meta: [
      { title: "Report Queue — NEXORA OS" },
      { name: "description", content: "Recent report runs and history." },
    ],
  }),
  component: ReportQueuePage,
});

const STATUS_STYLE: Record<ReportRunStatus, string> = {
  queued: "bg-info/10 text-info border-info/20",
  completed: "bg-success/10 text-success border-success/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

function ReportQueuePage() {
  const { t } = useT();
  const runs = useHotelStore((s) => s.reportRuns);
  const clear = useHotelStore((s) => s.clearReportRuns);
  const recordReportRun = useHotelStore((s) => s.recordReportRun);
  const ctx = useHotelStore((s) => ({
    rooms: s.rooms, reservations: s.reservations, guests: s.guests,
    payments: s.payments, settings: s.settings,
  }));

  const rerun = (reportKey: string, reportName: string) => {
    const def = REPORT_DEFINITIONS.find((d) => d.key === reportKey);
    if (!def) { toast.error("Report not found"); return; }
    const rows = def.run(ctx);
    if (rows.length === 0) {
      toast("No data to export");
      recordReportRun({ reportKey, reportName, format: "csv", status: "completed", rowCount: 0 });
      return;
    }
    downloadFile(`${reportKey}-${new Date().toISOString().slice(0, 10)}.csv`, rowsToCSV(rows));
    recordReportRun({ reportKey, reportName, format: "csv", status: "completed", rowCount: rows.length });
    toast.success(`Re-ran ${reportName}`);
  };

  return (
    <AppLayout title={t("nav.report-queue")} subtitle={`${runs.length} run${runs.length === 1 ? "" : "s"} in history`}>
      <Card className="border-border/60 shadow-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-sm font-semibold">Recent runs</h2>
          {runs.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => { clear(); toast("History cleared"); }}>
              <Trash2 className="h-3 w-3" /> Clear history
            </Button>
          )}
        </div>
        {runs.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No report runs yet"
            description="Reports you run from the Reports hub appear here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>When</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.reportName}</TableCell>
                  <TableCell className="uppercase text-xs">{r.format}</TableCell>
                  <TableCell className="font-mono text-xs">{r.rowCount ?? "—"}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium capitalize",
                      STATUS_STYLE[r.status],
                    )}>{r.status}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.ranAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => rerun(r.reportKey, r.reportName)}>
                      <Download className="h-3 w-3" /> Re-run
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppLayout>
  );
}
