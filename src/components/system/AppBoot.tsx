// Mounts once at app root: applies dir/lang to <html>, runs daily auto-backup,
// reminds user weekly to save an external backup, and registers global shortcuts.
// Also wires up session activity tracking for idle-timeout.
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useHotelStore } from "@/store/hotel-store";
import { useAuthStore } from "@/store/auth-store";
import { useStoreSync } from "@/lib/sync/use-store-sync";
import { runDailyAutoBackup, daysSinceLastDownload, downloadBackup } from "@/lib/backup";

export function AppBoot() {
  const lang = useHotelStore((s) => s.settings.language) ?? "en";
  const navigate = useNavigate();
  const touchActivity = useAuthStore((s) => s.touchActivity);

  // LAN sync — connects to PocketBase server when configured in settings
  useStoreSync();

  // Apply language + direction to <html>
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  }, [lang]);

  // Run daily auto-backup; warn if no external download in 7+ days
  useEffect(() => {
    runDailyAutoBackup();
    const days = daysSinceLastDownload();
    const isAr = lang === "ar";
    const t = setTimeout(() => {
      if (days === null) {
        toast.warning(
          isAr ? "احفظ نسخة احتياطية على القرص" : "Save your first backup file",
          {
            description: isAr
              ? "كل بياناتك محفوظة محلياً فقط. حمّل نسخة JSON الآن لحمايتها."
              : "All data is stored locally only. Download a JSON copy now to protect it.",
            duration: 10_000,
            action: {
              label: isAr ? "تحميل" : "Download",
              onClick: () => downloadBackup(),
            },
          },
        );
      } else if (days >= 7) {
        toast.warning(
          isAr ? `مرّ ${days} يوماً منذ آخر نسخة احتياطية` : `${days} days since last backup`,
          {
            description: isAr ? "احفظ نسخة محدّثة لتفادي ضياع البيانات." : "Save a fresh copy.",
            duration: 10_000,
            action: {
              label: isAr ? "تحميل" : "Download",
              onClick: () => downloadBackup(),
            },
          },
        );
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [lang]);

  // Touch activity on any keyboard shortcut to keep session alive
  useEffect(() => {
    const activityHandler = () => touchActivity();
    window.addEventListener("keydown", activityHandler, { passive: true });
    return () => window.removeEventListener("keydown", activityHandler);
  }, [touchActivity]);

  // Global shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const k = e.key.toLowerCase();
      // Ctrl+/ shows shortcut help
      if (k === "/") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("nexora:shortcuts"));
        return;
      }
      if (inField) return;
      const map: Record<string, string> = {
        d: "/",
        r: "/reservations",
        g: "/guests",
        h: "/rooms",
        i: "/in-house",
        a: "/arrivals",
        p: "/payments",
        s: "/settings",
        u: "/audit",
      };
      const route = map[k];
      if (route) {
        e.preventDefault();
        navigate({ to: route as never });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  return null;
}
