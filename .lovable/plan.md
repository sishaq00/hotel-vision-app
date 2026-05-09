## الفهم

أنت محقّ، يوجد خطأ في منطق الـ Night Audit الحالي.

**الحالة:**
- الحجز: Check-in `2026-05-03`، Check-out `2026-05-04` (ليلة واحدة، السعر $99).
- اليوم `2026-05-05`، الضيف لم يخرج (overstay).
- الـ Balance يعرض $99 فقط — رغم أنه نام ليلتين إضافيتين (ليلة 4→5 وقريباً 5→6).

**السبب في الكود:**
في `postNightlyRoomCharges` (`src/store/hotel-store.ts` سطر 2195):
```
if (!(res.checkIn <= auditDate && auditDate < res.checkOut)) return res;
```
هذا الشرط يتجاهل أي ليلة بعد `checkOut` ⇒ overstay لا يُحاسَب أبداً.

## الحل

عند تشغيل Night Audit، إذا كان الضيف لا يزال `checked-in` ويومٌ ما بعد `checkOut` (overstay)، نُسجّل ليلة إضافية ونمدّد `checkOut` تلقائياً يوماً واحداً، فيظهر اللون أخضر مرة أخرى ويزداد الـ balance بشكل صحيح.

### `src/store/hotel-store.ts` — `postNightlyRoomCharges`

استبدل شرط الفلترة بثلاث حالات:

1. **ليلة عادية:** `checkIn <= auditDate < checkOut` ⇒ سجّل room charge (كما هو الآن).
2. **Overstay:** `auditDate >= checkOut` و `status === "checked-in"` ⇒
   - سجّل room charge بسعر الغرفة.
   - مدّد `checkOut` إلى `auditDate + 1 day` بحيث يبقى الحجز فعّالاً ويعود الصف أخضر.
   - أضف ملاحظة `[Auto-extended due to overstay]` وسجّل في `activity-store` بـ action مختلف (`overstay-charge`).
3. **قبل تاريخ الدخول:** تجاهل.

استخدم `lastNightlyChargeDate === auditDate` لمنع التكرار في كلا الحالتين.

### `src/routes/night-audit.tsx`

عدّل الـ toast ليعرض عدد رسوم overstay منفصلاً عن الرسوم العادية (مثلاً: "Posted 3 nightly + 1 overstay charges, $396 total").

غيّر إرجاع الدالة إلى `{ count, total, overstayCount }` لتظهر القيمة في الـ wizard.

## التحقّق

- حجز 5/3 → 5/4، Night Audit بتاريخ 5/5:
  - تُسجَّل ليلة overstay واحدة بـ $99.
  - `checkOut` يصبح `2026-05-06`.
  - Total = $198، Balance = $198، الصف **أخضر**.
- إذا أُعيد Night Audit بنفس اليوم: لا تكرار (محمي بـ `lastNightlyChargeDate`).
- إذا دفع الضيف ثم خرج فعلياً: Check-out يعمل كالعادة.
