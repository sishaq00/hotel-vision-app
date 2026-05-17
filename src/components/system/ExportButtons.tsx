// Reusable Excel/CSV export buttons. Pass an array of rows.
import { FileSpreadsheet, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadExcel } from "@/lib/excel";
import { rowsToCSV, downloadFile } from "@/lib/reports";
import { toast } from "sonner";

interface Props<T extends Record<string, unknown>> {
  rows: T[];
  filename: string;
  className?: string;
}

export function ExportButtons<T extends Record<string, unknown>>({
  rows,
  filename,
  className,
}: Props<T>) {
  const onExport = (kind: "csv" | "xlsx") => {
    if (rows.length === 0) {
      toast("No data to export");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    if (kind === "csv") {
      downloadFile(`${filename}-${stamp}.csv`, rowsToCSV(rows));
    } else {
      downloadExcel(rows, `${filename}-${stamp}.xlsx`, filename);
    }
    toast.success(`Exported ${rows.length} rows`);
  };
  return (
    <div className={`no-print flex items-center gap-1.5 ${className ?? ""}`}>
      <Button variant="outline" size="sm" onClick={() => onExport("csv")} title="CSV">
        <Download className="h-3.5 w-3.5" />
        <span className="ms-1 hidden sm:inline">CSV</span>
      </Button>
      <Button variant="outline" size="sm" onClick={() => onExport("xlsx")} title="Excel">
        <FileSpreadsheet className="h-3.5 w-3.5" />
        <span className="ms-1 hidden sm:inline">Excel</span>
      </Button>
    </div>
  );
}
