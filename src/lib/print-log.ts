// Print log + rate-override audit log — track who did what. localStorage only.
const LOG_KEY = "nexora.print-log.v1";
const RATE_LOG_KEY = "nexora.rate-override-log.v1";
const MAX_ENTRIES = 500;

export type PrintKind = "invoice-a4" | "receipt-80mm" | "credit-note";

export interface PrintLogEntry {
  id: string;
  reservationId: string;
  kind: PrintKind;
  at: string; // ISO
  user: string; // open-shift user name or "Unknown"
}

function readLog(): PrintLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOG_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeLog(entries: PrintLogEntry[]) {
  window.localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

function readShiftUser(): string {
  let user = "Unknown";
  try {
    const raw = window.localStorage.getItem("nexora-os-hotel-v1");
    if (raw) {
      const data = JSON.parse(raw);
      const openShift = data?.state?.shifts?.find(
        (s: { status: string }) => s.status === "open",
      );
      if (openShift?.userName) user = openShift.userName;
    }
  } catch {
    // ignore
  }
  return user;
}

export function recordPrint(reservationId: string, kind: PrintKind) {
  if (typeof window === "undefined") return;
  const entry: PrintLogEntry = {
    id: crypto.randomUUID(),
    reservationId,
    kind,
    at: new Date().toISOString(),
    user: readShiftUser(),
  };
  writeLog([entry, ...readLog()]);
}

export function listPrintLog(): PrintLogEntry[] {
  return readLog();
}

export function clearPrintLog() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOG_KEY);
}

// ---------- Rate Override Audit Log ----------

export type RateOverrideContext =
  | "new-reservation"
  | "extend-stay"
  | "checkout-adjustment";

export interface RateOverrideEntry {
  id: string;
  at: string; // ISO
  user: string;
  context: RateOverrideContext;
  reservationId?: string;
  roomNumber?: string;
  guestName?: string;
  oldAmount: number; // rack / original
  newAmount: number; // manual
  unit: "per-night" | "total";
  reason: string;
}

function readRateLog(): RateOverrideEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(RATE_LOG_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeRateLog(entries: RateOverrideEntry[]) {
  window.localStorage.setItem(
    RATE_LOG_KEY,
    JSON.stringify(entries.slice(0, MAX_ENTRIES)),
  );
}

export function recordRateOverride(
  entry: Omit<RateOverrideEntry, "id" | "at" | "user">,
) {
  if (typeof window === "undefined") return;
  const full: RateOverrideEntry = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    user: readShiftUser(),
    ...entry,
  };
  writeRateLog([full, ...readRateLog()]);
}

export function listRateOverrideLog(): RateOverrideEntry[] {
  return readRateLog();
}

export function clearRateOverrideLog() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RATE_LOG_KEY);
}
