// A4 Registration Card — printable, with guest details + digital signature.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useHotelStore } from "@/store/hotel-store";
import { fetchSignature, type SignatureRecord } from "@/lib/signatures";

export const Route = createFileRoute("/print/registration-card/$reservationId")({
  component: PrintRegistrationCard,
});

function PrintRegistrationCard() {
  const { reservationId } = Route.useParams();
  const reservation = useHotelStore((s) => s.reservations.find((r) => r.id === reservationId));
  const guest = useHotelStore((s) =>
    reservation ? s.guests.find((g) => g.id === reservation.guestId) : undefined,
  );
  const room = useHotelStore((s) =>
    reservation ? s.rooms.find((r) => r.id === reservation.roomId) : undefined,
  );
  const settings = useHotelStore((s) => s.settings);
  const [sig, setSig] = useState<SignatureRecord | null>(null);

  useEffect(() => {
    void fetchSignature(reservationId).then(setSig);
  }, [reservationId]);

  useEffect(() => {
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, []);

  if (!reservation) return <div style={{ padding: 24 }}>Reservation not found.</div>;

  const nights = Math.max(
    1,
    Math.round((new Date(reservation.checkOut).getTime() - new Date(reservation.checkIn).getTime()) / 86400000),
  );

  return (
    <>
      <style>{`
        @media print { @page { size: A4; margin: 14mm; } body { background: #fff !important; } .no-print { display: none !important; } }
        body { background: #f3f4f6; }
        .card { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          color: #111; background: #fff; max-width: 800px; margin: 24px auto; padding: 32px; border: 1px solid #e5e7eb; }
        .card h1 { font-size: 22px; margin: 0 0 4px; }
        .card h2 { font-size: 13px; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12.5px; }
        .row { display: flex; gap: 8px; }
        .row .k { color: #6b7280; min-width: 110px; }
        .row .v { color: #111; font-weight: 500; }
        .terms { font-size: 11px; color: #374151; line-height: 1.55; }
        .sig-block { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: end; }
        .sig-box { border-bottom: 1.5px solid #111; min-height: 80px; padding: 4px 4px 0; }
        .sig-box img { max-height: 76px; }
        .meta { font-size: 10.5px; color: #6b7280; margin-top: 6px; }
        .no-print { padding: 12px; text-align: center; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
        .no-print button { padding: 8px 16px; background: #111; color: #fff; border: 0; border-radius: 6px; cursor: pointer; }
      `}</style>

      <div className="no-print">
        <button onClick={() => window.print()}>🖨 Print Registration Card</button>
      </div>

      <div className="card">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1>{settings.hotelName ?? "Hotel"}</h1>
            {settings.address && <div style={{ fontSize: 11, color: "#6b7280" }}>{settings.address}</div>}
            {settings.contactPhone && <div style={{ fontSize: 11, color: "#6b7280" }}>Tel: {settings.contactPhone}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Registration Card</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {reservation.confirmationNumber ?? "—"}
            </div>
            <div style={{ fontSize: 10.5, color: "#6b7280" }}>{new Date().toLocaleString()}</div>
          </div>
        </div>

        {/* Guest details */}
        <h2>Guest details</h2>
        <div className="grid">
          <div className="row"><span className="k">Name</span><span className="v">{guest?.name ?? "—"}</span></div>
          <div className="row"><span className="k">Nationality</span><span className="v">{guest?.nationality ?? guest?.country ?? "—"}</span></div>
          <div className="row"><span className="k">Email</span><span className="v">{guest?.email ?? "—"}</span></div>
          <div className="row"><span className="k">Phone</span><span className="v">{guest?.phone ?? "—"}</span></div>
          <div className="row"><span className="k">ID type</span><span className="v">{guest?.idType ?? "—"}</span></div>
          <div className="row"><span className="k">ID number</span><span className="v">{guest?.idNumber ?? "—"}</span></div>
          <div className="row"><span className="k">Address</span><span className="v">{guest?.address ?? "—"}</span></div>
          <div className="row"><span className="k">City</span><span className="v">{guest?.city ?? "—"}</span></div>
        </div>

        {/* Stay details */}
        <h2>Stay details</h2>
        <div className="grid">
          <div className="row"><span className="k">Room</span><span className="v">{room ? `${room.number} (${room.type})` : "—"}</span></div>
          <div className="row"><span className="k">Nights</span><span className="v">{nights}</span></div>
          <div className="row"><span className="k">Check-in</span><span className="v">{reservation.checkIn}</span></div>
          <div className="row"><span className="k">Check-out</span><span className="v">{reservation.checkOut}</span></div>
          <div className="row"><span className="k">Rate / night</span><span className="v">{settings.currency} {(reservation.totalAmount / Math.max(nights, 1)).toFixed(2)}</span></div>
          <div className="row"><span className="k">Total</span><span className="v">{settings.currency} {reservation.totalAmount.toFixed(2)}</span></div>
        </div>

        {/* Terms */}
        <h2>Terms &amp; conditions</h2>
        <div className="terms">
          The guest acknowledges and agrees to the hotel rules and house policies, including check-in/check-out times,
          smoking and pet policies, settlement of all charges incurred during the stay (including room, taxes,
          food &amp; beverage, telephone, mini-bar, and any incidentals), and responsibility for any damage caused to
          the room or hotel property. The guest authorises the hotel to charge the provided payment method for any
          outstanding balance at or after check-out.
        </div>

        {/* Signatures */}
        <div className="sig-block">
          <div>
            <div className="sig-box">
              {sig ? (
                <img src={sig.dataUrl} alt="Guest signature" />
              ) : (
                <div style={{ fontSize: 11, color: "#9ca3af", paddingTop: 28, textAlign: "center" }}>
                  (No digital signature captured)
                </div>
              )}
            </div>
            <div className="meta">
              Guest signature{sig?.signedAt ? ` · ${new Date(sig.signedAt).toLocaleString()}` : ""}
            </div>
          </div>
          <div>
            <div className="sig-box" />
            <div className="meta">Hotel representative</div>
          </div>
        </div>
      </div>
    </>
  );
}
