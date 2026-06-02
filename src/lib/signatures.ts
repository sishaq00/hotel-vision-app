// Per-reservation digital signature store (staff-captured on screen).
// Stored locally as a base64 PNG data URL + metadata.

const KEY = "nexora.signatures.v1";

export interface SignatureRecord {
  reservationId: string;
  dataUrl: string;        // PNG data URL of the signature
  signedAt: string;       // ISO
  signedByName?: string;  // staff who captured
  guestName?: string;     // snapshot of guest name
}

type Map = Record<string, SignatureRecord>;

function load(): Map {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Map) : {};
  } catch { return {}; }
}
function save(m: Map) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* quota */ }
}

export function getSignature(reservationId: string): SignatureRecord | null {
  return load()[reservationId] ?? null;
}

export function hasSignature(reservationId: string): boolean {
  return !!load()[reservationId];
}

export function saveSignature(rec: SignatureRecord) {
  const m = load();
  m[rec.reservationId] = rec;
  save(m);
}

export function clearSignature(reservationId: string) {
  const m = load();
  delete m[reservationId];
  save(m);
}
