import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useHotelStore } from "@/store/hotel-store";
import { recordPrint } from "@/lib/print-log";

export const Route = createFileRoute("/print-credit-note/$noteId")({
  component: PrintCreditNote,
});

function PrintCreditNote() {
  const { noteId } = Route.useParams();
  const note = useHotelStore((s) => s.creditNotes.find((n) => n.id === noteId));
  const reservation = useHotelStore((s) =>
    note ? s.reservations.find((r) => r.id === note.reservationId) : undefined,
  );
  const guest = useHotelStore((s) =>
    reservation ? s.guests.find((g) => g.id === reservation.guestId) : undefined,
  );
  const settings = useHotelStore((s) => s.settings);

  useEffect(() => {
    if (note) recordPrint(note.id, "credit-note");
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, [note]);

  if (!note) {
    return (
      <div style={{ padding: 48, textAlign: "center", fontSize: 14 }}>
        Credit note not found.
      </div>
    );
  }

  const fmt = (n: number) =>
    `${settings.currency} ${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: "#111",
        padding: "32px 40px",
        maxWidth: 800,
        margin: "0 auto",
      }}
    >
      <style>{`@page { size: A4; margin: 14mm; } @media print { body { -webkit-print-color-adjust: exact; } }`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #b91c1c", paddingBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, color: "#b91c1c", letterSpacing: 1 }}>CREDIT NOTE</h1>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>
            Refund / Invoice correction
          </p>
        </div>
        <div style={{ textAlign: "right", fontSize: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{settings.hotelName}</div>
          {settings.hotelAddress && <div style={{ color: "#6b7280" }}>{settings.hotelAddress}</div>}
          {settings.taxId && <div style={{ color: "#6b7280" }}>Tax ID: {settings.taxId}</div>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 20 }}>
        <div>
          <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Issued to</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{guest?.name ?? "—"}</div>
          {guest?.email && <div style={{ fontSize: 12, color: "#6b7280" }}>{guest.email}</div>}
          {guest?.phone && <div style={{ fontSize: 12, color: "#6b7280" }}>{guest.phone}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <table style={{ marginLeft: "auto", fontSize: 12 }}>
            <tbody>
              <tr><td style={{ color: "#6b7280", paddingRight: 12 }}>Credit Note #</td><td style={{ fontWeight: 700, fontFamily: "monospace" }}>{note.number}</td></tr>
              <tr><td style={{ color: "#6b7280", paddingRight: 12 }}>Original Invoice</td><td style={{ fontFamily: "monospace" }}>{note.invoiceNumber}</td></tr>
              <tr><td style={{ color: "#6b7280", paddingRight: 12 }}>Date Issued</td><td>{new Date(note.issuedAt).toLocaleString()}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 28, border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", background: "#fef2f2", fontSize: 11, color: "#b91c1c", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
          Reason for credit
        </div>
        <div style={{ padding: 14, fontSize: 13, lineHeight: 1.6 }}>{note.reason}</div>
      </div>

      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
        <div style={{ minWidth: 280, border: "2px solid #b91c1c", borderRadius: 6, padding: 16, background: "#fef2f2" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "#6b7280" }}>Credit amount</span>
            <span style={{ fontWeight: 700, color: "#b91c1c", fontSize: 18 }}>−{fmt(note.amount)}</span>
          </div>
          {note.cancelInvoice && (
            <div style={{ marginTop: 10, padding: "6px 10px", background: "#b91c1c", color: "#fff", fontSize: 10, fontWeight: 700, textAlign: "center", letterSpacing: 1 }}>
              ORIGINAL INVOICE CANCELLED
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 60, fontSize: 10, color: "#9ca3af", textAlign: "center", borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
        This document was generated electronically and is valid without a signature.
      </div>
    </div>
  );
}
