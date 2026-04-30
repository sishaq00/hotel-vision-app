// Lightweight i18n — offline, no external deps. Reactive via zustand store.
import { useHotelStore } from "@/store/hotel-store";

export type Lang = "en" | "ar";

type Dict = Record<string, string>;

const en: Dict = {
  // Generic
  "app.name": "NEXORA OS",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.add": "Add",
  "common.search": "Search",
  "common.print": "Print",
  "common.export": "Export",
  "common.import": "Import",
  "common.actions": "Actions",
  "common.status": "Status",
  "common.date": "Date",
  "common.amount": "Amount",
  "common.total": "Total",
  "common.yes": "Yes",
  "common.no": "No",
  "common.help": "Help",
  "common.settings": "Settings",
  "common.loading": "Loading…",
  "common.empty": "No data",
  // Nav
  "nav.dashboard": "Dashboard",
  "nav.reservations": "Reservations",
  "nav.guests": "Guests",
  "nav.rooms": "Rooms",
  "nav.payments": "Payments",
  "nav.reports": "Reports",
  "nav.settings": "Settings",
  "nav.audit": "Audit Log",
  // Settings sections
  "settings.title": "Settings",
  "settings.hotel": "Hotel Information",
  "settings.localization": "Localization",
  "settings.billing": "Billing & Invoicing",
  "settings.invoice": "Invoice Template",
  "settings.backup": "Backup & Restore",
  "settings.shortcuts": "Keyboard Shortcuts",
  // Backup
  "backup.export": "Export full backup",
  "backup.import": "Restore from backup",
  "backup.auto": "Auto-backups (last 7 days)",
  "backup.restore": "Restore",
  "backup.restored": "Backup restored. Reloading…",
  "backup.exported": "Backup downloaded",
  "backup.invalid": "Invalid backup file",
  // Toast
  "toast.saved": "Settings saved",
};

const ar: Dict = {
  "app.name": "نيكسورا أو إس",
  "common.save": "حفظ",
  "common.cancel": "إلغاء",
  "common.delete": "حذف",
  "common.edit": "تعديل",
  "common.add": "إضافة",
  "common.search": "بحث",
  "common.print": "طباعة",
  "common.export": "تصدير",
  "common.import": "استيراد",
  "common.actions": "إجراءات",
  "common.status": "الحالة",
  "common.date": "التاريخ",
  "common.amount": "المبلغ",
  "common.total": "الإجمالي",
  "common.yes": "نعم",
  "common.no": "لا",
  "common.help": "مساعدة",
  "common.settings": "الإعدادات",
  "common.loading": "جارِ التحميل…",
  "common.empty": "لا توجد بيانات",
  "nav.dashboard": "لوحة التحكم",
  "nav.reservations": "الحجوزات",
  "nav.guests": "النزلاء",
  "nav.rooms": "الغرف",
  "nav.payments": "المدفوعات",
  "nav.reports": "التقارير",
  "nav.settings": "الإعدادات",
  "nav.audit": "سجل العمليات",
  "settings.title": "الإعدادات",
  "settings.hotel": "بيانات الفندق",
  "settings.localization": "اللغة والمنطقة",
  "settings.billing": "الفوترة والضرائب",
  "settings.invoice": "قالب الفاتورة",
  "settings.backup": "النسخ الاحتياطي والاستعادة",
  "settings.shortcuts": "اختصارات لوحة المفاتيح",
  "backup.export": "تصدير نسخة كاملة",
  "backup.import": "استعادة من ملف",
  "backup.auto": "النسخ التلقائية (آخر 7 أيام)",
  "backup.restore": "استعادة",
  "backup.restored": "تمت الاستعادة. سيُعاد التحميل…",
  "backup.exported": "تم تنزيل النسخة الاحتياطية",
  "backup.invalid": "ملف النسخة غير صالح",
  "toast.saved": "تم حفظ الإعدادات",
};

const dicts: Record<Lang, Dict> = { en, ar };

export function t(key: string, lang?: Lang): string {
  const l = lang ?? (useHotelStore.getState().settings.language as Lang) ?? "en";
  return dicts[l]?.[key] ?? dicts.en[key] ?? key;
}

/** React hook — re-renders when language changes. */
export function useT() {
  const lang = useHotelStore((s) => s.settings.language as Lang) ?? "en";
  const translate = (key: string) => dicts[lang]?.[key] ?? dicts.en[key] ?? key;
  return { t: translate, lang, dir: lang === "ar" ? "rtl" : "ltr" } as const;
}
