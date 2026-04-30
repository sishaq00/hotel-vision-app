// Browser-printable A4 invoice — professional layout with QR-like ref, watermark for paid status.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useHotelStore } from "@/store/hotel-store";

export const Route = createFileRoute("/print-invoice/$reservationId")({
  component: PrintInvoice,
});

function PrintInvoice() {
  const { reservationId } = Route.useParams();
  const reservation = useHotelStore((s) =>
    s.reservations.find((r) => r.id === reservationId),
  );
  const guest = useHotelStore((s) =>
    reservation ? s.guests.find((g) => g.id === reservation.guestId) : undefined,
  );
  const room = useHotelStore((s) =>
    reservation ? s.rooms.find((r) => r.id === reservation.roomId) : undefined,
  );
  const payments = useHotelStore((s) =>
    s.payments.filter((p) => p.reservationId === reservationId),
  );
  const settings = useHotelStore((s) => s.settings);

  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  if (!reservation || !reservation.invoice) {
    return (
      <div style={{ padding: 48, textAlign: "center", fontSize: 14 }}>
        Reservation or invoice not found.
      </div>
    );
  }

  const inv = reservation.invoice;
  const fmt = (n: number) => `${inv.currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const balance = inv.total - paid;
  const isPaid = balance <= 0.01;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        .inv {
          font-family: 'Helvetica Neue', ui-sans-serif, system-ui, sans-serif;
          color: #1a1a1a;
          background: #fff;
          padding: 28px 32px;
          max-width: 820px;
          margin: 0 auto;
          position: relative;
        }
        .inv .watermark {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%) rotate(-22deg);
          font-size: 140px;
          font-weight: 900;
          color: rgba(34,197,94,0.08);
          letter-spacing: 12px;
          pointer-events: none;
          z-index: 0;
        }
        .inv .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 3px solid #1a1a1a; }
        .inv h1.brand { font-size: 22px; margin: 0; font-weight: 800; letter-spacing: -0.3px; }
        .inv .muted { color: #666; font-size: 11px; line-height: 1.5; }
        .inv .doc-title { font-size: 28px; font-weight: 800; margin: 0; letter-spacing: 1px; color: #1a1a1a; }
        .inv .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; }
        .inv .badge-paid { background: #dcfce7; color: #166534; }
        .inv .badge-due { background: #fef3c7; color: #92400e; }
        .inv .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 18px; padding: 14px; background: #f9fafb; border-radius: 6px; }
        .inv .meta-grid h4 { margin: 0 0 6px 0; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
        .inv table.lines { width: 100%; border-collapse: collapse; margin-top: 18px; }
        .inv table.lines th { background: #1a1a1a; color: #fff; padding: 9px 10px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
        .inv table.lines td { padding: 10px; font-size: 12px; border-bottom: 1px solid #e5e7eb; }
        .inv table.lines tr:last-child td { border-bottom: 2px solid #1a1a1a; }
        .inv .totals { margin-top: 14px; margin-left: auto; width: 320px; }
        .inv .totals tr td { padding: 5px 8px; font-size: 12px; }
        .inv .totals .label { text-align: right; color: #6b7280; }
        .inv .totals .value { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; min-width: 110px; }
        .inv .totals .grand td { font-weight: 800; font-size: 15px; border-top: 2px solid #1a1a1a; padding-top: 8px; padding-bottom: 8px; }
        .inv .totals .balance td { font-weight: 700; font-size: 13px; color: ${balance > 0 ? "#b91c1c" : "#166534"}; }
        .inv .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; }
        .inv .ref { font-family: ui-monospace, monospace; font-size: 10px; color: #9ca3af; margin-top: 8px; }
      `}</style>

      <div className="no-print" style={{ padding: 12, textAlign: "center", display: "flex", gap: 8, justifyContent: "center", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
        <button
          onClick={() => window.print()}
          style={{ padding: "8px 18px", background: "#1a1a1a", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
        >
          🖨 Print Invoice
        </button>
        <Link
          to="/print-receipt/$reservationId"
          params={{ reservationId }}
          style={{ padding: "8px 18px", background: "#fff", color: "#1a1a1a", border: "1px solid #1a1a1a", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
        >
          📄 80mm Receipt
        </Link>
      </div>

      <div className="inv">
        {isPaid && <div className="watermark">PAID</div>}

        <div className="header" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            {settings.logoDataUrl ? (
              <img src={settings.logoDataUrl} alt="" style={{ height: 56, width: 56, objectFit: "contain" }} />
            ) : (
              <div style={{ height: 56, width: 56, background: "#1a1a1a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, borderRadius: 6 }}>
                {(settings.hotelCode || "NXR").slice(0, 3)}
              </div>
            )}
            <div>
              <h1 className="brand">{settings.hotelName}</h1>
              <div className="muted">
                {settings.address && <div>{settings.address}</div>}
                {settings.contactPhone && <div>Tel: {settings.contactPhone}</div>}
                {settings.contactEmail && <div>{settings.contactEmail}</div>}
                {settings.taxId && <div>Tax ID: {settings.taxId}</div>}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p className="doc-title">INVOICE</p>
            <div style={{ marginTop: 6 }}>
              <span className={`badge ${isPaid ? "badge-paid" : "badge-due"}`}>
                {isPaid ? "PAID" : "BALANCE DUE"}
              </span>
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              <div><strong>No.</strong> {inv.invoiceNumber}</div>
              <div><strong>Date:</strong> {new Date(inv.issuedAt).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <div className="meta-grid" style={{ position: "relative", zIndex: 1 }}>
          <div>
            <h4>Bill To</h4>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{guest?.name ?? "—"}</div>
            {guest?.email && <div className="muted">{guest.email}</div>}
            {guest?.phone && <div className="muted">{guest.phone}</div>}
            {guest?.country && <div className="muted">{guest.country}</div>}
          </div>
          <div>
            <h4>Stay Details</h4>
            <div style={{ fontSize: 12 }}>
              <div><strong>Room:</strong> {room?.number ?? "—"} ({room?.type ?? ""})</div>
              <div><strong>Check-in:</strong> {new Date(reservation.checkIn).toLocaleDateString()}</div>
              <div><strong>Check-out:</strong> {new Date(reservation.checkOut).toLocaleDateString()}</div>
              <div><strong>Nights:</strong> {inv.nights}</div>
            </div>
          </div>
        </div>

        <table className="lines" style={{ position: "relative", zIndex: 1 }}>
          <thead>
            <tr>
              <th style={{ width: "50%" }}>Description</th>
              <th style={{ textAlign: "right", width: "12%" }}>Qty</th>
              <th style={{ textAlign: "right", width: "19%" }}>Rate</th>
              <th style={{ textAlign: "right", width: "19%" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Room Charge</strong>
                <div className="muted">{room?.type ?? ""} · Room #{room?.number ?? ""}</div>
              </td>
              <td style={{ textAlign: "right" }}>{inv.nights} {inv.nights === 1 ? "night" : "nights"}</td>
              <td style={{ textAlign: "right" }}>{fmt(inv.ratePerNight)}</td>
              <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt(inv.subtotal)}</td>
            </tr>
          </tbody>
        </table>

        <table className="totals" style={{ position: "relative", zIndex: 1 }}>
          <tbody>
            <tr><td className="label">Subtotal</td><td className="value">{fmt(inv.subtotal)}</td></tr>
            {inv.taxRate > 0 && (
              <tr><td className="label">VAT ({(inv.taxRate * 100).toFixed(1)}%)</td><td className="value">{fmt(inv.taxAmount)}</td></tr>
            )}
            {inv.serviceFeeRate > 0 && (
              <tr><td className="label">Service ({(inv.serviceFeeRate * 100).toFixed(1)}%)</td><td className="value">{fmt(inv.serviceFeeAmount)}</td></tr>
            )}
            <tr className="grand"><td className="label">TOTAL</td><td className="value">{fmt(inv.total)}</td></tr>
            {paid > 0 && (
              <tr><td className="label">Paid</td><td className="value">− {fmt(paid)}</td></tr>
            )}
            <tr className="balance"><td className="label">{isPaid ? "Status" : "Balance Due"}</td><td className="value">{isPaid ? "PAID IN FULL" : fmt(balance)}</td></tr>
          </tbody>
        </table>

        {payments.length > 0 && (
          <div style={{ marginTop: 22, position: "relative", zIndex: 1 }}>
            <h4 style={{ margin: "0 0 6px 0", fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Payments Received</h4>
            <table className="lines">
              <thead>
                <tr><th>Date</th><th>Method</th><th style={{ textAlign: "right" }}>Amount</th></tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.date).toLocaleString()}</td>
                    <td style={{ textTransform: "capitalize" }}>{p.method}</td>
                    <td style={{ textAlign: "right" }}>{fmt(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="footer">
          {settings.invoiceFooter ? (
            <p className="muted" style={{ whiteSpace: "pre-wrap", margin: 0 }}>{settings.invoiceFooter}</p>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Thank you for your stay. We hope to welcome you back soon.</p>
          )}
          <div className="ref">REF: {inv.invoiceNumber} · {reservation.id.slice(0, 8).toUpperCase()}</div>
        </div>
      </div>
    </>
  );
}
