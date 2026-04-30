// Print log — track who printed which invoice and when. localStorage only.
const LOG_KEY = "nexora.print-log.v1";
const MAX_ENTRIES = 500;

export type PrintKind = "invoice-a4" | "receipt-80mm";

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

export function recordPrint(reservationId: string, kind: PrintKind) {
  if (typeof window === "undefined") return;
  // Read open shift directly from store snapshot to avoid circular import.
  let user = "Unknown";
  try {
    const raw = window.localStorage.getItem("nexora-os-hotel-v1");
    if (raw) {
      const data = JSON.parse(raw);
      const openShift = data?.state?.shifts?.find((s: { status: string }) => s.status === "open");
      if (openShift?.userName) user = openShift.userName;
    }
  } catch {
    // ignore
  }
  const entry: PrintLogEntry = {
    id: crypto.randomUUID(),
    reservationId,
    kind,
    at: new Date().toISOString(),
    user,
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
