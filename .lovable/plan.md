# خطة بناء NEXORA OS بهيكل HOTEL KEY الكامل (بدون أي ميزات أونلاين)

نعتمد القائمة الجانبية في الصورة كمرجع رسمي لـ NEXORA OS، مع استبعاد كل ما يخص الحجز الأونلاين أو برامج الولاء العالمية أو قنوات OTA.

---

## 1. الهيكل العام للواجهة (مطابق للصورة)

### Header (شريط علوي)
- **يسار**: لوغو + اسم الفندق + كود مختصر (مثال: `Staybridge Suites - Detroit (DTTSH)`)
- **وسط**: التاريخ الحالي بصيغة `Tue, Apr 28, 2026`
- **يمين**: 
  - قائمة اللغة (عربي/إنجليزي)
  - زر Help
  - بروفايل المستخدم مع اسم الموظف الحالي + قائمة منسدلة (Profile, Logout)

### Sidebar (قائمة جانبية يسرى — قابلة للطي)
ترتيب العناصر بالضبط كما في الصورة (مع حذف IHG):

```text
Dashboard
In House
Departures
Arrivals
Recently Viewed
Availability
Search Reservations
Bulk Routing and Postings ▼
  ├─ Bulk Routing Setup
  └─ Fast Posting
More ▼
  ├─ Archived Reservations
  ├─ Batch Process
  ├─ Group Master
  ├─ Guest Profiles
  ├─ Search Invoice
  ├─ Open Folios
  ├─ Maintenance
  ├─ Housekeeping
  ├─ Reminders
  ├─ Night Audit
  ├─ House Inventory
  ├─ Product Inventory
  ├─ House Accounts
  ├─ Lost and Found
  ├─ Shift Management
  └─ Advance Deposits
Report Queue
Reports ↗ (يفتح صفحة كاملة)
─────────
TrainKey (في الأسفل — اختياري)
Default (في الأسفل — Brand)
```

### Dashboard (الصفحة الرئيسية)
ثلاثة أقسام أفقية مع شارات:
1. **House** — In House, Departures, Dirty Rooms, Ready Rooms
2. **Bookings** — Arrivals, No Show/Late Cancel, Advance Deposits, Booked Today
3. **Availability** — Total Rooms, Out Of Order, Sold, Available

تحت كل قسم: KPI Cards بنفس تصميم الصورة (رقم كبير + label + Footer بمعلومات إضافية مثل "Stay Overs: 51 — Arrivals: 0").

**6 أزرار Quick Actions كبيرة (3×2)**:
| Walk In | New Booking | New Group Master |
| Start Shift | Search Reservations | Grid View and Floor Plan |

زر **Start Shift** يتبدّل لـ **End Shift** بعد فتح الوردية.

---

## 2. مراحل التنفيذ (5 مراحل)

### المرحلة A — الواجهة الجديدة + Dashboard كامل + Quick Actions
- بناء AppShell جديد: Header + Sidebar مطابقة للصورة
- إعادة هيكلة `src/store/hotel-store.ts` إلى **v3**:
  - Room: `housekeepingStatus` (clean/dirty/inspected/out-of-order), `smokingAllowed`, `accessible`, `floor`
  - Reservation: `source` (walk-in/phone/group فقط — **بدون online/OTA**), `noShow`, `groupMasterId?`, `confirmationNumber`, `recentlyViewedAt`
  - Guest: `phone`, `country`, `doNotRent`, `vip`
  - كيانات جديدة: `Shift`, `Reminder`, `AdvanceDeposit`, `MaintenanceTicket`, `HousekeepingTask`, `LostFoundItem`, `GroupMaster`, `Folio`, `HouseAccount`, `InventoryItem`, `ProductItem`, `RoutingRule`
- صفحة Dashboard الجديدة بـ 3 أقسام (House/Bookings/Availability) و12+ KPI Card
- شريط 6 Quick Actions
- Header (اللغة + Help + User Menu)

### المرحلة B — صفحات Front Desk الأساسية
- `/in-house` — جدول الإقامات الحالية
- `/departures` — مغادرات اليوم مع زر Check-out
- `/arrivals` — وصول اليوم مع زر Check-in
- `/recently-viewed` — آخر 20 حجز فُتح
- `/availability` — Grid View (مخطط الغرف × التواريخ) + Floor Plan
- `/search-reservations` — بحث متقدم: اسم/هاتف/تأكيد/رقم غرفة
- `/archived-reservations` — أرشيف
- `/guest-profiles` — توسعة صفحة Guests الحالية

### المرحلة C — Operations
- `/housekeeping` — تبديل حالة الغرف، تعيين موظفة
- `/maintenance` — تذاكر صيانة (وصف، أولوية، حالة)
- `/shift-management` — Start/End Shift، رصيد كاش، ملخص الوردية
- `/reminders` — إدارة التذكيرات
- `/lost-found` — تسجيل المفقودات
- `/night-audit` — معالج إغلاق ليلي + تقرير + backup JSON
- `/batch-process` — إلغاء No-Show تلقائياً، تحديث أسعار جماعي

### المرحلة D — Billing & Inventory
- `/open-folios` — Folios المفتوحة
- `/search-invoice` — بحث في كل الفواتير
- `/advance-deposits` — تسجيل/تطبيق/استرجاع
- `/bulk-routing/setup` — قواعد توجيه المصاريف
- `/bulk-routing/fast-posting` — إضافة مصاريف سريعة لعدة غرف
- `/group-master` — Group Master (حجز جماعي بسعر موحّد)
- `/house-accounts` — حسابات داخلية (Staff, Promo, Owner)
- `/house-inventory` — مناشف، شراشف، أدوات نظافة
- `/product-inventory` — مينيبار، spa (مرتبط بـ Fast Posting)

### المرحلة E — Reports Hub + Report Queue
- `/reports` — Hub بـ 14 فئة (مرجع: قائمتك السابقة من 120+ تقرير)
- `/report-queue` — جدولة + سجل تشغيل
- تنفيذ التقارير على 3 موجات (F1: 25 أساسية، F2: 30 مالية، F3: 30 متخصصة)
- **حذف**: أي تقرير يخص OTA/Channel/Online Booking Source/Travel Agent Online

---

## 3. الميزات المُستبعدة صراحةً (لا أونلاين)

| ميزة | السبب |
|---|---|
| IHG One Rewards Member | برنامج ولاء IHG العالمي — مرتبط بـ OTA |
| Online Check-in / Mobile Key | ميزة أونلاين |
| Web Booking Engine | ميزة أونلاين |
| Channel Manager (Booking.com, Expedia) | ميزة أونلاين |
| Travel Agent Online Portal | ميزة أونلاين |
| Reservation Source = Online/OTA | يبقى فقط: Walk-in / Phone / Group / Direct |
| Email Confirmations الآلية للحجز الأونلاين | غير مطلوب |

**مع الإبقاء على**: طباعة الفواتير PDF، تصدير Excel، تذكيرات داخلية، كل عمليات الفرونت ديسك اليدوية.

---

## 4. الجوانب التقنية

- **التخزين**: Zustand + persist (localStorage فقط، بدون Cloud)
- **Migrations**: v2 → v3 تدريجي مع الحفاظ على البيانات الحالية
- **Audit Log**: كل عملية تُسجَّل تلقائياً
- **Smart Search**: Fuse.js للبحث الضبابي
- **PDF**: jsPDF + jspdf-autotable
- **Grid View**: شبكة غرف × تواريخ بـ drag-and-drop
- **اللغة**: i18n خفيف (عربي/إنجليزي) — RTL/LTR تلقائي
- **Layout**: استخدام `SidebarProvider` الموجود في `src/components/ui/sidebar.tsx`

---

## 5. ترتيب البدء

أبدأ فوراً بـ **المرحلة A** (الواجهة + Dashboard كامل + Quick Actions + توسيع البيانات) لأنها الأساس البصري للنظام كله. باقي المراحل صفحات منفصلة تُبنى تباعاً.

هل أبدأ بالمرحلة A الآن؟ أم تفضّل ترتيباً مختلفاً (مثلاً: A + B معاً)؟
