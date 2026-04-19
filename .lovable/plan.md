
## NEXORA OS — Hotel Management Web App

تطبيق ويب احترافي يحاكي نظام إدارة فنادق SaaS حديث، بنفس الواجهة المطلوبة لكن أقوى وأسرع من Excel.

### 🎨 التصميم (Design System)
- **خلفية:** رمادي فاتح `#F5F6F8`
- **سايدبار:** Navy داكن مع أيقونات Lucide
- **بطاقات بيضاء:** زوايا مدورة، ظلال ناعمة (soft shadows)
- **Accent:** أزرق `#3B82F6`
- **خط:** Inter (بديل عصري لـ Segoe UI)
- جميع الألوان معرّفة كـ semantic tokens في `index.css`

### 📐 البنية (Routes)
كل قسم في صفحة منفصلة (SSR-friendly، مثل تطبيقات SaaS الحقيقية):
- `/` — **Dashboard** (KPIs + رسوم بيانية + آخر النشاطات)
- `/reservations` — جدول الحجوزات + زر "New Reservation"
- `/rooms` — شبكة الغرف بحالاتها (Available/Occupied/Cleaning)
- `/guests` — قائمة النزلاء
- `/payments` — المدفوعات والفواتير
- `/reports` — تقارير مع رسوم بيانية (Recharts)
- `/settings` — إعدادات الفندق

### 🧩 المكونات الأساسية
1. **AppSidebar** — Navy داكن، أيقونات + نصوص، Active state واضح، قابل للطي على الموبايل
2. **TopBar** — بحث + إشعارات + بروفايل المستخدم
3. **KPI Cards** (في الـ Dashboard):
   - Occupied Rooms / Available Rooms / Check-ins Today / Check-outs Today
   - مع أيقونة + رقم كبير + نسبة التغير
4. **Charts** — Occupancy trend (Line) + Revenue (Bar) باستخدام Recharts
5. **Recent Reservations Table** — آخر 5 حجوزات
6. **Reservation Dialog** — نموذج إضافة حجز جديد (Guest, Room, Dates, Status)

### ⚙️ الوظائف التفاعلية (بديل VBA)
- **التنقل بين الأقسام** — TanStack Router مع Active state
- **إضافة حجز جديد** — Dialog + form + تحديث فوري
- **Check-in / Check-out** — أزرار سريعة على كل حجز تحدث الحالة
- **حساب KPIs تلقائياً** — مشتقة من بيانات الحجوزات والغرف
- **بحث وفلترة** — في كل جدول
- **State Management** — Zustand لحفظ البيانات في الجلسة

### 💾 البيانات
- **بدون Lovable Cloud في البداية** — كل البيانات in-memory (Zustand store) مع seed data خفيف للعرض الأولي
- يمكنك لاحقاً ربطه بـ Lovable Cloud لحفظ دائم + مستخدمين متعددين

### 📱 Responsive
- Sidebar يصبح drawer على الموبايل
- KPI cards: 4 أعمدة → 2 → 1
- الجداول قابلة للتمرير الأفقي

### ✨ تفاصيل تعطي إحساس "تطبيق حقيقي"
- Loading states + skeletons
- Toast notifications عند الإجراءات
- Smooth transitions بين الصفحات
- Hover effects على كل العناصر التفاعلية
- أيقونات حالة ملونة (badges)

بعد الموافقة سأبدأ ببناء المشروع كاملاً جاهز للاستخدام. 🚀
