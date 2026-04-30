// Listens for `nexora:shortcuts` and shows a cheat-sheet dialog.
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

const SHORTCUTS: Array<{ keys: string; en: string; ar: string }> = [
  { keys: "Ctrl+D", en: "Dashboard", ar: "لوحة التحكم" },
  { keys: "Ctrl+R", en: "Reservations", ar: "الحجوزات" },
  { keys: "Ctrl+G", en: "Guests", ar: "النزلاء" },
  { keys: "Ctrl+H", en: "Rooms", ar: "الغرف" },
  { keys: "Ctrl+I", en: "In-House", ar: "الإقامة الحالية" },
  { keys: "Ctrl+A", en: "Arrivals", ar: "الوصول" },
  { keys: "Ctrl+P", en: "Payments", ar: "المدفوعات" },
  { keys: "Ctrl+S", en: "Settings", ar: "الإعدادات" },
  { keys: "Ctrl+U", en: "Audit Log", ar: "سجل العمليات" },
  { keys: "Ctrl+/", en: "Show this dialog", ar: "إظهار هذه النافذة" },
];

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const { lang } = useT();

  useEffect(() => {
    const h = () => setOpen((v) => !v);
    window.addEventListener("nexora:shortcuts", h);
    return () => window.removeEventListener("nexora:shortcuts", h);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {lang === "ar" ? "اختصارات لوحة المفاتيح" : "Keyboard Shortcuts"}
          </DialogTitle>
          <DialogDescription>
            {lang === "ar"
              ? "اضغط Ctrl + الحرف للانتقال السريع."
              : "Press Ctrl + letter to navigate quickly."}
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border text-sm">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">
                {lang === "ar" ? s.ar : s.en}
              </span>
              <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
