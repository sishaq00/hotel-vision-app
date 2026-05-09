## السيناريوهات الحالية للـ Check-out — ما يعمل وما هو ناقص

### ما هو موجود حالياً
- `CheckoutDialog` يبني فاتورة من `previewInvoice` ويُظهر Total / VAT / Service fee.
- `markPaid` يسجّل دفعة تلقائية بقيمة `invoice.total` عند الـ check-out.
- `TodayGuestsPanel` يعرض Balance = `totalAmount - paid` (الأخضر إذا 0).

### الفجوات (Bugs / مخاطر)

1. **لا يوجد تحذير قبل الـ Check-out عند وجود رصيد غير مدفوع.**
   `handleConfirm(false)` (Check-out only، بدون mark paid) يخرج الضيف ويترك رصيداً مفتوحاً دون أي تنبيه — هذا هو أهم نقص.

2. **مبيعات المنتجات (Pepsi / Mini-bar / POS) لا تُضاف إلى `totalAmount`.**
   `recordProductSale` يخزّن البيع في `productSales` فقط، و `buildInvoice` لا يضمّها. ⇒ الضيف يخرج بدون دفع ثمن المنتجات.

3. **Folio charges (laundry / spa / restaurant / other) لا تُضاف إلى الفاتورة.**
   `postFolioCharge` يخزّنها في `folios[].charges` لكن `buildInvoice` لا يقرأ منها.

4. **رسوم الـ overstay** (التي أضفناها سابقاً عبر night audit) تُحدِّث `totalAmount` بشكل صحيح، لكن لا يوجد مؤشّر بصري أمام اسم الضيف يُحذّر الموظف عند الـ check-out.

5. **لا توجد علامة بصرية في `TodayGuestsPanel` تُظهر "هذا الضيف عليه دفع N$ — Y ليلة غير مدفوعة".**

---

## الحل المقترح

### 1. حساب موحّد للـ outstanding balance — `src/store/hotel-store.ts`
أضف selector `getReservationBalance(resId)` يُرجع:
```
{
  roomTotal,         // res.totalAmount (room + nights + overstay)
  productsTotal,     // Σ productSales[reservationId].total
  foliosTotal,       // Σ folios[reservationId].charges[].amount
  taxAndFees,        // محسوبة على المجموع
  grandTotal,
  paid,              // Σ payments[reservationId, status=paid]
  balance,           // grandTotal - paid
  unpaidNights,      // عدد الليالي التي لم تُغطَّ بالدفعات
}
```

### 2. ضمّ Products + Folio charges في الفاتورة — `buildInvoice`
أضف بنوداً منفصلة (Mini-bar, Laundry, …) بحيث تظهر في invoice و PDF وتُحتسب ضمن الإجمالي.

### 3. تحذير عند الـ Check-out — `src/components/reservations/CheckoutDialog.tsx`
- إذا `balance > 0` و المستخدم يضغط **"Check-out only"** (بدون `markPaid`):
  اعرض `<AlertDialog>` أحمر:
  > **رصيد متبقّي $X** — يحتوي: غرفة $A · منتجات $B · لوندري $C.
  > لا يمكن الـ Check-out قبل التسوية. الخيارات:
  > - **Record payment & check-out** (الموصى به)
  > - **Move balance to House Account** (للحجوزات الشركاتية)
  > - **Force check-out (مسؤول فقط)** — يتطلّب صلاحية `force-checkout` ويُسجَّل في activity log.
- اعرض ملخّص بنود الـ balance داخل الـ dialog قبل التأكيد.

### 4. شارة بصرية في `TodayGuestsPanel` — أمام الاسم
- إذا `balance > 0`: شارة حمراء صغيرة `⚠ $123.00 · 2 unpaid nights` بجانب اسم الضيف.
- إذا overstay (auditDate ≥ checkOut و status=checked-in): شارة برتقالية `Overstay · N nights`.
- زر "Check-out" في الـ dialog يُعطَّل (disabled) ويتحوّل إلى زر "Settle balance" حتى تُسوَّى الرسوم.

### 5. منع الـ Check-out على مستوى الـ store
في `checkOut(id)` أضِف فحصاً:
```ts
if (!opts?.markPaid && !opts?.force && balance > 0) {
  return { ok: false, error: "Outstanding balance — settle or force." };
}
```
وعدّل واجهة `CheckoutDialog` للتعامل مع الإرجاع الجديد.

### 6. نقطة مرئية إضافية
`StatusBadge` للحجز يُضيف نقطة حمراء صغيرة عند وجود balance، لتظهر في صفحة Reservations و In-house و Departures.

---

## الملفات المتأثرة
- `src/store/hotel-store.ts` — selector جديد، تعديل `buildInvoice` + `checkOut` guard.
- `src/components/reservations/CheckoutDialog.tsx` — تحذير + ملخّص بنود + AlertDialog.
- `src/components/dashboard/TodayGuestsPanel.tsx` — شارة balance / overstay.
- `src/components/dashboard/StatusBadge.tsx` — نقطة dot.
- (اختياري) `src/lib/permissions.ts` — صلاحية `force-checkout`.

## التحقّق
- ضيف نام ليلة، اشترى Pepsi $5، لم يدفع: Balance يعرض $104، الـ dialog يمنع الخروج.
- ضيف overstay 2 ليلة: شارة "Overstay 2N" + balance يساوي $198 (room) + extras.
- الضغط على "Record payment & check-out" يدفع الإجمالي الجديد كاملاً.
- "Force check-out" يخرج الضيف ويُبقي السجل في activity log مع ملاحظة `unpaid balance $X`.
