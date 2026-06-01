// Renders an <img> from a Supabase storage path (resolved as signed URL),
// or directly if the source is already a data: URL or http(s) URL.
import { useEffect, useState } from "react";
import { getSignedUrl, type HotelBucket } from "@/integrations/storage/hotel-storage";

export function StoragePhoto({
  src,
  bucket,
  alt = "",
  className,
}: {
  src: string;
  bucket: HotelBucket;
  alt?: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!src) return;
    if (src.startsWith("data:") || src.startsWith("http")) {
      setUrl(src);
      return;
    }
    void getSignedUrl(bucket, src, 3600).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [src, bucket]);

  if (!url) {
    return <div className={className + " animate-pulse bg-muted"} aria-label={alt} />;
  }
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
