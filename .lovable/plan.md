# فحص النظام: ما الناقص أو غير المرتبط

بعد فحص شامل للكود، النظام بشكل عام **متماسك ويعمل**، لكن وجدت **فجوات ترابط** و**تحسينات مهمة**:

---

## الفجوات الحقيقية (يجب إصلاحها)

### 1. `IssueCreditNoteDialog` يتيم — تم إنشاؤه ولا يُستخدم في أي صفحة
- `src/components/invoicing/IssueCreditNoteDialog.tsx` موجود
- لكن **لا يوجد زر** في أي مكان لفتحه
- **الحل**: إضافة زر "Issue Credit Note" في:
  - `src/routes/payments.tsx` (بجانب كل فاتورة مدفوعة)
  - `src/routes/search-invoice.tsx` (في تفاصيل الفاتورة)
  - `src/routes/archived-reservations.tsx` (للحجوزات المغادرة)

### 2. لا يوجد سجل/قائمة Credit Notes
- يتم حفظها في `creditNotes[]` لكن **لا توجد صفحة تعرضها**
- **الحل**: إنشاء `src/routes/credit-notes.tsx` لعرضها مع طباعة منفصلة، وإضافة رابطها في الـ Sidebar تحت Payments

### 3. Housekeeping ↔ Maintenance غير مربوط فعلياً
- خططنا "Report Issue → Maintenance" لكن لم يتم ربطه
- **الحل**: في `RoomDetailDialog` زر "Report Issue" يُنشئ فعلياً `MaintenanceTask` في الـ store ويحوّل الغرفة إلى `out-of-order`

### 4. Guest Profile ↔ Reservations history غير معروض
- وسّعنا بيانات الضيف، لكن صفحة `guest.$guestId.tsx` لا تعرض **سجل الحجوزات السابقة + إجمالي الإنفاق**
- **الحل**: إضافة قسم "Stay History" يحسب من `reservations` و`payments` المرتبطة بـ `guestId`

### 5. ربط VIP/DNR في صفحة الحجز
- علم `vipStatus` و`isDNR` على الضيف، لكن صفحة الحجز/Arrivals لا تظهر شارة تنبيه
- **الحل**: شارة VIP ⭐ / DNR 🚫 على بطاقات الحجوزات في `arrivals.tsx`, `in-house.tsx`, `reservations.tsx`

---

## تحسينات صغيرة مهمة (مقترحة)

### 6. ترجمة عربية لمفاتيح جديدة
- مفاتيح مثل `backup.exported`, `nav.guest-profiles`, "My Rooms (HK)" بعضها بدون ترجمة عربية مكتملة
- **الحل**: مراجعة `src/lib/i18n.ts` وإضافة الترجمات الناقصة

### 7. Night Audit لا يُفعّل Daily Backup قبل التشغيل
- النسخ الاحتياطي يعمل عند `AppBoot` فقط (يومي)
- **الأفضل**: تشغيل نسخة احتياطية إلزامية **قبل** Night Audit (لحظة حرجة) مع تأكيد المستخدم

### 8. صلاحيات Housekeeping الجديدة غير مدرجة في الافتراضيات
- `housekeeping.assign`, `housekeeping.manage-staff`, `housekeeping.print`, `housekeeping.review-reports` تم تعريفها لكن قد لا تكون في أدوار `manager`/`supervisor` افتراضياً
- **الحل**: التحقق من `permissions.ts` وإضافتها للأدوار المناسبة

### 9. لا يوجد Quick Search عام (Cmd+K)
- اقتراح: شريط بحث سريع في الـ Topbar للقفز إلى ضيف/حجز/غرفة برقم
- **اختياري** — يحسّن UX كثيراً

### 10. Print Credit Note منفصل
- عند إصدار Credit Note لا توجد صفحة طباعة مستقلة له (تظهر داخل الفاتورة فقط)
- **الحل**: `src/routes/print-credit-note.$noteId.tsx`

---

## خطة التنفيذ المقترحة (بالأولوية)

### المرحلة 1 — إصلاح الترابط الحرج (إلزامي)
1. ربط `IssueCreditNoteDialog` بأزرار في `payments.tsx` و`search-invoice.tsx`
2. إنشاء `src/routes/credit-notes.tsx` + رابط في Sidebar
3. إنشاء `src/routes/print-credit-note.$noteId.tsx`
4. ربط "Report Issue" في Housekeeping بإنشاء Maintenance Task فعلية
5. إضافة قسم Stay History + Total Spend في صفحة الضيف

### المرحلة 2 — شارات وتنبيهات
6. شارات VIP/DNR في صفحات الحجوزات (Arrivals, In-House, Reservations)
7. تأكيد + Backup إلزامي قبل Night Audit

### المرحلة 3 — تلميع
8. مراجعة الترجمات الناقصة (i18n)
9. التأكد من توزيع صلاحيات Housekeeping على الأدوار
10. (اختياري) Quick Search Cmd+K

---

## ما هو **سليم وكامل** (لا يحتاج عمل)

- ✅ Housekeeping: Select Mode, Express Assign, Auto Distribute, Teams, Reports, DND, Refused — كلها مربوطة
- ✅ Mobile staff view (`/my-housekeeping`) + submitReport flow
- ✅ Night Audit يحوّل Clean → Departure/Stayover حسب التواريخ
- ✅ Backup: Export/Import + Auto daily (7 نسخ) — مربوط في Settings
- ✅ Guest store: nationality, ID, photo, preferences, VIP, DNR — مع `EditGuestDialog`
- ✅ Invoice QR (ZATCA TLV) + ترقيم تسلسلي + Credit Note في الـ store
- ✅ جميع routes مُسجّلة في `routeTree.gen.ts` (49 route)
- ✅ لا يوجد TODO/FIXME معلّق في الكود

---

## السؤال

هل أنفّذ **المرحلة 1 كاملة** الآن (الإصلاحات الحرجة فقط، 5 مهام)، أم **المراحل الثلاث دفعة واحدة** (10 مهام)؟
