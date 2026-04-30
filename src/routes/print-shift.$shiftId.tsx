// Print-friendly shift report (A4) with signature lines.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useHotelStore } from "@/store/hotel-store";
import { buildShiftReport, formatDuration } from "@/lib/shift-report";

export const Route = createFileRoute("/print-shift/$shiftId")({
  head: () => ({
    meta: [
      { title: "Shift Report — Print" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrintShiftPage,
});

function PrintShiftPage() {
  const { shiftId } = Route.useParams();
  const settings = useHotelStore((s) => s.settings);
  const report = useMemo(() => buildShiftReport(shiftId), [shiftId]);

  useEffect(() => {
    if (report) {
      const t = setTimeout(() => window.print(), 350);
      return () => clearTimeout(t);
    }
  }, [report]);

  if (!report) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Shift not found.</div>;
  }

  const cur = settings.currency;
  const fmt = (n: number) => `${cur} ${n.toFixed(2)}`;
  const t = (iso: string) => new Date(iso).toLocaleString();
  const tt = (iso: string) => new Date(iso).toLocaleTimeString();

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-8 text-black print:p-0" style={{ fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: white; }
          .no-print { display: none !important; }
        }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th, td { border-bottom: 1px solid #ddd; padding: 4px 6px; text-align: left; vertical-align: top; }
        th { background: #f3f4f6; font-size: 9px; text-transform: uppercase; }
        h2 { font-size: 12px; margin: 14px 0 4px; padding-bottom: 2px; border-bottom: 2px solid #111; }
        .right { text-align: right; }
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-black pb-3">
        <div className="flex items-start gap-3">
          {settings.logoDataUrl && (
            <img src={settings.logoDataUrl} alt="" className="h-12 w-12 object-contain" />
          )}
          <div>
            <div className="text-xl font-bold">{settings.hotelName}</div>
            <div className="text-xs text-gray-600">SHIFT REPORT</div>
          </div>
        </div>
        <div className="text-right text-xs">
          <div><strong>Employee:</strong> {report.shift.userName}</div>
          <div><strong>Start:</strong> {t(report.shift.startedAt)}</div>
          <div><strong>End:</strong> {t(report.endedAtIso)}</div>
          <div><strong>Duration:</strong> {formatDuration(report.durationMinutes)}</div>
        </div>
      </div>

      {/* Financial summary */}
      <h2>Financial Summary</h2>
      <table>
        <tbody>
          <tr><td>Opening cash</td><td className="right">{fmt(report.shift.openingCash)}</td></tr>
          <tr><td>Cash payments collected</td><td className="right">{fmt(report.totals.paymentsTotal)}</td></tr>
          <tr><td>Product sales</td><td className="right">{fmt(report.totals.productSalesTotal)}</td></tr>
          <tr><td>Refunds issued</td><td className="right">−{fmt(report.totals.refundsTotal)}</td></tr>
          <tr style={{ fontWeight: 700, borderTop: "2px solid #111" }}>
            <td>Expected closing cash</td><td className="right">{fmt(report.expectedClosingCash)}</td>
          </tr>
          <tr><td>Stay-change net amount</td><td className="right">{fmt(report.totals.extensionAmount)} ({report.totals.nightsExtended} nights)</td></tr>
          <tr><td>Total operations</td><td className="right">{report.totals.operationsCount}</td></tr>
        </tbody>
      </table>

      {/* Check-ins */}
      {report.checkIns.length > 0 && (<>
        <h2>Check-ins ({report.checkIns.length})</h2>
        <table>
          <thead><tr><th style={{ width: 60 }}>Time</th><th>Detail</th></tr></thead>
          <tbody>{report.checkIns.map((e) => (
            <tr key={e.id}><td>{tt(e.timestamp)}</td><td>{e.description}</td></tr>
          ))}</tbody>
        </table>
      </>)}

      {/* Check-outs */}
      {report.checkOuts.length > 0 && (<>
        <h2>Check-outs ({report.checkOuts.length})</h2>
        <table>
          <thead><tr><th style={{ width: 60 }}>Time</th><th>Detail</th><th className="right" style={{ width: 90 }}>Amount</th></tr></thead>
          <tbody>{report.checkOuts.map((e) => (
            <tr key={e.id}>
              <td>{tt(e.timestamp)}</td>
              <td>{e.description}</td>
              <td className="right">{fmt(e.amount ?? 0)}</td>
            </tr>
          ))}</tbody>
        </table>
      </>)}

      {/* Extensions */}
      {report.extensions.length > 0 && (<>
        <h2>Stay extensions / shortenings ({report.extensions.length})</h2>
        <table>
          <thead><tr><th style={{ width: 60 }}>Time</th><th>Detail</th><th>Change</th><th className="right" style={{ width: 90 }}>Δ Amount</th></tr></thead>
          <tbody>{report.extensions.map((e) => {
            const d = (e.details ?? {}) as { nightsDelta?: number; oldCheckOut?: string; newCheckOut?: string };
            return (
              <tr key={e.id}>
                <td>{tt(e.timestamp)}</td>
                <td>{e.description}</td>
                <td>{d.oldCheckOut} → {d.newCheckOut} ({d.nightsDelta} n)</td>
                <td className="right">{fmt(e.amount ?? 0)}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </>)}

      {/* Product sales */}
      {report.productSales.length > 0 && (<>
        <h2>Product sales ({report.productSales.length})</h2>
        <table>
          <thead>
            <tr>
              <th style={{ width: 60 }}>Time</th>
              <th>Product</th>
              <th style={{ width: 30 }}>Qty</th>
              <th>Room</th>
              <th className="right" style={{ width: 70 }}>Unit</th>
              <th className="right" style={{ width: 80 }}>Total</th>
            </tr>
          </thead>
          <tbody>{report.productSales.map((p) => (
            <tr key={p.id}>
              <td>{tt(p.soldAt)}</td>
              <td>{p.productName}</td>
              <td>{p.quantity}</td>
              <td>{p.roomNumber ? `Room ${p.roomNumber}` : "—"}</td>
              <td className="right">{fmt(p.unitPrice)}</td>
              <td className="right">{fmt(p.total)}</td>
            </tr>
          ))}</tbody>
        </table>
      </>)}

      {/* Cash payments */}
      {report.cashPayments.length > 0 && (<>
        <h2>Cash payments ({report.cashPayments.length})</h2>
        <table>
          <thead><tr><th style={{ width: 60 }}>Time</th><th>Detail</th><th className="right" style={{ width: 90 }}>Amount</th></tr></thead>
          <tbody>{report.cashPayments.map((e) => (
            <tr key={e.id}>
              <td>{tt(e.timestamp)}</td>
              <td>{e.description}</td>
              <td className="right">{fmt(e.amount ?? 0)}</td>
            </tr>
          ))}</tbody>
        </table>
      </>)}

      {/* New reservations */}
      {report.newReservations.length > 0 && (<>
        <h2>New reservations ({report.newReservations.length})</h2>
        <table>
          <thead><tr><th style={{ width: 60 }}>Time</th><th>Detail</th><th className="right" style={{ width: 90 }}>Total</th></tr></thead>
          <tbody>{report.newReservations.map((e) => (
            <tr key={e.id}>
              <td>{tt(e.timestamp)}</td>
              <td>{e.description}</td>
              <td className="right">{fmt(e.amount ?? 0)}</td>
            </tr>
          ))}</tbody>
        </table>
      </>)}

      {report.cancellations.length > 0 && (<>
        <h2>Cancellations ({report.cancellations.length})</h2>
        <table>
          <thead><tr><th style={{ width: 60 }}>Time</th><th>Detail</th></tr></thead>
          <tbody>{report.cancellations.map((e) => (
            <tr key={e.id}><td>{tt(e.timestamp)}</td><td>{e.description}</td></tr>
          ))}</tbody>
        </table>
      </>)}

      {/* Cash handover line + signatures */}
      <div style={{ marginTop: 32, borderTop: "1px dashed #999", paddingTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, fontSize: 11 }}>
          <div>
            <div style={{ marginBottom: 36 }}><strong>Cash handed over:</strong> {cur} ____________________</div>
            <div style={{ borderTop: "1px solid #111", paddingTop: 4, width: "85%" }}>
              Employee signature ({report.shift.userName})
            </div>
          </div>
          <div>
            <div style={{ marginBottom: 36 }}><strong>Date / time received:</strong> ____________________</div>
            <div style={{ borderTop: "1px solid #111", paddingTop: 4, width: "85%" }}>
              Received by (signature)
            </div>
          </div>
        </div>
      </div>

      <div className="no-print mt-6 text-center">
        <button onClick={() => window.print()} className="rounded bg-black px-4 py-2 text-sm text-white">
          Print
        </button>
      </div>
    </div>
  );
}
