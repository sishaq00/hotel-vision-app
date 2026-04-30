// SHA-256 hashing for offline password storage. NOT a security guarantee
// against an attacker with physical/devtools access — only obscures the
// raw password in localStorage from casual viewing.
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder().encode(password);
  // Salt with a static project key so two installs produce different hashes
  const salted = new TextEncoder().encode(`nexora-os::${password}`);
  const buf = await crypto.subtle.digest("SHA-256", salted);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
  void enc;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const h = await hashPassword(password);
  return h === hash;
}

export function uid(): string {
  return crypto.randomUUID();
}
