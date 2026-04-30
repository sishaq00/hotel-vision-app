// Browser-printable invoice (B5/A5 friendly). Open from a reservation's "Print" action.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useHotelStore } from "@/store/hotel-store";

export const Route = createFileRoute("/print-invoice/$reservationId")({
  component: PrintInvoice,
});

function PrintInvoice() {
  const { reservationId } = Route.useParams();
  const reservation = useHotelStore((s) =>
    s.reservations.find((r) => r.id === reservationId)
  );
  const guest = useHotelStore((s) =>
    reservation ? s.guests.find((g) => g.id === reservation.guestId) : undefined
  );
  const room = useHotelStore((s) =>
    reservation ? s.rooms.find((r) => r.id === reservation.roomId) : undefined
  );
  const settings = useHotelStore((s) => s.settings);

  useEffect(() => {
    // auto-trigger print after render
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  if (!reservation || !reservation.invoice) {
    return (
      <div className="p-12 text-center text-sm">
        Reservation or invoice not found.
      </div>
    );
  }

  const inv = reservation.invoice;
  const fmt = (n: number) =>
    `${inv.currency} ${n.toFixed(2)}`;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A5; margin: 12mm; }
          body { background: #fff !important; }
          .no-print { display: none !important; }
        }
        .invoice-print {
          font-family: ui-sans-serif, system-ui, sans-serif;
          color: #111;
          background: #fff;
          padding: 24px;
          max-width: 720px;
          margin: 0 auto;
        }
        .invoice-print h1 { font-size: 20px; margin: 0 0 4px 0; }
        .invoice-print .muted { color: #666; font-size: 12px; }
        .invoice-print table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .invoice-print th, .invoice-print td { border-bottom: 1px solid #eee; padding: 8px; text-align: left; font-size: 12px; }
        .invoice-print th { background: #fafafa; }
        .invoice-print .totals { margin-top: 12px; width: 100%; }
        .invoice-print .totals td { border: none; padding: 4px 8px; }
        .invoice-print .totals .label { text-align: right; color: #666; }
        .invoice-print .totals .value { text-align: right; font-variant-numeric: tabular-nums; }
        .invoice-print .grand { font-weight: 700; font-size: 14px; border-top: 2px solid #111; }
      `}</style>

      <div className="no-print" style={{ padding: 12, textAlign: "center" }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: "8px 16px",
            background: "#111",
            color: "#fff",
            border: 0,
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Print Invoice
        </button>
      </div>

      <div className="invoice-print">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {settings.logoDataUrl && (
              <img src={settings.logoDataUrl} alt="" style={{ height: 48, marginBottom: 8 }} />
            )}
            <h1>{settings.hotelName}</h1>
            <div className="muted">{settings.hotelCode}</div>
            {settings.address && <div className="muted">{settings.address}</div>}
            {settings.phone && <div className="muted">{settings.phone}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <h1>INVOICE</h1>
            <div className="muted">No. {inv.invoiceNumber}</div>
            <div className="muted">
              Issued: {new Date(inv.issuedAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Bill to */}
        <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
          <div style={{ flex: 1 }}>
            <div className="muted">Bill To</div>
            <div style={{ fontWeight: 600 }}>{guest?.fullName ?? "—"}</div>
            <div className="muted">{guest?.email ?? ""}</div>
            <div className="muted">{guest?.phone ?? ""}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="muted">Stay</div>
            <div>Room: <strong>{room?.number ?? "—"}</strong></div>
            <div>Check-in: {new Date(reservation.checkIn).toLocaleDateString()}</div>
            <div>Check-out: {new Date(reservation.checkOut).toLocaleDateString()}</div>
            <div>Nights: {inv.nights}</div>
          </div>
        </div>

        {/* Lines */}
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ textAlign: "right" }}>Qty</th>
              <th style={{ textAlign: "right" }}>Rate</th>
              <th style={{ textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Room — {room?.type ?? ""} #{room?.number}</td>
              <td style={{ textAlign: "right" }}>{inv.nights}</td>
              <td style={{ textAlign: "right" }}>{fmt(inv.ratePerNight)}</td>
              <td style={{ textAlign: "right" }}>{fmt(inv.subtotal)}</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <table className="totals">
          <tbody>
            <tr><td className="label">Subtotal</td><td className="value">{fmt(inv.subtotal)}</td></tr>
            <tr><td className="label">VAT ({(inv.taxRate * 100).toFixed(1)}%)</td><td className="value">{fmt(inv.taxAmount)}</td></tr>
            <tr><td className="label">Service ({(inv.serviceFeeRate * 100).toFixed(1)}%)</td><td className="value">{fmt(inv.serviceFeeAmount)}</td></tr>
            <tr className="grand"><td className="label">TOTAL</td><td className="value">{fmt(inv.total)}</td></tr>
          </tbody>
        </table>

        {settings.invoiceFooter && (
          <p className="muted" style={{ marginTop: 24, whiteSpace: "pre-wrap" }}>
            {settings.invoiceFooter}
          </p>
        )}
      </div>
    </>
  );
}
