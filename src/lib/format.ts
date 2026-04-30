// Locale-aware formatters that read currency from the hotel store at call time.
import { useHotelStore } from "@/store/hotel-store";

export function formatMoney(n: number, currency?: string): string {
  const cur = currency ?? useHotelStore.getState().settings.currency ?? "USD";
  const lang = useHotelStore.getState().settings.language === "ar" ? "ar" : "en-US";
  try {
    return new Intl.NumberFormat(lang, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${cur} ${n.toFixed(2)}`;
  }
}

export function formatDate(iso: string): string {
  const lang = useHotelStore.getState().settings.language === "ar" ? "ar" : "en-US";
  try {
    return new Date(iso).toLocaleDateString(lang, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  const lang = useHotelStore.getState().settings.language === "ar" ? "ar" : "en-US";
  try {
    return new Date(iso).toLocaleString(lang, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}
