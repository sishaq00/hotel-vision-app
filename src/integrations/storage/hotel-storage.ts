// Storage helper for hotel buckets (private; access via signed URLs).
import { supabase } from "@/integrations/supabase/client";

export type HotelBucket =
  | "hotel-logo"
  | "room-photos"
  | "housekeeping-photos"
  | "payment-proofs"
  | "guest-documents";

/** Upload a file and return a signed URL (1 hour). */
export async function uploadFile(
  bucket: HotelBucket,
  file: File | Blob,
  path?: string,
): Promise<{ ok: true; path: string; url: string } | { ok: false; error: string }> {
  const ext =
    file instanceof File && file.name.includes(".")
      ? file.name.split(".").pop()
      : "bin";
  const key = path ?? `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(key, file, {
    upsert: true,
    contentType: (file as File).type || undefined,
  });
  if (error) return { ok: false, error: error.message };
  const signed = await supabase.storage.from(bucket).createSignedUrl(key, 3600);
  if (signed.error) return { ok: false, error: signed.error.message };
  return { ok: true, path: key, url: signed.data.signedUrl };
}

/** Get a fresh signed URL for an existing object. */
export async function getSignedUrl(
  bucket: HotelBucket,
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

/** Remove an object. */
export async function removeFile(bucket: HotelBucket, path: string) {
  return supabase.storage.from(bucket).remove([path]);
}
