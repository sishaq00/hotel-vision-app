// Mounts once at app root: applies dir/lang to <html>, runs daily auto-backup,
// and registers global keyboard shortcuts.
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useHotelStore } from "@/store/hotel-store";
import { runDailyAutoBackup } from "@/lib/backup";

export function AppBoot() {
  const lang = useHotelStore((s) => s.settings.language) ?? "en";
  const navigate = useNavigate();

  // Apply language + direction to <html>
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  }, [lang]);

  // Run daily auto-backup once per day
  useEffect(() => {
    runDailyAutoBackup();
  }, []);

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
