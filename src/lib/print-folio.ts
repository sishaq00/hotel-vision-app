// Open a printable folio (guest statement) in a new window.
import type { Guest, Reservation, Payment, ProductSale, Room } from "@/store/hotel-store";

type FolioInput = {
  guest: Guest;
  reservations: Reservation[];
  payments: Payment[];
  sales: ProductSale[];
  rooms: Room[];
  currency: string;
  hotelName?: string;
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );

export function printGuestFolio({
  guest,
  reservations,
  payments,
  sales,
  rooms,
  currency,
  hotelName = "Hotel",
}: FolioInput) {
  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`;
  const today = new Date().toLocaleString();

  const resRows = reservations
    .map((r) => {
      const rm = rooms.find((x) => x.id === r.roomId);
      return `<tr>
        <td>${esc(rm ? `Room ${rm.number}` : "—")}</td>
        <td>${esc(r.checkIn)}</td>
        <td>${esc(r.checkOut)}</td>
        <td>${esc(r.status)}</td>
        <td class="r">${fmt(r.totalAmount)}</td>
      </tr>`;
    })
    .join("");

  const payRows = payments
    .map(
      (p) => `<tr>
        <td>${esc(p.date)}</td>
        <td>${esc(p.method)}</td>
        <td>${esc(p.status)}</td>
        <td class="r">${fmt(p.amount)}</td>
      </tr>`,
    )
    .join("");

  const saleRows = sales
    .map(
      (s) => `<tr>
        <td>${esc(new Date(s.soldAt).toLocaleDateString())}</td>
        <td>${esc(s.productName)} <span class="muted">(${esc(s.category)})</span></td>
        <td class="r">${s.quantity}</td>
        <td class="r">${fmt(s.unitPrice)}</td>
        <td class="r">${fmt(s.total)}</td>
      </tr>`,
    )
    .join("");

  const totalCharges = reservations.reduce((s, r) => s + r.totalAmount, 0)
    + sales.reduce((s, x) => s + x.total, 0);
  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);
  const balance = totalCharges - totalPaid;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"/>
<title>Folio — ${esc(guest.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111; margin: 32px; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  h2 { margin: 24px 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 12px; }
  .muted { color: #666; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #eee; text-align: left; }
  th { background: #f7f7f7; font-weight: 600; }
  .r { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { margin-top: 16px; width: 280px; margin-left: auto; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .grand { border-top: 2px solid #111; margin-top: 6px; padding-top: 8px; font-weight: 700; font-size: 15px; }
  .balance-pos { color: #b91c1c; }
  .balance-zero { color: #047857; }
  @media print { body { margin: 16mm; } button { display: none; } }
</style>
</head><body>
  <div class="header">
    <div>
      <h1>${esc(hotelName)}</h1>
      <div class="muted">Guest Folio · Generated ${esc(today)}</div>
    </div>
    <div style="text-align:right">
      <div style="font-weight:600">${esc(guest.name)}</div>
      <div class="muted">${esc(guest.email ?? "")}</div>
      <div class="muted">${esc(guest.phone ?? "")}</div>
    </div>
  </div>

  <h2>Reservations</h2>
  ${reservations.length ? `<table>
    <thead><tr><th>Room</th><th>Check-in</th><th>Check-out</th><th>Status</th><th class="r">Amount</th></tr></thead>
    <tbody>${resRows}</tbody>
  </table>` : `<p class="muted">No reservations.</p>`}

  <h2>Purchases</h2>
  ${sales.length ? `<table>
    <thead><tr><th>Date</th><th>Item</th><th class="r">Qty</th><th class="r">Unit</th><th class="r">Total</th></tr></thead>
    <tbody>${saleRows}</tbody>
  </table>` : `<p class="muted">No purchases.</p>`}

  <h2>Payments</h2>
  ${payments.length ? `<table>
    <thead><tr><th>Date</th><th>Method</th><th>Status</th><th class="r">Amount</th></tr></thead>
    <tbody>${payRows}</tbody>
  </table>` : `<p class="muted">No payments.</p>`}

  <div class="totals">
    <div><span>Total charges</span><span>${fmt(totalCharges)}</span></div>
    <div><span>Total paid</span><span>${fmt(totalPaid)}</span></div>
    <div class="grand ${balance > 0.001 ? "balance-pos" : "balance-zero"}">
      <span>Balance due</span><span>${fmt(Math.max(0, balance))}</span>
    </div>
  </div>

  <div style="margin-top:32px;text-align:center" class="muted">
    Thank you for staying with us.
  </div>
  <script>window.onload = () => setTimeout(() => window.print(), 250);</script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
