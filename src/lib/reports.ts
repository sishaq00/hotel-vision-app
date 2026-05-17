import type { HotelSettings, Reservation, Room, Guest, Payment } from "@/store/hotel-store";

export type ReportFormat = "csv" | "json";

export interface ReportContext {
  rooms: Room[];
  reservations: Reservation[];
  guests: Guest[];
  payments: Payment[];
  settings: HotelSettings;
}

export interface ReportDefinition {
  key: string;
  name: string;
  category: string;
  description: string;
  run: (ctx: ReportContext) => Record<string, unknown>[];
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const isoDate = (s: string) => s.slice(0, 10);
const guestName = (ctx: ReportContext, id: string) =>
  ctx.guests.find((g) => g.id === id)?.name ?? "—";
const roomNumber = (ctx: ReportContext, id: string) =>
  ctx.rooms.find((r) => r.id === id)?.number ?? "—";

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  // ---------- Downtime / Front Desk ----------
  {
    key: "arrivals",
    name: "Arrivals",
    category: "Front Desk",
    description: "Today's expected arrivals.",
    run: (ctx) => {
      const t = todayStr();
      return ctx.reservations
        .filter((r) => isoDate(r.checkIn) === t && r.status === "confirmed")
        .map((r) => ({
          confirmation: r.confirmationNumber ?? r.id.slice(0, 8),
          guest: guestName(ctx, r.guestId),
          room: roomNumber(ctx, r.roomId),
          checkIn: r.checkIn, checkOut: r.checkOut,
          source: r.source ?? "—",
          total: r.totalAmount,
        }));
    },
  },
  {
    key: "departures",
    name: "Departures List",
    category: "Front Desk",
    description: "Today's expected departures.",
    run: (ctx) => {
      const t = todayStr();
      return ctx.reservations
        .filter((r) => isoDate(r.checkOut) === t && r.status === "checked-in")
        .map((r) => ({
          guest: guestName(ctx, r.guestId),
          room: roomNumber(ctx, r.roomId),
          checkIn: r.checkIn, checkOut: r.checkOut,
          total: r.totalAmount,
        }));
    },
  },
  {
    key: "in-house-balances",
    name: "In House Guest Balances",
    category: "Front Desk",
    description: "Currently checked-in guests with running balance.",
    run: (ctx) =>
      ctx.reservations
        .filter((r) => r.status === "checked-in")
        .map((r) => ({
          guest: guestName(ctx, r.guestId),
          room: roomNumber(ctx, r.roomId),
          checkIn: r.checkIn, checkOut: r.checkOut,
          balance: r.totalAmount,
        })),
  },
  {
    key: "room-availability",
    name: "Room Availability",
    category: "Front Desk",
    description: "Snapshot of all rooms by status.",
    run: (ctx) =>
      ctx.rooms.filter((r) => !r.archived).map((r) => ({
        number: r.number, type: r.type, floor: r.floor,
        status: r.status,
        housekeeping: r.housekeepingStatus ?? "—",
        price: r.price,
      })),
  },
  {
    key: "todays-guests",
    name: "Today's Guests",
    category: "Front Desk",
    description: "All guests in-house or arriving today.",
    run: (ctx) => {
      const t = todayStr();
      return ctx.reservations
        .filter((r) =>
          r.status === "checked-in" ||
          (r.status === "confirmed" && isoDate(r.checkIn) === t))
        .map((r) => ({
          guest: guestName(ctx, r.guestId),
          room: roomNumber(ctx, r.roomId),
          status: r.status,
          checkIn: r.checkIn, checkOut: r.checkOut,
        }));
    },
  },

  // ---------- Guest ----------
  {
    key: "do-not-rent",
    name: "Do Not Rent",
    category: "Guest",
    description: "Guests flagged as do-not-rent.",
    run: (ctx) => ctx.guests.filter((g) => g.doNotRent).map((g) => ({
      name: g.name, phone: g.phone, country: g.country, notes: g.notes ?? "",
    })),
  },
  {
    key: "top-guest",
    name: "Top Guest",
    category: "Guest",
    description: "Guests ranked by total spend.",
    run: (ctx) => {
      const totals = new Map<string, number>();
      ctx.payments.filter((p) => p.status === "paid").forEach((p) => {
        const r = ctx.reservations.find((x) => x.id === p.reservationId);
        if (!r) return;
        totals.set(r.guestId, (totals.get(r.guestId) ?? 0) + p.amount);
      });
      return [...totals.entries()]
        .map(([gid, total]) => ({ guest: guestName(ctx, gid), totalSpend: total }))
        .sort((a, b) => b.totalSpend - a.totalSpend)
        .slice(0, 50);
    },
  },

  // ---------- Reservations ----------
  {
    key: "stay-history",
    name: "Stay History",
    category: "Reservations",
    description: "All checked-out reservations.",
    run: (ctx) =>
      ctx.reservations.filter((r) => r.status === "checked-out").map((r) => ({
        guest: guestName(ctx, r.guestId),
        room: roomNumber(ctx, r.roomId),
        checkIn: r.checkIn, checkOut: r.checkOut,
        total: r.totalAmount,
        invoice: r.invoice?.invoiceNumber ?? "—",
      })),
  },
  {
    key: "stay-requests",
    name: "Stay Requests",
    category: "Reservations",
    description: "Future confirmed reservations.",
    run: (ctx) => {
      const t = todayStr();
      return ctx.reservations
        .filter((r) => r.status === "confirmed" && isoDate(r.checkIn) >= t)
        .map((r) => ({
          guest: guestName(ctx, r.guestId),
          room: roomNumber(ctx, r.roomId),
          checkIn: r.checkIn, checkOut: r.checkOut,
          source: r.source ?? "—",
        }));
    },
  },
  {
    key: "zero-rate",
    name: "Zero Rate",
    category: "Reservations",
    description: "Reservations booked at zero or no rate.",
    run: (ctx) =>
      ctx.reservations.filter((r) => !r.totalAmount || r.totalAmount <= 0).map((r) => ({
        guest: guestName(ctx, r.guestId),
        room: roomNumber(ctx, r.roomId),
        status: r.status,
        total: r.totalAmount,
      })),
  },

  // ---------- Revenue ----------
  {
    key: "revenue-summary",
    name: "Revenue Summary",
    category: "Revenue",
    description: "Daily revenue from paid invoices.",
    run: (ctx) => {
      const map = new Map<string, number>();
      ctx.payments.filter((p) => p.status === "paid").forEach((p) => {
        const d = p.date;
        map.set(d, (map.get(d) ?? 0) + p.amount);
      });
      return [...map.entries()]
        .sort(([a], [b]) => (a < b ? 1 : -1))
        .map(([date, revenue]) => ({ date, revenue }));
    },
  },
  {
    key: "occupancy-summary",
    name: "Occupancy Summary",
    category: "Revenue",
    description: "Current occupancy snapshot.",
    run: (ctx) => {
      const total = ctx.rooms.filter((r) => !r.archived).length;
      const occupied = ctx.rooms.filter((r) => r.status === "occupied").length;
      const oo = ctx.rooms.filter((r) => r.status === "maintenance").length;
      const available = total - occupied - oo;
      return [{
        totalRooms: total,
        occupied, outOfOrder: oo, available,
        occupancyPct: total ? Math.round((occupied / total) * 100) : 0,
      }];
    },
  },
  {
    key: "room-type-summary",
    name: "Room Type Summary",
    category: "Revenue",
    description: "Inventory and pricing per room type.",
    run: (ctx) => {
      const map = new Map<string, { count: number; price: number }>();
      ctx.rooms.filter((r) => !r.archived).forEach((r) => {
        const cur = map.get(r.type) ?? { count: 0, price: r.price };
        cur.count++;
        map.set(r.type, cur);
      });
      return [...map.entries()].map(([type, v]) => ({ type, rooms: v.count, price: v.price }));
    },
  },
  {
    key: "rate-report",
    name: "Rate Report",
    category: "Revenue",
    description: "All current room rates.",
    run: (ctx) =>
      ctx.rooms.filter((r) => !r.archived).map((r) => ({
        room: r.number, type: r.type, price: r.price,
      })),
  },

  // ---------- Companies / AR ----------
  {
    key: "ar-activity",
    name: "Accounts Receivable Activity",
    category: "Companies",
    description: "All recorded payments and statuses.",
    run: (ctx) =>
      ctx.payments.map((p) => {
        const r = ctx.reservations.find((x) => x.id === p.reservationId);
        return {
          date: p.date,
          guest: r ? guestName(ctx, r.guestId) : "—",
          method: p.method,
          status: p.status,
          amount: p.amount,
        };
      }),
  },
  {
    key: "invoice-summary",
    name: "Invoice Summary",
    category: "Companies",
    description: "All issued invoices.",
    run: (ctx) =>
      ctx.reservations.filter((r) => r.invoice).map((r) => ({
        invoice: r.invoice!.invoiceNumber,
        issued: isoDate(r.invoice!.issuedAt),
        guest: guestName(ctx, r.guestId),
        room: roomNumber(ctx, r.roomId),
        subtotal: r.invoice!.subtotal,
        tax: r.invoice!.taxAmount,
        total: r.invoice!.total,
      })),
  },

  // ---------- Tax ----------
  {
    key: "tax-summary",
    name: "Tax Summary",
    category: "Tax",
    description: "Tax totals from issued invoices.",
    run: (ctx) => {
      let taxable = 0, tax = 0, service = 0, total = 0;
      ctx.reservations.forEach((r) => {
        if (!r.invoice) return;
        taxable += r.invoice.subtotal;
        tax += r.invoice.taxAmount;
        service += r.invoice.serviceFeeAmount;
        total += r.invoice.total;
      });
      return [{ taxableBase: taxable, taxAmount: tax, serviceFee: service, grandTotal: total }];
    },
  },
];

export const REPORT_CATEGORIES = Array.from(
  new Set(REPORT_DEFINITIONS.map((r) => r.category)),
);

// ---------- Export helpers ----------

export function rowsToCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((r) => headers.map((h) => escape(r[h])).join(","));
  return [headers.join(","), ...body].join("\n");
}

export function downloadFile(filename: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
