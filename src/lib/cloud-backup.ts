// DB-backed backups: store JSON snapshots of all hotel data in `public.backups`.
// Supports list / create / restore-into-localStorage / integrity verification.
//
// Existing localStorage auto-backup logic remains as a fast offline safety net,
// but PRIMARY backups are server-side.

import { supabase } from "@/integrations/supabase/client";

const STORE_KEY = "nexora-os-hotel-v1";
const DISCOUNT_KEY = "nexora.discount-codes.v1";
const RATE_PLANS_KEY = "nexora.rate-plans.v1";

export interface CloudBackupRow {
  id: string;
  label: string;
  kind: string;
  size_bytes: number;
  created_at: string;
}

function snapshotPayload() {
  if (typeof window === "undefined") return null;
  const store = window.localStorage.getItem(STORE_KEY);
  const dc = window.localStorage.getItem(DISCOUNT_KEY);
  const rp = window.localStorage.getItem(RATE_PLANS_KEY);
  return {
    app: "NEXORA OS",
    version: 5,
    exportedAt: new Date().toISOString(),
    payload: store ? JSON.parse(store) : null,
    discountCodes: dc ? JSON.parse(dc) : undefined,
    ratePlans: rp ? JSON.parse(rp) : undefined,
  };
}

/** Create a database-stored backup. Returns new row id. */
export async function createCloudBackup(
  label?: string,
  kind: "manual" | "auto" = "manual",
): Promise<string> {
  const payload = snapshotPayload();
  if (!payload) throw new Error("No data to back up");
  const json = JSON.stringify(payload);
  const { data, error } = await supabase
    .from("backups")
    .insert({
      label: label?.trim() || `Backup ${new Date().toLocaleString()}`,
      kind,
      payload: payload as any,
      size_bytes: new Blob([json]).size,
    } as any)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (data as any).id as string;
}

export async function listCloudBackups(): Promise<CloudBackupRow[]> {
  const { data, error } = await supabase
    .from("backups")
    .select("id,label,kind,size_bytes,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as any;
}

export async function restoreCloudBackup(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("backups").select("payload").eq("id", id).single();
  if (error || !data) throw new Error(error?.message ?? "Backup not found");
  const b: any = (data as any).payload;
  if (b?.app !== "NEXORA OS" || !b.payload) throw new Error("Invalid backup payload");
  window.localStorage.setItem(STORE_KEY, JSON.stringify(b.payload));
  if (b.discountCodes !== undefined)
    window.localStorage.setItem(DISCOUNT_KEY, JSON.stringify(b.discountCodes));
  if (b.ratePlans !== undefined)
    window.localStorage.setItem(RATE_PLANS_KEY, JSON.stringify(b.ratePlans));
  return true;
}

/** Verify a backup is parseable and has the expected top-level structure. */
export async function verifyCloudBackup(id: string): Promise<{
  ok: boolean;
  reason?: string;
  size_bytes?: number;
  exported_at?: string;
}> {
  const { data, error } = await supabase
    .from("backups").select("payload,size_bytes").eq("id", id).single();
  if (error || !data) return { ok: false, reason: error?.message ?? "not found" };
  const b: any = (data as any).payload;
  if (b?.app !== "NEXORA OS") return { ok: false, reason: "wrong app marker" };
  if (!b.payload) return { ok: false, reason: "missing payload root" };
  return {
    ok: true,
    size_bytes: (data as any).size_bytes,
    exported_at: b.exportedAt,
  };
}

export async function deleteCloudBackup(id: string): Promise<void> {
  const { error } = await supabase.from("backups").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
