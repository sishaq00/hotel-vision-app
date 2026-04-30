// Excel export helper — wraps xlsx for one-click .xlsx downloads.
import * as XLSX from "xlsx";

export function downloadExcel<T extends Record<string, unknown>>(
  rows: T[],
  filename: string,
  sheetName = "Sheet1",
) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const safe = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, safe);
}
