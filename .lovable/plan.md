## الفهم الكامل للمتطلبات

1. **النظام يبقى أوفلاين 100%** — لا Cloud، لا Supabase، كل البيانات في `localStorage`.
2. **حساب مدير (Admin)** بصلاحيات كاملة + إنشاء حسابات موظفين (Reception/Staff).
3. **صلاحيات مرنة لكل موظف** — المدير يحدّد ما يستطيع كل موظف فعله.
4. **الدفع نقداً فقط (Cash)** — حذف بطاقات/بوابات إلكترونية.
5. **Night Audit يدوي** يشغّله الموظف، مع نظام إشعارات.
6. **🆕 تقارير محاسبية تفصيلية لكل مستخدم** — كل عملية تُنسب لمن قام بها (مدّد ليلة، قبض مبلغ، سجّل دخول/خروج…).

---

## 1. نظام المستخدمين والصلاحيات (Offline)

**ملف جديد:** `src/store/auth-store.ts` (Zustand + persist)

- جدول `users`: `{ id, username, passwordHash, fullName, role: "admin" | "staff", permissions: string[], active, createdAt }`
- جلسة حالية: `{ userId, loginAt }`
- كلمات السر بـ **SHA-256** عبر Web Crypto API.
- مستخدم افتراضي عند أول تشغيل: `admin / admin123` مع تنبيه لتغييرها.

**قائمة الصلاحيات:**
```
dashboard.view
reservations.view / .create / .edit / .cancel / .extend
checkin.perform / checkout.perform
rooms.view / rooms.manage
guests.view / guests.manage
housekeeping.view / .update
maintenance.manage
payments.view / payments.record / payments.refund
reports.view / reports.export / reports.user-activity
night-audit.run
shifts.manage
users.manage          ← Admin فقط
settings.manage       ← Admin فقط
audit.view            ← Admin فقط
```

المدير يحصل تلقائياً على كل الصلاحيات.

---

## 2. صفحات جديدة

| المسار | الوصف |
|---|---|
| `/login` | تسجيل دخول (username + password). |
| `/_authenticated/*` | Layout يحمي كل الصفحات الداخلية. |
| `/users` | إدارة المستخدمين — Admin فقط. إضافة/تعطيل/إعادة كلمة سر/تعديل صلاحيات. |
| `/profile` | تغيير كلمة السر الشخصية. |
| `/reports/user-activity` | **🆕 تقرير نشاط المستخدمين** (تفاصيل أدناه). |

---

## 3. 🆕 نظام تتبّع نشاط المستخدمين (Activity Log)

**ملف جديد:** `src/store/activity-store.ts`

كل عملية حسّاسة تُسجَّل تلقائياً مع:
```ts
{
  id, userId, userName, timestamp,
  action: "login" | "logout" | "reservation.create" | "reservation.extend" 
        | "checkin" | "checkout" | "payment.record" | "payment.refund"
        | "night-audit" | "room.status-change" | "user.create" | ...,
  entityType: "reservation" | "payment" | "room" | "guest" | "user",
  entityId: string,
  amount?: number,           // للعمليات المالية
  details: {                 // معلومات إضافية حسب نوع العملية
    roomNumber?, guestName?, oldValue?, newValue?, nightsAdded?, ...
  }
}
```

**نقاط الربط (يُسجَّل تلقائياً عند):**
- تسجيل دخول/خروج المستخدم.
- إنشاء/تعديل/إلغاء حجز.
- Check-in / Check-out.
- **تمديد ليلة (Extend stay)** — مع عدد الليالي والمبلغ الإضافي.
- استلام دفعة نقدية — مع المبلغ والحجز المرتبط.
- استرجاع/تعديل دفعة.
- تشغيل Night Audit.
- تغيير حالة غرفة (Out of order / Maintenance).
- إدارة المستخدمين (إنشاء، تعطيل، تعديل صلاحيات).

---

## 4. 🆕 صفحة تقرير نشاط المستخدم `/reports/user-activity`

**القسم 1: ملخص لكل مستخدم (جدول)**
| المستخدم | عدد العمليات | حجوزات أنشأها | Check-ins | Check-outs | تمديدات | إجمالي المقبوض (Cash) | عدد المناوبات |
|---|---|---|---|---|---|---|---|

**القسم 2: تفاصيل العمليات** — جدول قابل للفلترة:
- فلتر بالمستخدم.
- فلتر بنطاق التاريخ (من/إلى).
- فلتر بنوع العملية.
- فلتر بالغرفة/الضيف.

**القسم 3: ملخص مالي لكل مستخدم**
- إجمالي المقبوضات النقدية لكل موظف خلال الفترة.
- متوسط قيمة الحجز.
- عدد الإلغاءات.

**التصدير:**
- زر **Export Excel** (XLSX) — جدول كامل لجميع العمليات + ورقة منفصلة للملخص لكل مستخدم.
- زر **Export PDF** — تقرير مطبوع بشعار الفندق + الفترة + اسم المُصدِر.
- زر **Print**.

**صلاحية الوصول:**
- `reports.user-activity` للموظفين (يرى نشاطه فقط افتراضياً).
- Admin يرى الكل ويستطيع التصدير.

---

## 5. تعديلات على الواجهة الحالية

- **TopBar:** اسم المستخدم الحقيقي + زر **Logout** + اسم الدور (Admin/Staff).
- **Sidebar:** فلترة العناصر تلقائياً حسب صلاحيات المستخدم. رابط "Users" و"User Activity Report" يظهران للمدير فقط (أو حسب الصلاحية).
- **CheckoutDialog / PaymentForm:** Cash فقط، إزالة Card/Bank/Online من `paymentSchema`.
- **NewReservationDialog / Extend Stay:** عند الحفظ، يُسجَّل العامل الذي قام بالعملية.

---

## 6. Night Audit يدوي + الإشعارات

- زر بارز في `/night-audit` (موجود) يتحقق من صلاحية `night-audit.run`.
- عند التنفيذ: يقفل اليوم، يحسب إيرادات اليوم، يأخذ snapshot، يُسجَّل في activity log باسم الموظف.
- تذكير في `NotificationsBell` بعد 11 مساءً إذا لم يُشغَّل اليوم.

---

## 7. الملفات المتأثرة

**ملفات جديدة:**
- `src/lib/crypto.ts` — SHA-256 helper
- `src/lib/permissions.ts` — قائمة الصلاحيات + helpers (`hasPermission`)
- `src/store/auth-store.ts`
- `src/store/activity-store.ts`
- `src/routes/login.tsx`
- `src/routes/_authenticated.tsx` — layout حماية
- `src/routes/_authenticated/users.tsx`
- `src/routes/_authenticated/profile.tsx`
- `src/routes/_authenticated/reports.user-activity.tsx`
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/PermissionGate.tsx`
- `src/components/users/UserFormDialog.tsx`
- `src/components/users/PermissionsEditor.tsx`
- `src/components/reports/UserActivityTable.tsx`
- `src/components/reports/UserActivitySummary.tsx`
- `src/lib/activity-export.ts` — تصدير Excel/PDF

**ملفات معدّلة:**
- نقل كل المسارات الحالية تحت `_authenticated/`.
- `src/components/layout/TopBar.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/reservations/CheckoutDialog.tsx` + `NewReservationDialog.tsx`
- `src/lib/validation.ts` (paymentSchema → cash فقط)
- `src/routes/payments.tsx`
- `src/routes/night-audit.tsx`
- `src/components/system/NotificationsBell.tsx`
- `src/store/hotel-store.ts` — إضافة `createdByUserId` لكل عملية، ربط actions بـ activity logger.

---

## ⚠️ ملاحظات أمنية مهمة

- بما أن النظام أوفلاين، **أي شخص لديه وصول للجهاز يستطيع نظرياً فتح Developer Tools وقراءة localStorage**. هذا النظام يحمي من المستخدمين العاديين عبر الواجهة، لكنه ليس حماية ضد مهاجم تقني له وصول فيزيائي.
- لا يوجد "نسيت كلمة السر" — المدير وحده يعيد التعيين. إذا فقد المدير كلمته، الحل الوحيد مسح localStorage (وفقدان البيانات).
- للحماية الحقيقية مستقبلاً → Lovable Cloud مع RLS.

---

## ترتيب التنفيذ

1. `crypto.ts` + `permissions.ts` + `auth-store` + مستخدم admin افتراضي.
2. صفحة `/login` و layout `_authenticated`، نقل المسارات.
3. صفحة `/users` (إدارة الحسابات والصلاحيات).
4. تعديل TopBar + Sidebar.
5. `activity-store` + ربطها بكل actions في `hotel-store` (حجوزات، دفعات، تمديد، check-in/out).
6. صفحة `/reports/user-activity` + التصدير Excel/PDF.
7. تنظيف بوابات الدفع → Cash فقط.
8. Night Audit اليدوي + تذكير الإشعار.
9. اختبار شامل: admin → ينشئ موظف بصلاحيات محدودة → يسجّل دخوله → يجري عمليات → admin يفتح التقرير ويرى نشاطه بالأرقام.

---

هل توافق على الخطة؟ أو تريد تعديل (مثلاً: حقول إضافية في التقرير، دور ثالث كـ "محاسب"، أو تغيير اسم المدير الافتراضي)؟
