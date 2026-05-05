## Goal
1. اجعل أزرار **Extend** و **Check-out** داخل لوحة "Today's guests" تنفّذ تحديثاً حقيقياً (تواريخ، حالة، balance) بدل أن تبدو معطّلة.
2. أضف رابط **Rooms** في الشريط الجانبي ليصل لصفحة `/rooms` (إدارة الغرف).

## Issue diagnosis
- المكوّنان `CheckoutDialog` و `ExtendStayDialog` يستدعيان فعلاً `useHotelStore.checkOut()` و `extendStay()` — أي تحديث الحالة جاهز.
- المشكلة: في `TodayGuestsPanel.tsx` يتم فتحهما **داخل** Dialog آخر (تفاصيل الضيف) لا يزال مفتوحاً (`openId` لم يُمسح). يؤدي ذلك إلى تعارض في الـ overlay/focus ويبدو الزر بلا أثر.
- صفحة `/rooms` موجودة لكن لا يوجد رابط لها في `AppSidebar.tsx` (لا في `topItems` ولا `moreItems`).

## Changes

### 1) `src/components/dashboard/TodayGuestsPanel.tsx`
- عند الضغط على **Extend** أو **Check-out** من داخل dialog تفاصيل الضيف:
  - أغلق dialog التفاصيل أولاً (`setOpenId(null)`) ثم افتح الـ Checkout/Extend dialog (تجنّب تداخل Dialogs).
- بعد إغلاق `CheckoutDialog` أو `ExtendStayDialog` بنجاح، الجدول سيحدّث نفسه تلقائياً لأن البيانات من `useHotelStore` (zustand reactive). لا حاجة لإعادة جلب يدوي.
- إصلاح صغير: مرّر `open`/`onOpenChange` بشكل متوافق لـ `ExtendStayDialog` (يأخذ `reservation`+`onClose` فقط — صحيح بالفعل).

### 2) `src/components/layout/AppSidebar.tsx`
- أضف عنصراً جديداً في `topItems` (أو في بداية `moreItems`):
  ```ts
  { key: "nav.rooms", url: "/rooms", icon: BedDouble, permission: "rooms.manage" }
  ```
- استخدم أيقونة موجودة (مثل `BedDouble` المستوردة أصلاً) لتفادي استيرادات إضافية، أو `LayoutGrid`.
- تأكّد أن مفتاح الترجمة `nav.rooms` موجود في `src/lib/i18n.ts`؛ إن لم يكن، أضفه (EN: "Rooms", AR: "الغرف").

## Verification
- اضغط على ضيف في "Today's guests" → اضغط **Check-out** → يكتمل، تختفي الحجز من القائمة، تتحدّث Rooms Grid (الغرفة → dirty)، الـ balance يصبح 0.
- اضغط **Extend** → اختر تاريخ جديد → يُحدّث `checkOut` و `totalAmount`، الجدول يعكسها فوراً.
- في الشريط الجانبي يظهر رابط **Rooms** ويفتح `/rooms`.
