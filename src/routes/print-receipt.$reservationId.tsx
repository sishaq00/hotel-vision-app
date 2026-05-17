// 80mm thermal receipt printer layout — narrow column, monospace, no color.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useHotelStore } from "@/store/hotel-store";
import { recordPrint } from "@/lib/print-log";

export const Route = createFileRoute("/print-receipt/$reservationId")({
  component: PrintReceipt,
});

function PrintReceipt() {
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
    if (reservation?.invoice) recordPrint(reservationId, "receipt-80mm");
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

  if (!reservation || !reservation.invoice) {
    return <div style={{ padding: 24, fontSize: 12 }}>Not found.</div>;
  }

  const inv = reservation.invoice;
  const fmt = (n: number) => n.toFixed(2);
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const balance = inv.total - paid;
  const line = "--------------------------------";

  return (
    <>
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 3mm; }
          body { background: #fff !important; margin: 0; }
          .no-print { display: none !important; }
        }
        body { background: #f3f4f6; }
        .receipt {
          font-family: 'Courier New', ui-monospace, monospace;
          color: #000;
          background: #fff;
          width: 74mm;
          padding: 4mm 3mm;
          margin: 12px auto;
          font-size: 11px;
          line-height: 1.45;
          white-space: pre-wrap;
        }
        .receipt .center { text-align: center; }
        .receipt .right { text-align: right; }
        .receipt .row { display: flex; justify-content: space-between; gap: 6px; }
        .receipt .bold { font-weight: 700; }
        .receipt .lg { font-size: 13px; }
        .receipt .xl { font-size: 15px; font-weight: 700; }
        .receipt hr { border: 0; border-top: 1px dashed #000; margin: 4px 0; }
      `}</style>

      <div className="no-print" style={{ padding: 12, textAlign: "center", display: "flex", gap: 8, justifyContent: "center", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
        <button onClick={() => window.print()} style={{ padding: "8px 16px", background: "#1a1a1a", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>🖨 Print 80mm Receipt</button>
        <Link
          to="/print-invoice/$reservationId"
          params={{ reservationId }}
          style={{ padding: "8px 16px", background: "#fff", color: "#1a1a1a", border: "1px solid #1a1a1a", borderRadius: 6, fontSize: 13, textDecoration: "none" }}
        >📄 Full A4 Invoice</Link>
      </div>

      <div className="receipt">
        <div className="center bold lg">{settings.hotelName}</div>
        {settings.address && <div className="center">{settings.address}</div>}
        {settings.contactPhone && <div className="center">Tel: {settings.contactPhone}</div>}
        {settings.taxId && <div className="center">Tax ID: {settings.taxId}</div>}
        <hr />
        <div className="center bold">INVOICE</div>
        <div className="row"><span>No:</span><span className="bold">{inv.invoiceNumber}</span></div>
        <div className="row"><span>Date:</span><span>{new Date(inv.issuedAt).toLocaleString()}</span></div>
        <hr />
        <div><span className="bold">Guest:</span> {guest?.name ?? "—"}</div>
        {guest?.phone && <div>Phone: {guest.phone}</div>}
        <div><span className="bold">Room:</span> {room?.number ?? "—"} ({room?.type ?? ""})</div>
        <div>In: {new Date(reservation.checkIn).toLocaleDateString()}</div>
        <div>Out: {new Date(reservation.checkOut).toLocaleDateString()}</div>
        <div>Nights: {inv.nights}</div>
        <hr />
        <div className="row bold"><span>Item</span><span>Amount</span></div>
        {line}
        <div className="row">
          <span>Room x{inv.nights} @ {fmt(inv.ratePerNight)}</span>
          <span>{fmt(inv.subtotal)}</span>
        </div>
        <hr />
        <div className="row"><span>Subtotal</span><span>{fmt(inv.subtotal)}</span></div>
        {inv.taxRate > 0 && (
          <div className="row"><span>VAT {(inv.taxRate * 100).toFixed(0)}%</span><span>{fmt(inv.taxAmount)}</span></div>
        )}
        {inv.serviceFeeRate > 0 && (
          <div className="row"><span>Service {(inv.serviceFeeRate * 100).toFixed(0)}%</span><span>{fmt(inv.serviceFeeAmount)}</span></div>
        )}
        <hr />
        <div className="row xl"><span>TOTAL</span><span>{inv.currency} {fmt(inv.total)}</span></div>
        {paid > 0 && (
          <>
            <hr />
            <div className="bold">Payments:</div>
            {payments.map((p) => (
              <div key={p.id} className="row">
                <span style={{ textTransform: "capitalize" }}>{p.method}</span>
                <span>{fmt(p.amount)}</span>
              </div>
            ))}
            <div className="row bold"><span>Total Paid</span><span>{fmt(paid)}</span></div>
            <div className="row bold"><span>{balance <= 0.01 ? "Change" : "Balance"}</span><span>{fmt(Math.abs(balance))}</span></div>
          </>
        )}
        <hr />
        {reservation.notes && (
          <>
            <div className="bold">Notes:</div>
            <div>{reservation.notes}</div>
            <hr />
          </>
        )}
        <div className="center">
          {settings.invoiceFooter || "Thank you for your stay!"}
        </div>
        <div className="center" style={{ marginTop: 6, fontSize: 9 }}>
          REF {inv.invoiceNumber}
        </div>
        <div style={{ height: 24 }} />
      </div>
    </>
  );
}
