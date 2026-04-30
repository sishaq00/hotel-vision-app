import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart3, Download, FileText, Search, Play, FileSpreadsheet } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useHotelStore } from "@/store/hotel-store";
import {
  REPORT_DEFINITIONS, REPORT_CATEGORIES,
  rowsToCSV, downloadFile, type ReportDefinition,
} from "@/lib/reports";
import { downloadExcel } from "@/lib/excel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — NEXORA OS" },
      { name: "description", content: "Hotel reports hub: front desk, revenue, tax, guests." },
    ],
  }),
  component: ReportsHub,
});

function ReportsHub() {
  const ctx = useHotelStore((s) => ({
    rooms: s.rooms, reservations: s.reservations, guests: s.guests,
    payments: s.payments, settings: s.settings,
  }));
  const recordReportRun = useHotelStore((s) => s.recordReportRun);

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [previewReport, setPreviewReport] = useState<{ def: ReportDefinition; rows: Record<string, unknown>[] } | null>(null);

  const filtered = useMemo(() => {
    return REPORT_DEFINITIONS.filter((r) => {
      if (activeCategory !== "All" && r.category !== activeCategory) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [query, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<string, ReportDefinition[]>();
    filtered.forEach((r) => {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category)!.push(r);
    });
    return [...map.entries()];
  }, [filtered]);

  const runReport = (def: ReportDefinition, format: "csv" | "xlsx" | "preview") => {
    try {
      const rows = def.run(ctx);
      if (format === "csv" || format === "xlsx") {
        if (rows.length === 0) {
          toast("No data to export");
          recordReportRun({ reportKey: def.key, reportName: def.name, format: format === "xlsx" ? "csv" : "csv", status: "completed", rowCount: 0 });
          return;
        }
        const stamp = new Date().toISOString().slice(0, 10);
        if (format === "csv") {
          downloadFile(`${def.key}-${stamp}.csv`, rowsToCSV(rows));
        } else {
          downloadExcel(rows as Record<string, unknown>[], `${def.key}-${stamp}.xlsx`, def.name);
        }
        toast.success(`Exported ${rows.length} rows`);
        recordReportRun({ reportKey: def.key, reportName: def.name, format: "csv", status: "completed", rowCount: rows.length });
      } else {
        setPreviewReport({ def, rows });
      }
    } catch (e) {
      toast.error("Report failed");
      recordReportRun({ reportKey: def.key, reportName: def.name, format: "json", status: "failed", notes: String(e) });
    }
  };

  return (
    <AppLayout title="Reports" subtitle={`${REPORT_DEFINITIONS.length} reports across ${REPORT_CATEGORIES.length} categories`}>
      <Card className="border-border/60 shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reports…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["All", ...REPORT_CATEGORIES].map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  activeCategory === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                )}
              >{c}</button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-border">
          {grouped.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No reports match your search.
            </div>
          ) : grouped.map(([category, defs]) => (
            <div key={category} className="p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" /> {category}
                <span className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{defs.length}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {defs.map((def) => (
                  <div
                    key={def.key}
                    className="group flex flex-col gap-2 rounded-md border border-border/60 bg-card p-3 hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight">{def.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{def.description}</p>
                      </div>
                    </div>
                    <div className="mt-1 flex gap-1.5">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => runReport(def, "preview")}>
                        <Play className="h-3 w-3" /> Preview
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => runReport(def, "csv")} title="CSV">
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button size="sm" className="h-7 px-2 text-xs" onClick={() => runReport(def, "xlsx")} title="Excel">
                        <FileSpreadsheet className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {previewReport && (
        <Dialog open onOpenChange={(o) => !o && setPreviewReport(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{previewReport.def.name}</DialogTitle>
              <p className="text-xs text-muted-foreground">{previewReport.rows.length} row{previewReport.rows.length === 1 ? "" : "s"}</p>
            </DialogHeader>
            <div className="overflow-auto">
              {previewReport.rows.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">No data.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(previewReport.rows[0]).map((h) => (
                        <TableHead key={h} className="capitalize">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewReport.rows.slice(0, 200).map((row, i) => (
                      <TableRow key={i}>
                        {Object.keys(previewReport.rows[0]).map((h) => (
                          <TableCell key={h} className="text-xs">{String(row[h] ?? "—")}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (previewReport.rows.length === 0) { toast("No data"); return; }
                  downloadFile(
                    `${previewReport.def.key}-${new Date().toISOString().slice(0, 10)}.csv`,
                    rowsToCSV(previewReport.rows),
                  );
                  recordReportRun({
                    reportKey: previewReport.def.key,
                    reportName: previewReport.def.name,
                    format: "csv",
                    status: "completed",
                    rowCount: previewReport.rows.length,
                  });
                  toast.success("Exported");
                }}
              >
                <Download className="h-4 w-4" /> Export CSV
              </Button>
              <Button
                onClick={() => {
                  if (previewReport.rows.length === 0) { toast("No data"); return; }
                  downloadExcel(
                    previewReport.rows as Record<string, unknown>[],
                    `${previewReport.def.key}-${new Date().toISOString().slice(0, 10)}.xlsx`,
                    previewReport.def.name,
                  );
                  recordReportRun({
                    reportKey: previewReport.def.key,
                    reportName: previewReport.def.name,
                    format: "csv",
                    status: "completed",
                    rowCount: previewReport.rows.length,
                  });
                  toast.success("Exported");
                }}
              >
                <FileSpreadsheet className="h-4 w-4" /> Export Excel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
