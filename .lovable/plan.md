## الهدف

إضافة شاشة تقرير للمدير تعرض **كل عمليات تعديل السعر اليدوي (Manual Rate Override)** التي قام بها موظفو الاستقبال — مع فلترة، بحث، تصدير، وإحصائيات سريعة.

البيانات موجودة بالفعل في `localStorage` عبر `recordRateOverride()` — نحتاج فقط واجهة لعرضها.

---

## الميزات

### 1. شاشة جديدة `/rate-overrides`
- **جدول** يعرض: التاريخ/الوقت، الموظف، نوع العملية (حجز جديد / تمديد / checkout)، الغرفة، النزيل، السعر الأصلي، السعر اليدوي، الفرق (±)، السبب.
- **شارات ملونة**:
  - أخضر للخصم (السعر الجديد < الأصلي)
  - أحمر للزيادة (السعر الجديد > الأصلي)
  - شارة لكل context (New / Extend / Checkout)

### 2. KPI Cards في الأعلى
- إجمالي عمليات Override (هذا الشهر / كل الوقت)
- إجمالي قيمة الخصومات الممنوحة (مجموع الفروقات السالبة)
- إجمالي الزيادات (الموجبة)
- أكثر موظف قام بـ Override

### 3. فلاتر
- بحث نصي (اسم النزيل / رقم الغرفة / السبب / اسم الموظف)
- فلتر حسب الـ Context (الكل / حجز جديد / تمديد / checkout)
- فلتر حسب الموظف (Select)
- فلتر حسب التاريخ (اليوم / آخر 7 أيام / هذا الشهر / الكل)

### 4. تصدير وإدارة
- زر **Export CSV** (يستخدم `src/lib/excel.ts` الموجود)
- زر **Print** لطباعة التقرير
- زر **Clear log** (للمدير فقط، مع تأكيد)

### 5. ربط في الواجهة
- إضافة رابط في الـ Sidebar بجوار "Print Log" تحت قسم Audit، باسم **"Rate Overrides"** وأيقونة `Pencil` أو `DollarSign`.
- محمي بصلاحية `audit.view` (نفس Print Log).

---

## التفاصيل التقنية

### ملفات جديدة
- **`src/routes/rate-overrides.tsx`** — الشاشة الكاملة، تستهلك `listRateOverrideLog()` من `src/lib/print-log.ts`.

### ملفات معدّلة
- **`src/components/layout/AppSidebar.tsx`** — إضافة عنصر nav جديد تحت قسم Audit (السطر ~390).
- **`src/lib/print-log.ts`** — إضافة helper صغير `getRateOverrideStats()` (اختياري) لحساب KPIs، أو نحسبها inline في الشاشة.

### استخدام الموارد الموجودة
- `Card`, `Table`, `Badge`, `Input`, `Select`, `Button` من `@/components/ui/*`
- `EmptyState` من `@/components/system/EmptyState`
- `useConfirm` من `@/components/system/ConfirmDialog` للحذف
- `exportRowsToCsv` من `src/lib/excel.ts`
- `useT` للترجمة
- `useHotelStore` لربط `reservationId` بالنزيل/الغرفة عند الحاجة

### السلوك
- البيانات **client-side فقط** (localStorage) — لا server functions مطلوبة.
- فرز افتراضي: الأحدث أولاً.
- عند النقر على صف → فتح صفحة الحجز إن وُجد (`/search-reservations?q=...` أو ما يشبه).

---

## ملاحظة

كل عملية Override تحدث من الآن وصاعداً ستظهر تلقائياً. العمليات السابقة قبل تطبيق ميزة Manual Rate لن تظهر (لا توجد بيانات تاريخية).
