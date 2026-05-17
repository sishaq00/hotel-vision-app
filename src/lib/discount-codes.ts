// Discount codes — pure-frontend, persisted in localStorage.
// Used at reservation creation to reduce the stay total by a percentage.

export interface DiscountCode {
  id: string;
  code: string;              // uppercase, unique (e.g. "WELCOME10")
  label: string;             // human-friendly name
  percent: number;           // 1..100
  validFrom?: string;        // YYYY-MM-DD (optional)
  validTo?: string;          // YYYY-MM-DD (optional)
  maxUses?: number;          // optional cap
  usedCount: number;
  active: boolean;
  createdAt: string;
}

const STORAGE_KEY = "nexora.discount-codes.v1";

const DEFAULTS: Omit<DiscountCode, "id" | "createdAt">[] = [
  { code: "WELCOME10", label: "Welcome 10%", percent: 10, usedCount: 0, active: true },
  { code: "LOYAL15",   label: "Loyalty 15%", percent: 15, usedCount: 0, active: true },
  { code: "VIP20",     label: "VIP 20%",     percent: 20, usedCount: 0, active: true },
  { code: "STAFF50",   label: "Staff 50%",   percent: 50, usedCount: 0, active: true },
  { code: "COMP100",   label: "Complimentary 100%", percent: 100, usedCount: 0, active: true },
];

export function loadDiscountCodes(): DiscountCode[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded: DiscountCode[] = DEFAULTS.map((d) => ({
        ...d,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as DiscountCode[];
  } catch {
    return [];
  }
}

export function saveDiscountCodes(codes: DiscountCode[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

export function isCodeValidToday(c: DiscountCode): boolean {
  if (!c.active) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (c.validFrom && today < c.validFrom) return false;
  if (c.validTo && today > c.validTo) return false;
  if (c.maxUses != null && c.usedCount >= c.maxUses) return false;
  return true;
}

/** Look up a code by its string (case-insensitive). Returns null if not found or invalid. */
export function findValidCode(codeStr: string): DiscountCode | null {
  const norm = codeStr.trim().toUpperCase();
  if (!norm) return null;
  const all = loadDiscountCodes();
  const match = all.find((c) => c.code.toUpperCase() === norm);
  if (!match || !isCodeValidToday(match)) return null;
  return match;
}

/** Apply a discount percent to a total. Returns rounded amount. */
export function applyDiscount(total: number, percent: number): { discount: number; finalTotal: number } {
  const pct = Math.max(0, Math.min(100, percent));
  const discount = Math.round((total * pct) / 100 * 100) / 100;
  return { discount, finalTotal: Math.max(0, total - discount) };
}

/** Increment usedCount when a code is consumed by a reservation. */
export function consumeCode(codeId: string) {
  const all = loadDiscountCodes();
  const next = all.map((c) =>
    c.id === codeId ? { ...c, usedCount: c.usedCount + 1 } : c,
  );
  saveDiscountCodes(next);
}
