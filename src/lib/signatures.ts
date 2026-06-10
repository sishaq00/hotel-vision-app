// Per-reservation digital signature store — DB-backed (cross-device, audited).
// Mirrors a small in-memory cache so callers that need a synchronous read
// (e.g. badges) keep working. Source of truth is the `signatures` table.

import { supabase } from "@/integrations/supabase/client";

export interface SignatureRecord {
  reservationId: string;
  dataUrl: string;
  signedAt: string;
  signedByName?: string;
  guestName?: string;
}

type Map = Record<string, SignatureRecord>;
let cache: Map = {};
let primed = false;

function rowToRec(r: any): SignatureRecord {
  return {
    reservationId: r.reservation_id,
    dataUrl: r.data_url,
    signedAt: r.signed_at,
    signedByName: r.signed_by_name ?? undefined,
    guestName: r.guest_name ?? undefined,
  };
}

export async function primeSignatures(): Promise<void> {
  const { data, error } = await supabase
    .from("signatures")
    .select("reservation_id,data_url,signed_at,signed_by_name,guest_name");
  if (error) { console.error("[signatures] prime:", error.message); return; }
  const next: Map = {};
  for (const r of data ?? []) next[(r as any).reservation_id] = rowToRec(r);
  cache = next;
  primed = true;
}

export function hasSignature(reservationId: string): boolean {
  return !!cache[reservationId];
}

export function getSignature(reservationId: string): SignatureRecord | null {
  return cache[reservationId] ?? null;
}

export async function fetchSignature(reservationId: string): Promise<SignatureRecord | null> {
  const { data, error } = await supabase
    .from("signatures")
    .select("reservation_id,data_url,signed_at,signed_by_name,guest_name")
    .eq("reservation_id", reservationId)
    .maybeSingle();
  if (error) { console.error("[signatures] fetch:", error.message); return null; }
  if (!data) { delete cache[reservationId]; return null; }
  const rec = rowToRec(data);
  cache[reservationId] = rec;
  return rec;
}

export async function saveSignature(rec: SignatureRecord): Promise<void> {
  const row = {
    reservation_id: rec.reservationId,
    data_url: rec.dataUrl,
    signed_at: rec.signedAt,
    signed_by_name: rec.signedByName ?? null,
    guest_name: rec.guestName ?? null,
  };
  const { error } = await supabase
    .from("signatures")
    .upsert(row as any, { onConflict: "reservation_id" });
  if (error) throw new Error(error.message);
  cache[rec.reservationId] = rec;
}

export async function clearSignature(reservationId: string): Promise<void> {
  const { error } = await supabase
    .from("signatures")
    .delete()
    .eq("reservation_id", reservationId);
  if (error) throw new Error(error.message);
  delete cache[reservationId];
}

// Subscribe to realtime updates so other devices see changes live.
export function subscribeSignatures(onChange?: () => void) {
  const ch = supabase
    .channel("signatures-sync")
    .on(
      "postgres_changes" as any,
      { event: "*", schema: "public", table: "signatures" },
      (payload: any) => {
        const row = payload.new ?? payload.old;
        if (!row) return;
        if (payload.eventType === "DELETE") delete cache[row.reservation_id];
        else cache[row.reservation_id] = rowToRec(row);
        onChange?.();
      },
    )
    .subscribe();
  return () => { void supabase.removeChannel(ch); };
}

export function isPrimed() { return primed; }
