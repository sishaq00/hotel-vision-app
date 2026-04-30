// Builds a comprehensive end-of-shift report for the active shift.
import { useHotelStore, type Shift, type ProductSale } from "@/store/hotel-store";
import { useActivityStore, type ActivityEntry } from "@/store/activity-store";

export interface ShiftReportSection<T> {
  title: string;
  rows: T[];
}

export interface ShiftReport {
  shift: Shift;
  durationMinutes: number;
  endedAtIso: string;

  newReservations: ActivityEntry[];
  checkIns: ActivityEntry[];
  checkOuts: ActivityEntry[];
  extensions: ActivityEntry[];
  cancellations: ActivityEntry[];
  cashPayments: ActivityEntry[];
  refunds: ActivityEntry[];
  productSales: ProductSale[];
  roomChanges: ActivityEntry[];
  otherActions: ActivityEntry[];

  totals: {
    cashCollected: number;          // payments + product sales
    productSalesTotal: number;
    paymentsTotal: number;
    refundsTotal: number;
    nightsExtended: number;          // can be negative when shortened
    extensionAmount: number;
    operationsCount: number;
  };

  expectedClosingCash: number;       // openingCash + cashCollected - refunds
}

export function buildShiftReport(
  shiftId: string,
  endedAt: Date = new Date(),
): ShiftReport | null {
  const state = useHotelStore.getState();
  const shift = state.shifts.find((s) => s.id === shiftId);
  if (!shift) return null;

  const startMs = new Date(shift.startedAt).getTime();
  const endMs = endedAt.getTime();
  const inWindow = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= startMs && t <= endMs;
  };

  const entries = useActivityStore.getState().entries.filter(
    (e) => e.userId === shift.userId && inWindow(e.timestamp),
  );

  const newReservations = entries.filter((e) => e.action === "reservation.create");
  const checkIns = entries.filter((e) => e.action === "checkin");
  const checkOuts = entries.filter((e) => e.action === "checkout");
  const extensions = entries.filter((e) => e.action === "reservation.extend");
  const cancellations = entries.filter((e) => e.action === "reservation.cancel");
  const refunds = entries.filter((e) => e.action === "payment.refund");
  const roomChanges = entries.filter((e) => e.action === "room.status-change");

  // payment.record covers both cash payments and product sales — separate them
  const paymentEntries = entries.filter((e) => e.action === "payment.record");
  const productSaleEntries = paymentEntries.filter(
    (e) => (e.details as { kind?: string } | undefined)?.kind === "product-sale",
  );
  const cashPayments = paymentEntries.filter(
    (e) => (e.details as { kind?: string } | undefined)?.kind !== "product-sale",
  );

  // Pull full ProductSale rows (richer than activity entries)
  const productSales = state.productSales.filter(
    (p) => p.shiftId === shift.id || (p.userId === shift.userId && inWindow(p.soldAt)),
  );

  const knownActions = new Set<ActivityEntry["action"]>([
    "reservation.create",
    "checkin",
    "checkout",
    "reservation.extend",
    "reservation.cancel",
    "payment.record",
    "payment.refund",
    "room.status-change",
    "shift.open",
    "shift.close",
    "login",
    "logout",
  ]);
  const otherActions = entries.filter((e) => !knownActions.has(e.action));

  const productSalesTotal = productSales.reduce((s, p) => s + p.total, 0);
  const paymentsTotal = cashPayments.reduce((s, e) => s + (e.amount ?? 0), 0);
  const refundsTotal = refunds.reduce((s, e) => s + (e.amount ?? 0), 0);
  const cashCollected = paymentsTotal + productSalesTotal;
  const extensionAmount = extensions.reduce((s, e) => s + (e.amount ?? 0), 0);
  const nightsExtended = extensions.reduce((s, e) => {
    const d = e.details as { nightsDelta?: number } | undefined;
    return s + (d?.nightsDelta ?? 0);
  }, 0);

  const operationsCount =
    newReservations.length +
    checkIns.length +
    checkOuts.length +
    extensions.length +
    cancellations.length +
    cashPayments.length +
    productSales.length +
    refunds.length +
    roomChanges.length +
    otherActions.length;

  const expectedClosingCash = +(shift.openingCash + cashCollected - refundsTotal).toFixed(2);

  return {
    shift,
    durationMinutes: Math.round((endMs - startMs) / 60000),
    endedAtIso: endedAt.toISOString(),
    newReservations,
    checkIns,
    checkOuts,
    extensions,
    cancellations,
    cashPayments,
    refunds,
    productSales,
    roomChanges,
    otherActions,
    totals: {
      cashCollected: +cashCollected.toFixed(2),
      productSalesTotal: +productSalesTotal.toFixed(2),
      paymentsTotal: +paymentsTotal.toFixed(2),
      refundsTotal: +refundsTotal.toFixed(2),
      nightsExtended,
      extensionAmount: +extensionAmount.toFixed(2),
      operationsCount,
    },
    expectedClosingCash,
  };
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
