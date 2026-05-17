// Offline backup / restore + daily auto-backup (last 7 days), all in localStorage.
// v4: also backs up discount-codes and rate-plans (previously excluded).
const STORE_KEY = "nexora-os-hotel-v1";
const DISCOUNT_KEY = "nexora.discount-codes.v1";
const RATE_PLANS_KEY = "nexora.rate-plans.v1";
const AUTO_PREFIX = "nexora-autobackup-";
const AUTO_INDEX = "nexora-autobackup-index";
const AUTO_KEEP = 7;

export interface BackupFile {
  app: "NEXORA OS";
  version: 4;
  exportedAt: string;
  payload: unknown;
  discountCodes?: unknown;
  ratePlans?: unknown;
}

function readStoreRaw(): unknown {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function exportBackup(): BackupFile {
  const discountRaw = typeof window !== "undefined"
    ? window.localStorage.getItem(DISCOUNT_KEY)
    : null;
  const ratePlansRaw = typeof window !== "undefined"
    ? window.localStorage.getItem(RATE_PLANS_KEY)
    : null;
  return {
    app: "NEXORA OS",
    version: 4,
    exportedAt: new Date().toISOString(),
    payload: readStoreRaw(),
    discountCodes: discountRaw ? JSON.parse(discountRaw) : undefined,
    ratePlans: ratePlansRaw ? JSON.parse(ratePlansRaw) : undefined,
  };
}

export function downloadBackup() {
  const data = exportBackup();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.href = url;
  a.download = `nexora-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  markBackupDownloaded();
}

export async function restoreFromFile(file: File): Promise<boolean> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as BackupFile;
    if (data?.app !== "NEXORA OS" || !data.payload) return false;
    window.localStorage.setItem(STORE_KEY, JSON.stringify(data.payload));
    // Restore extended collections when present
    if (data.discountCodes !== undefined)
      window.localStorage.setItem(DISCOUNT_KEY, JSON.stringify(data.discountCodes));
    if (data.ratePlans !== undefined)
      window.localStorage.setItem(RATE_PLANS_KEY, JSON.stringify(data.ratePlans));
    return true;
  } catch {
    return false;
  }
}

// ---- Auto-backup -----------------------------------------------------------

interface AutoEntry {
  key: string;
  date: string; // YYYY-MM-DD
  savedAt: string;
}

function readIndex(): AutoEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(AUTO_INDEX) ?? "[]");
  } catch {
    return [];
  }
}

function writeIndex(idx: AutoEntry[]) {
  window.localStorage.setItem(AUTO_INDEX, JSON.stringify(idx));
}

/** Saves one snapshot per day, keeps last 7. Safe to call on every app boot. */
export function runDailyAutoBackup() {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().slice(0, 10);
  const idx = readIndex();
  if (idx.some((e) => e.date === today)) return; // already saved today
  const raw = window.localStorage.getItem(STORE_KEY);
  if (!raw) return;
  const key = `${AUTO_PREFIX}${today}`;
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    // quota exceeded — drop oldest then retry once
    const oldest = idx[idx.length - 1];
    if (oldest) {
      window.localStorage.removeItem(oldest.key);
      try {
        window.localStorage.setItem(key, raw);
      } catch {
        return;
      }
    } else return;
  }
  const next = [
    { key, date: today, savedAt: new Date().toISOString() },
    ...idx.filter((e) => e.date !== today),
  ];
  // prune
  while (next.length > AUTO_KEEP) {
    const drop = next.pop();
    if (drop) window.localStorage.removeItem(drop.key);
  }
  writeIndex(next);
}

export function listAutoBackups(): AutoEntry[] {
  return readIndex();
}

export function restoreAutoBackup(key: string): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(key);
  if (!raw) return false;
  window.localStorage.setItem(STORE_KEY, raw);
  return true;
}

// ---- External backup reminder ---------------------------------------------
const LAST_DOWNLOAD_KEY = "nexora-last-download-backup";

/** Mark that user just downloaded an external backup file. */
export function markBackupDownloaded() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_DOWNLOAD_KEY, new Date().toISOString());
}

/** Returns days since last download, or null if never. */
export function daysSinceLastDownload(): number | null {
  if (typeof window === "undefined") return null;
  const last = window.localStorage.getItem(LAST_DOWNLOAD_KEY);
  if (!last) return null;
  const diff = Date.now() - new Date(last).getTime();
  return Math.floor(diff / 86_400_000);
}
