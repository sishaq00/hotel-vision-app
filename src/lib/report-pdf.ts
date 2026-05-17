// PDF report exporter — generates branded multi-page reports via jsPDF + autoTable.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { HotelSettings } from "@/store/hotel-store";

interface PdfReportArgs {
  title: string;
  rows: Record<string, unknown>[];
  settings: HotelSettings;
}

export function downloadReportPDF({ title, rows, settings }: PdfReportArgs) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 36;

  // Optional logo
  let textX = margin;
  if (settings.logoDataUrl) {
    try {
      const fmt = settings.logoDataUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(settings.logoDataUrl, fmt, margin, margin - 4, 40, 40);
      textX = margin + 50;
    } catch { /* ignore */ }
  }

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(20);
  doc.text(settings.hotelName || "Hotel", textX, margin + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(title, textX, margin + 22);
  doc.text(
    `Generated: ${new Date().toLocaleString()}`,
    pageW - margin,
    margin + 8,
    { align: "right" },
  );
  doc.text(
    `Rows: ${rows.length}`,
    pageW - margin,
    margin + 22,
    { align: "right" },
  );

  if (rows.length === 0) {
    doc.setTextColor(120);
    doc.setFontSize(11);
    doc.text("No data.", pageW / 2, 200, { align: "center" });
  } else {
    const headers = Object.keys(rows[0]);
    const body = rows.map((r) => headers.map((h) => {
      const v = r[h];
      return v == null ? "—" : String(v);
    }));
    autoTable(doc, {
      startY: margin + 50,
      head: [headers.map((h) => h.replace(/([A-Z])/g, " $1").trim())],
      body,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [40, 60, 90], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin, right: margin },
    });
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      settings.invoiceFooter || settings.hotelName || "",
      margin,
      doc.internal.pageSize.getHeight() - 16,
    );
    doc.text(
      `Page ${i} / ${pageCount}`,
      pageW - margin,
      doc.internal.pageSize.getHeight() - 16,
      { align: "right" },
    );
  }

  const safe = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  doc.save(`${safe}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
