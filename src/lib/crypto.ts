// Offline password hashing using PBKDF2 via Web Crypto API.
// 100 000 iterations make brute-force attacks significantly harder even
// if the localStorage data is read directly from DevTools.
// Format stored: "pbkdf2$<hex-salt>$<hex-hash>"
// Legacy SHA-256 hashes (no prefix) are still verified so existing users
// are not locked out; their hash is transparently upgraded on next login.

const ITERATIONS = 100_000;
const KEY_LEN = 32; // bytes → 64 hex chars
const HASH_ALG = "SHA-256";

function bytesToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

export async function hashPassword(password: string): Promise<string> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = bytesToHex(saltBytes.buffer);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: ITERATIONS, hash: HASH_ALG },
    keyMaterial,
    KEY_LEN * 8,
  );
  return `pbkdf2$${saltHex}$${bytesToHex(derived)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith("pbkdf2$")) {
    return _verifySha256Legacy(password, stored);
  }
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const [, saltHex, hashHex] = parts;
  const saltBytes = hexToBytes(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes as BufferSource, iterations: ITERATIONS, hash: HASH_ALG },
    keyMaterial,
    KEY_LEN * 8,
  );
  // Constant-time comparison to resist timing attacks
  const candidate = bytesToHex(derived);
  if (candidate.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return diff === 0;
}

/** Verify legacy SHA-256 hashes created before the PBKDF2 upgrade. */
async function _verifySha256Legacy(password: string, hash: string): Promise<boolean> {
  const salted = new TextEncoder().encode(`nexora-os::${password}`);
  const buf = await crypto.subtle.digest("SHA-256", salted);
  const arr = Array.from(new Uint8Array(buf));
  const h = arr.map((b) => b.toString(16).padStart(2, "0")).join("");
  return h === hash;
}

export function uid(): string {
  return crypto.randomUUID();
}
