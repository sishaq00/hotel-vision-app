## الفهم
1. ألوان صفوف "Today's guests" يجب أن تعكس حالة الإقامة بدقة:
   - **أخضر (Staying)** — الضيف داخل مدّة الحجز (`checkOut > today` أو لم يُعمل Night Audit بعد لليوم الحالي).
   - **أحمر (Departing)** — بعد تشغيل Night Audit، إذا أصبح `checkOut <= todayAfterAudit` ولا يزال `checked-in` ⇒ يجب أن يخرج اليوم.
   - **وردي (Checked-out)** — بعد إجراء Check-out فعلياً (نُبقي الصف لساعات قليلة في القائمة بلون وردي بدل إخفائه فوراً).
   - عند **Extend** يعود الصف للأخضر تلقائياً لأن `checkOut` أصبح أكبر من اليوم.

2. **Auto-charge ليلي** عند Night Audit:
   - حالياً Night Audit لا يُنشئ أي رسم تلقائي (لا يوجد `autoCharge`). الـ balance ثابت = `totalAmount − paid`.
   - المطلوب: عند تشغيل Night Audit، لكل حجز `checked-in`، يُنشأ تلقائياً **room charge** لليلة المنقضية = `room.price` (يُضاف إلى `totalAmount` للحجز ويُسجَّل كـ folio charge من نوع `room`)، حتى يظهر الرصيد المتبقي بوضوح إذا لم يدفع الضيف الليلة.

## التغييرات

### 1) `src/store/hotel-store.ts`
- أضف داخل `runNightAuditHousekeeping` (أو دالة جديدة `postNightlyRoomCharges(auditDate)` تُستدعى من Night Audit):
  - لكل حجز `status === "checked-in"` و `checkIn <= auditDate < checkOut`:
    - أنشئ `FolioCharge` { type: "room", description: `Room night ${auditDate}`, amount: room.price, postedAt: now }
    - زِد `reservation.totalAmount += room.price`.
    - أضف سجل في `activity-store` كـ `night-audit-room-charge`.
  - حماية ضد التكرار: خزّن في الحجز حقل `lastNightlyChargeDate?: string`؛ تخطَّ إذا كان `=== auditDate`.
- أضف Selector مساعد `getRowState(reservation, today, lastAuditDate)` يرجع `"staying" | "departing" | "checked-out"`:
  - `checked-out` ⇒ "checked-out"
  - `checked-in` و `checkOut <= effectiveToday` (effectiveToday = max(today, lastAuditDate)) ⇒ "departing"
  - وإلا ⇒ "staying"

### 2) `src/routes/night-audit.tsx`
- في `stepReport` (أو خطوة جديدة قبل التقرير): استدعِ `postNightlyRoomCharges(auditDate)` وأظهر toast بعدد الرسوم المُسجَّلة والمبلغ الإجمالي.
- اعرض الرقم في صفحة الـ wizard كـ Stat "Nightly charges posted".

### 3) `src/components/dashboard/TodayGuestsPanel.tsx`
- اقرأ `lastNightAuditDate` من المتجر.
- استبدل منطق `departing = res.checkOut === today` بـ `getRowState(...)` ليأخذ Night Audit بالحسبان.
- أضف لوناً وردياً للحجوزات `checked-out` التي تمّت اليوم (اعرض آخر 6 ساعات مثلاً)، نمط:
  - Staying: `bg-success/5 hover:bg-success/10` + شارة خضراء
  - Departing: `bg-destructive/5 hover:bg-destructive/10` + شارة حمراء
  - Checked-out: `bg-pink-500/5 hover:bg-pink-500/10` + شارة وردية "Checked-out"
- وسّع الـ filter ليشمل: `checked-in` + `checked-out` (آخر 6 ساعات فقط).
- أضف الشارة الثالثة "Checked-out" في الـ legend أعلى اللوحة.

### 4) (اختياري بسيط) `src/components/dashboard/RoomsGridPanel.tsx`
- نفس منطق اللون للغرف ذات حجز `departing` بعد الـ audit.

## التحقّق
- مثال: حجز 5/5 → 6/5، اليوم 5/5: الصف **أخضر**.
- شغّل Night Audit بتاريخ 6/5: الصف يصبح **أحمر** + يُسجَّل room charge لليلة 5/5 ويزداد الـ balance بـ `room.price`.
- إذا مدّد الضيف إلى 7/5 ⇒ يعود **أخضر**.
- إذا تمّ Check-out ⇒ **وردي** ويظهر لفترة قصيرة ثم يختفي تلقائياً.
- لا يتكرر الـ nightly charge إذا أُعيد تشغيل Night Audit بنفس اليوم (بفضل `lastNightlyChargeDate`).
