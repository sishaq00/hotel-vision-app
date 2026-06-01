// Internal loyalty system — staff-managed only. Stored in localStorage.
// Points are awarded automatically on check-out and can be adjusted/redeemed manually by staff.

const SETTINGS_KEY = "nexora.loyalty.settings.v1";
const LEDGER_KEY = "nexora.loyalty.ledger.v1";
const AWARDED_KEY = "nexora.loyalty.awarded-reservations.v1";

export type LoyaltyTierName = "Bronze" | "Silver" | "Gold" | "Platinum";

export interface LoyaltyTier {
  name: LoyaltyTierName;
  minPoints: number;
  discountPct: number; // staff perk hint
  color: string;       // tailwind-friendly class
}

export interface LoyaltySettings {
  enabled: boolean;
  pointsPerCurrency: number;   // points earned per 1 unit of currency spent
  redemptionRate: number;      // points needed for 1 unit of currency discount
  expiryMonths: number;        // 0 = never
  tiers: LoyaltyTier[];
}

export type LoyaltyTxnType = "earn" | "redeem" | "adjust" | "expire";

export interface LoyaltyTxn {
  id: string;
  guestId: string;
  type: LoyaltyTxnType;
  points: number;              // positive for earn/adjust+, negative for redeem/expire
  reason: string;
  reservationId?: string;
  invoiceNumber?: string;
  by?: string;                 // staff user id/name
  at: string;                  // ISO
}

const DEFAULT_TIERS: LoyaltyTier[] = [
  { name: "Bronze",   minPoints: 0,    discountPct: 0,  color: "bg-orange-500/10 text-orange-700 border-orange-500/30" },
  { name: "Silver",   minPoints: 500,  discountPct: 5,  color: "bg-zinc-300/40 text-zinc-700 border-zinc-400/60" },
  { name: "Gold",     minPoints: 2000, discountPct: 10, color: "bg-amber-500/15 text-amber-700 border-amber-500/40" },
  { name: "Platinum", minPoints: 5000, discountPct: 15, color: "bg-slate-200 text-slate-900 border-slate-400" },
];

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  enabled: true,
  pointsPerCurrency: 1,
  redemptionRate: 100,
  expiryMonths: 0,
  tiers: DEFAULT_TIERS,
};

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

export function loadLoyaltySettings(): LoyaltySettings {
  const s = readJSON<LoyaltySettings | null>(SETTINGS_KEY, null);
  if (!s) return DEFAULT_LOYALTY_SETTINGS;
  return {
    ...DEFAULT_LOYALTY_SETTINGS,
    ...s,
    tiers: Array.isArray(s.tiers) && s.tiers.length ? s.tiers : DEFAULT_TIERS,
  };
}
export function saveLoyaltySettings(s: LoyaltySettings) {
  writeJSON(SETTINGS_KEY, s);
}

function loadLedger(): LoyaltyTxn[] {
  return readJSON<LoyaltyTxn[]>(LEDGER_KEY, []);
}
function saveLedger(rows: LoyaltyTxn[]) {
  writeJSON(LEDGER_KEY, rows);
}

function loadAwarded(): string[] {
  return readJSON<string[]>(AWARDED_KEY, []);
}
function saveAwarded(ids: string[]) {
  writeJSON(AWARDED_KEY, ids);
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function getGuestHistory(guestId: string): LoyaltyTxn[] {
  return loadLedger()
    .filter((t) => t.guestId === guestId)
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}

export function getGuestBalance(guestId: string): number {
  return loadLedger()
    .filter((t) => t.guestId === guestId)
    .reduce((sum, t) => sum + t.points, 0);
}

export function getTierForPoints(points: number, settings = loadLoyaltySettings()): LoyaltyTier {
  const sorted = [...settings.tiers].sort((a, b) => b.minPoints - a.minPoints);
  return sorted.find((t) => points >= t.minPoints) ?? settings.tiers[0];
}

export function getNextTier(points: number, settings = loadLoyaltySettings()): LoyaltyTier | null {
  const sorted = [...settings.tiers].sort((a, b) => a.minPoints - b.minPoints);
  return sorted.find((t) => t.minPoints > points) ?? null;
}

interface AwardArgs {
  guestId: string;
  amount: number;
  reservationId?: string;
  invoiceNumber?: string;
  by?: string;
}
export function awardPointsForSpend(args: AwardArgs): LoyaltyTxn | null {
  const settings = loadLoyaltySettings();
  if (!settings.enabled || args.amount <= 0) return null;
  const pts = Math.round(args.amount * settings.pointsPerCurrency);
  if (pts <= 0) return null;
  const txn: LoyaltyTxn = {
    id: uid(),
    guestId: args.guestId,
    type: "earn",
    points: pts,
    reason: args.invoiceNumber
      ? `Auto award · invoice ${args.invoiceNumber}`
      : `Auto award · ${args.amount.toFixed(2)} spent`,
    reservationId: args.reservationId,
    invoiceNumber: args.invoiceNumber,
    by: args.by,
    at: new Date().toISOString(),
  };
  saveLedger([txn, ...loadLedger()]);
  return txn;
}

// Mark a reservation as already awarded so auto-award doesn't double up.
export function isReservationAwarded(reservationId: string): boolean {
  return loadAwarded().includes(reservationId);
}
export function markReservationAwarded(reservationId: string) {
  const cur = loadAwarded();
  if (cur.includes(reservationId)) return;
  saveAwarded([reservationId, ...cur].slice(0, 5000));
}

export function adjustPoints(
  guestId: string,
  points: number,
  reason: string,
  by?: string,
): LoyaltyTxn {
  const txn: LoyaltyTxn = {
    id: uid(),
    guestId,
    type: "adjust",
    points,
    reason: reason || "Manual adjustment",
    by,
    at: new Date().toISOString(),
  };
  saveLedger([txn, ...loadLedger()]);
  return txn;
}

export function redeemPoints(
  guestId: string,
  points: number,
  reason: string,
  reservationId?: string,
  by?: string,
): { ok: true; txn: LoyaltyTxn; cashValue: number } | { ok: false; error: string } {
  const settings = loadLoyaltySettings();
  if (!settings.enabled) return { ok: false, error: "Loyalty disabled" };
  if (points <= 0) return { ok: false, error: "Points must be positive" };
  const bal = getGuestBalance(guestId);
  if (bal < points) return { ok: false, error: `Insufficient points (${bal})` };
  const txn: LoyaltyTxn = {
    id: uid(),
    guestId,
    type: "redeem",
    points: -points,
    reason: reason || "Redemption",
    reservationId,
    by,
    at: new Date().toISOString(),
  };
  saveLedger([txn, ...loadLedger()]);
  const cashValue = settings.redemptionRate > 0 ? points / settings.redemptionRate : 0;
  return { ok: true, txn, cashValue };
}

export function pointsToCash(points: number, settings = loadLoyaltySettings()): number {
  if (settings.redemptionRate <= 0) return 0;
  return points / settings.redemptionRate;
}
