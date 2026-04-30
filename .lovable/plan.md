## ملخص

تحويل **Shift Management** ليكون قلب يوم الموظف: زر "إنهاء الشفت" يفتح **تقرير شفت تفصيلي** بكل عملياته (حجوزات، تمديد/تقليص، بيع منتجات/Minibar، مدفوعات نقدية، تغييرات غرف…)، مع **حقل توقيع** و**زر طباعة** ليرفقه مع المال المستلم.
بالإضافة: جعل **Night Audit** قابلاً للتشغيل في أي وقت + **تذكير تلقائي الساعة 3 صباحاً** عبر `NotificationsBell`.

---

## 1. ربط الشفت بالمستخدم الفعلي

**`src/store/hotel-store.ts`** — تعديل `startShift`:
- بدل أخذ `userName` يدوياً، يقرأ من `useAuthStore.getState().current()` ويأخذ `userId` و`userName` تلقائياً.
- إضافة `manualOpening` لإدخال الـ float النقدي الافتتاحي فقط.
- يمنع فتح أكثر من شفت مفتوح لنفس المستخدم.

**`src/routes/shift-management.tsx`**:
- زر "Start new shift" يستخدم المستخدم الحالي مباشرة (يختفي حقل الاسم).
- في "Currently open" يظهر زر **"إنهاء الشفت وعرض التقرير"** بدل الـ dialog البسيط الحالي.

---

## 2. تقرير الشفت (الحدث الرئيسي)

**ملف جديد:** `src/lib/shift-report.ts`
دالة `buildShiftReport(shiftId)` تجمع من `useActivityStore` + `useHotelStore` كل ما حدث **بين `startedAt` و الآن** ومن المستخدم نفسه:

| القسم | المحتوى |
|---|---|
| رأس | اسم الفندق + شعار + اسم الموظف + تاريخ ووقت بداية/نهاية الشفت + المدة |
| الحجوزات الجديدة | لكل حجز: ضيف، غرفة، تواريخ، السعر، الوقت |
| Check-in / Check-out | غرفة + ضيف + الوقت + المبلغ المحصل عند الخروج |
| **تمديد / تقليص الإقامة** | الغرفة، الليالي القديمة → الجديدة، فرق المبلغ، الوقت |
| **مبيعات منتجات (Minibar/Spa/…)** | اسم الصنف، الكمية، الغرفة المُحتسب عليها، السعر، الوقت |
| المدفوعات النقدية المستلمة | لكل دفعة: الحجز/الضيف، المبلغ، الوقت |
| استرجاع/تعديل دفعة | تفاصيل + سبب |
| تغييرات حالة الغرف | (Out of order, صيانة، تنظيف…) |
| **الملخص المالي** | مجموع المقبوض النقدي، عدد العمليات، رصيد الكاش الافتتاحي، الرصيد المتوقع للتسليم |
| التوقيعات | خانتان: توقيع الموظف + توقيع المستلم (المدير/المناوبة التالية) |

**ملف جديد:** `src/components/shifts/EndShiftReportDialog.tsx`
- Dialog كبير يعرض التقرير بشكل قابل للقراءة.
- حقل **"Closing cash count"** + ملاحظات.
- زر **🖨️ Print Shift Report** → يفتح نافذة طباعة بصفحة منسّقة A4.
- زر **📄 Download PDF** عبر `report-pdf.ts` (نفس النمط الموجود).
- زر **Confirm & Close Shift** يستدعي `endShift` مع المبلغ والملاحظات + يسجّل في `activity-store` (action: `shift.close`).

**ملف جديد:** `src/routes/print-shift.$shiftId.tsx`
- صفحة طباعة مستقلة (مثل `print-invoice`) بحجم A4، أبيض، خانة توقيع في الأسفل + سطر "المبلغ المسلَّم: ____ ____" يدوي.

---

## 3. ربط مبيعات المنتجات بالموظف

حالياً `productItems` لا تُسجَّل عمليات البيع. سنضيف:

**`hotel-store.ts`:**
- `interface ProductSale { id; productId; productName; quantity; unitPrice; total; roomId?; reservationId?; soldAt; userId; userName; shiftId? }`
- مصفوفة `productSales: ProductSale[]` + action `recordProductSale(...)` يقلّص المخزون ويضيف للـ activity log (`payment.record` + تفاصيل المنتج).

**`src/routes/product-inventory.tsx`** — إضافة زر "Sell" بجانب كل منتج يفتح dialog (الكمية + اختيار غرفة/حجز اختياري) → يستدعي `recordProductSale`.

تظهر هذه المبيعات تلقائياً في تقرير الشفت.

---

## 4. تمديد / تقليص الإقامة — تسجيل صريح

البحث الحالي عن action `reservation.extend` موجود في `activity-store`، لكن يجب التأكد من ربطه. إن لم يكن، إضافة:
- في `hotel-store.ts` → action `changeReservationDates(id, newCheckOut)` يحسب الفرق ويُسجّل في activity log:
  ```
  action: "reservation.extend"
  details: { oldCheckOut, newCheckOut, nightsDelta: +/-N, amountDelta }
  ```
- زر "Extend / Shorten stay" في `ReservationsTable` (موجود مسبقاً يحتاج فقط الربط بهذا الـ action إن لم يكن مربوطاً).

---

## 5. Night Audit — اختياري + تذكير 3 صباحاً

**`src/routes/night-audit.tsx`:**
- إزالة الإلزام بأن يكون `auditDate = اليوم`. السماح للمدير باختيار أي تاريخ من date picker.
- حفظ آخر تشغيل في `localStorage` key `nexora-last-night-audit`.

**`src/components/system/NotificationsBell.tsx`:**
- إضافة فحص: لو الساعة الحالية ≥ 3:00 صباحاً ولم يُشغَّل audit لتاريخ اليوم السابق → إضافة تنبيه `"Night Audit pending — last run: YYYY-MM-DD"` بلون warning يقود إلى `/night-audit`.

---

## 6. الصلاحيات

في `permissions.ts` (موجود):
- `shifts.manage` → فتح/إغلاق شفت خاص.
- `shifts.view-all` → المدير يرى تقارير كل الشفتات (جديد).
- `products.sell` → تنفيذ بيع منتج.
- المدير يحصل على الكل تلقائياً.

---

## 7. الملفات المتأثرة (ملخّص)

**جديد:**
- `src/lib/shift-report.ts`
- `src/components/shifts/EndShiftReportDialog.tsx`
- `src/components/shifts/SellProductDialog.tsx`
- `src/routes/print-shift.$shiftId.tsx`

**معدّل:**
- `src/store/hotel-store.ts` — `startShift`, `endShift`, جديد: `productSales` + `recordProductSale`, تأكيد `extend` يسجّل في activity.
- `src/routes/shift-management.tsx` — استبدال EndShiftDialog بـ EndShiftReportDialog، استخدام المستخدم الحالي.
- `src/routes/product-inventory.tsx` — زر Sell.
- `src/routes/night-audit.tsx` — date picker + حفظ آخر تشغيل.
- `src/components/system/NotificationsBell.tsx` — تنبيه 3 صباحاً.
- `src/lib/permissions.ts` — صلاحيات جديدة.

---

## ملاحظات إضافية أقترح إضافتها

1. **تنبيه قبل إنهاء الشفت** إذا الكاش المعدود ≠ (الافتتاحي + المقبوض النقدي) → يطلب تأكيد + سبب الفرق.
2. **قفل الشفت بعد الإغلاق** — لا يمكن تعديل أي عملية مسجَّلة فيه (read-only) لمنع التلاعب اللاحق.
3. **رابط مباشر من تقرير المدير** (`/reports/user-activity`) لفتح/طباعة أي شفت سابق.
4. **مجموع التوقيعات الإلكترونية** — لاحقاً يمكن إضافة canvas للتوقيع بالماوس/اللمس وحفظه كصورة في الـ shift record.

هل تريد إضافة هذه الأربع نقاط أيضاً؟ أم أبدأ بالخطة كما هي؟
