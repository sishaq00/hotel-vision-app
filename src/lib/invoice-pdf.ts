// Generate a printable PDF invoice using jsPDF (client-only).
import { jsPDF } from "jspdf";
import type {
  Guest,
  HotelSettings,
  InvoiceSnapshot,
  Reservation,
  Room,
} from "@/store/hotel-store";

interface InvoiceArgs {
  invoice: InvoiceSnapshot;
  reservation: Reservation;
  guest: Guest | undefined;
  room: Room;
  settings: HotelSettings;
}

const fmt = (n: number, c: string) =>
  `${c} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function generateInvoicePDF(args: InvoiceArgs): jsPDF {
  const { invoice, reservation, guest, room, settings } = args;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  // Header — hotel
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(settings.hotelName || "Hotel", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  y += 18;
  if (settings.address) { doc.text(settings.address, margin, y); y += 12; }
  const contactLine = [settings.contactPhone, settings.contactEmail]
    .filter(Boolean).join("  ·  ");
  if (contactLine) { doc.text(contactLine, margin, y); y += 12; }

  // Invoice title block (right side)
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("INVOICE", pageW - margin, margin + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`No. ${invoice.invoiceNumber}`, pageW - margin, margin + 22, { align: "right" });
  doc.text(
    `Issued: ${new Date(invoice.issuedAt).toLocaleString()}`,
    pageW - margin,
    margin + 36,
    { align: "right" },
  );

  // Divider
  y = Math.max(y, margin + 60) + 14;
  doc.setDrawColor(220);
  doc.line(margin, y, pageW - margin, y);
  y += 24;

  // Bill To
  doc.setTextColor(120);
  doc.setFontSize(9);
  doc.text("BILL TO", margin, y);
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  y += 16;
  doc.text(guest?.name ?? "Guest", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  if (guest?.email) { y += 14; doc.text(guest.email, margin, y); }
  if (guest?.phone) { y += 12; doc.text(guest.phone, margin, y); }
  if (guest?.country) { y += 12; doc.text(guest.country, margin, y); }

  // Stay details (right)
  let yR = y - 16 - (guest?.email ? 14 : 0) - (guest?.phone ? 12 : 0) - (guest?.country ? 12 : 0);
  doc.setTextColor(120);
  doc.setFontSize(9);
  doc.text("STAY DETAILS", pageW - margin, yR, { align: "right" });
  doc.setTextColor(20);
  doc.setFontSize(10);
  yR += 16;
  doc.text(`Room ${room.number} · ${room.type}`, pageW - margin, yR, { align: "right" });
  yR += 14;
  doc.text(`Check-in:  ${reservation.checkIn}`, pageW - margin, yR, { align: "right" });
  yR += 12;
  doc.text(`Check-out: ${reservation.checkOut}`, pageW - margin, yR, { align: "right" });
  yR += 12;
  doc.text(`Nights:    ${invoice.nights}`, pageW - margin, yR, { align: "right" });

  y = Math.max(y, yR) + 30;

  // Table header
  doc.setFillColor(245, 247, 250);
  doc.rect(margin, y, pageW - margin * 2, 26, "F");
  doc.setTextColor(80);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Description", margin + 12, y + 17);
  doc.text("Qty", pageW - margin - 200, y + 17, { align: "right" });
  doc.text("Rate", pageW - margin - 110, y + 17, { align: "right" });
  doc.text("Amount", pageW - margin - 12, y + 17, { align: "right" });
  y += 26;

  // Row: room nights
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30);
  y += 22;
  doc.text(`Room ${room.number} (${room.type}) — accommodation`, margin + 12, y);
  doc.text(`${invoice.nights}`, pageW - margin - 200, y, { align: "right" });
  doc.text(fmt(invoice.ratePerNight, invoice.currency), pageW - margin - 110, y, { align: "right" });
  doc.text(fmt(invoice.subtotal, invoice.currency), pageW - margin - 12, y, { align: "right" });
  y += 14;
  doc.setDrawColor(235);
  doc.line(margin, y, pageW - margin, y);

  // Totals block
  y += 24;
  const labelX = pageW - margin - 140;
  const valueX = pageW - margin - 12;
  doc.setTextColor(80);
  doc.text("Subtotal", labelX, y, { align: "right" });
  doc.setTextColor(20);
  doc.text(fmt(invoice.subtotal, invoice.currency), valueX, y, { align: "right" });
  y += 16;
  doc.setTextColor(80);
  doc.text(`VAT (${(invoice.taxRate * 100).toFixed(1)}%)`, labelX, y, { align: "right" });
  doc.setTextColor(20);
  doc.text(fmt(invoice.taxAmount, invoice.currency), valueX, y, { align: "right" });
  y += 16;
  doc.setTextColor(80);
  doc.text(`Service fee (${(invoice.serviceFeeRate * 100).toFixed(1)}%)`, labelX, y, { align: "right" });
  doc.setTextColor(20);
  doc.text(fmt(invoice.serviceFeeAmount, invoice.currency), valueX, y, { align: "right" });
  y += 12;
  doc.setDrawColor(180);
  doc.line(labelX - 60, y, valueX, y);
  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20);
  doc.text("TOTAL", labelX, y, { align: "right" });
  doc.text(fmt(invoice.total, invoice.currency), valueX, y, { align: "right" });

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(140);
  doc.text(
    "Thank you for staying with us.",
    pageW / 2,
    doc.internal.pageSize.getHeight() - margin,
    { align: "center" },
  );

  return doc;
}

export function downloadInvoicePDF(args: InvoiceArgs) {
  const doc = generateInvoicePDF(args);
  doc.save(`${args.invoice.invoiceNumber}.pdf`);
}
