# Custom Rate Override — خطة التنفيذ

## الفكرة
السماح لموظف الاستقبال بتجاوز السعر الافتراضي للغرفة وإدخال سعر مخصص يدوياً في 3 مواضع: حجز جديد، تمديد إقامة، تسجيل مغادرة. كل تعديل يتطلب **سبب إلزامي** يُحفظ في الحجز.

---

## 1. مكوّن مشترك جديد
`src/components/reservations/CustomRateControl.tsx`

- زر `"Override Rate / سعر مخصص"` بـ Popover.
- داخله: حقل `Input type="number"` للسعر/الليلة + حقل `Textarea` للسبب (إلزامي).
- زر **Apply** (معطّل حتى يُملأ الحقلان) + زر **Cancel**.
- عند التفعيل: يظهر badge أصفر/برتقالي `"Manual rate $X · rack $Y · reason: ..."` مع زر X لإلغاء التعديل.
- Props: `defaultRate`, `currentRate`, `reason`, `onChange(rate, reason) | null`.

---

## 2. حجز جديد (`NewReservationDialog.tsx`)

- `state` جديد: `manualRate: number | null`, `rateReason: string`.
- يظهر `<CustomRateControl>` بين اختيار الغرفة وحقل الملاحظات.
- في **Price Summary**:
  - إذا `manualRate` مفعّل → يُستخدم بدل `computeStayPrice` (تُلغى rate plans مع تنبيه صغير).
  - الخصم (discount code) يبقى يعمل **فوق** السعر اليدوي.
  - يُعرض: `Manual rate $150 (rack $200)` + `Subtotal = manualRate × nights` + الخصم + الإجمالي النهائي.
- في `handleSubmit`:
  - إضافة ملاحظة تلقائية للحجز: `[Manual rate $150/night (rack $200) — Reason: VIP guest]`
  - `totalAmount` = (manualRate × nights) ثم تطبيق الخصم.

---

## 3. تمديد الإقامة (`ExtendStayDialog.tsx`)

- نفس `<CustomRateControl>` يظهر تحت اختيار التاريخ الجديد.
- السعر اليدوي يُطبَّق فقط على **الليالي الإضافية** (لا يغيّر سعر الليالي السابقة).
- ملاحظة تُضاف: `[Extension: manual rate $X/night × N extra nights — Reason: ...]`

---

## 4. تسجيل المغادرة (`CheckoutDialog.tsx`)

- بدلاً من override السعر/الليلة، يُتاح **Final adjustment** — حقل لتعديل المبلغ الإجمالي النهائي مباشرة (مع سبب إلزامي).
- مثال: تعويض عن مشكلة في الغرفة، خصم نهائي، إضافة رسوم.
- يُعرض: `Original total $450 → Adjusted $400 · Reason: AC complaint compensation`.
- ملاحظة تُضاف للحجز عند الـ checkout.

---

## 5. Audit / Print Log
- كل تعديل يُسجَّل عبر `print-log.ts` الموجود (entry type جديد: `"rate-override"`) مع: من، متى، الحجز، السعر القديم، السعر الجديد، السبب.
- يظهر في صفحة `/print-log` الموجودة.

---

## الملفات

**جديدة:**
- `src/components/reservations/CustomRateControl.tsx`

**معدّلة:**
- `src/components/reservations/NewReservationDialog.tsx`
- `src/components/reservations/ExtendStayDialog.tsx`
- `src/components/reservations/CheckoutDialog.tsx`
- `src/lib/print-log.ts` (إضافة نوع `rate-override` خفيف للسجل)

**لن يتغيّر:**
- منطق `computeStayPrice` و rate plans و discount codes (السعر اليدوي يتقدّم عليها فقط في الحجز الحالي).
- بنية البيانات في `hotel-store` — كل شيء يُحفظ ضمن `notes` و `totalAmount` الموجودين.

---

## ملاحظات تقنية
- التحقق من السعر: `> 0` و `<= 100000` (حد أعلى منطقي).
- التحقق من السبب: `trim().length >= 3`.
- Toast واضح عند التطبيق: `"Manual rate $150/night applied"`.
- اللغة العربية مدعومة في النصوص عبر نظام `useT()` الموجود.
