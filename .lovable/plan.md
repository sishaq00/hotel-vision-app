
# خطة Housekeeping الشاملة

## 1) نموذج البيانات (`src/store/hotel-store.ts`)

### تحديث `Room`
```ts
{
  housekeepingStatus: 'clean' | 'dirty' | 'inspected' | 'out-of-order' | 'departure' | 'stayover',
  taskType?: 'departure' | 'stayover' | 'touch-up' | 'deep-clean' | 'inspection',
  assignedHousekeeperId?: string,
  assignedAt?: string,
  cleaningStartedAt?: string,
  cleaningFinishedAt?: string,
  cleaningValue?: number,        // قيمة التنظيف (للأجور)
  dndFlag?: boolean,             // Do Not Disturb
  refusedService?: boolean,
  housekeepingNotes?: string,
  housekeepingPhotos?: string[], // base64 / URLs
}
```

### كيانات جديدة
```ts
Housekeeper {
  id, name, phone?, source: 'system-user' | 'external',
  systemUserId?: string,   // إذا من نظام المستخدمين
  active: boolean,
  capacity: number,        // أقصى عدد غرف/يوم
  hourlyRate?: number,
}

HousekeepingTeam {
  id, name, leaderId, memberIds: string[]
}

HousekeeperReport {  // تقرير الموظف بعد التنظيف
  id, housekeeperId, date,
  rooms: Array<{ roomNumber, taskType, finishedAt, notes?, photos?[] }>,
  status: 'submitted' | 'reviewed',
  submittedAt, reviewedAt?, reviewedBy?
}
```

### Actions جديدة
- `assignRoomsToHousekeeper(roomIds[], housekeeperId, taskType)`
- `assignRoomsToTeam(roomIds[], teamId, taskType)` — توزيع round-robin
- `autoDistribute(taskType?)` — يوزع كل Dirty على المتاحين حسب `capacity`
- `unassignRooms(roomIds[])`
- `markDND(roomId, flag)` / `markRefused(roomId, flag)`
- `startCleaning(roomId)` / `finishCleaning(roomId, notes?, photos?)` — للموظف
- `submitHousekeeperReport(housekeeperId)` — يحوّل غرفه المنتهية إلى تقرير
- `reviewReport(reportId)` — يفتح للمدير
- `runNightAuditHousekeeping()` — يُحوّل Clean→Departure/Stayover حسب الحجوزات

## 2) الصلاحيات (`src/lib/permissions.ts`)

- `housekeeping.update` — موجودة (للموظف يحدّث غرفه)
- `housekeeping.assign` — جديد (للمدير يعيّن)
- `housekeeping.manage-staff` — جديد (Housekeepers + Teams)
- `housekeeping.print` — جديد
- `housekeeping.review-reports` — جديد

## 3) الواجهة الرئيسية (`src/routes/housekeeping.tsx` — إعادة بناء)

### شريط علوي
```text
[Cancel] [Select Mode ✓]  Filters: Zone▾ Building▾ Floor▾ Status▾ Task▾
                          [Auto Distribute] [Manage Staff] [Reports 🔔3]
```

### في وضع Select Mode
- كل بطاقة غرفة فيها checkbox
- شريط سفلي ثابت يظهر:
  ```text
  3 rooms selected  [Express Assign ▾] [Mark DND] [Clear]
  ```

### بطاقة الغرفة (`RoomCard.tsx`)
- رقم الغرفة كبير + نوع السرير (K1KN, etc.)
- شارة لون حسب الحالة (Departure أحمر، Stayover أصفر، Clean أخضر، Inspected رمادي)
- Avatar الموظف المعيَّن (أو حرف أول من اسمه)
- علامات: 🚫 DND، ⚠ Refused، 🔧 Issue
- نقر → Detail dialog (history, notes, photos, report issue)

### Sidebar يمين: Assigned Panel
يعرض كل موظف نشط اليوم:
```text
👤 Fanar        12/15 ▓▓▓▓▓░  
👤 Lara          8/10 ▓▓▓▓░░  [Print]
👤 Mila M        3/8  ▓▓░░░░  
─────────────
[Print All] [Print By Floor] [Summary]
```

## 4) Dialogs جديدة

### `ExpressAssignDialog.tsx`
- Tab 1: **Individual** — قائمة Housekeepers + اختيار `taskType` + عدد الغرف المحدد
- Tab 2: **Team** — قائمة فرق + معاينة التوزيع (round-robin) قبل التأكيد
- زر Confirm → يستدعي action ويعرض toast

### `ManageHousekeepersDialog.tsx`
- جدول: الاسم، المصدر (System/External)، السعة، نشط
- زر Add: form (الاسم، الهاتف، السعة، اختياري ربط بـ system user)
- Edit / Deactivate

### `HousekeepingTeamsDialog.tsx`
- قائمة فرق + Add Team
- لكل فريق: اختيار Leader + Members من Housekeepers

### `RoomDetailDialog.tsx`
- History (من-إلى-من-متى)
- Notes timeline + Photos thumbnails
- زر **Report Maintenance Issue** → يفتح `MaintenanceTicketDialog` المعبّأ مسبقاً

### `HousekeeperReportsDialog.tsx` (للمدير)
- قائمة تقارير اليوم
- نقر → معاينة الغرف المنتهية + أزرار جماعية: Mark all Clean / Mark all Inspected
- بعد المراجعة: تحديث حالات الغرف

## 5) شاشة الموظف (`src/routes/my-housekeeping.tsx`)

موبايل-فريندلي. يرى فقط غرفه المُعيَّنة:

```text
My Rooms — 8 assigned, 3 done
─────────────────────────────
[101] Departure   [Start]
[102] Stayover    🕐 in progress 12m  [Finish]
[103] Departure   ✓ Done 8m
...
[Submit Today's Report] (يظهر عند انتهاء الكل)
```

- زر Start → يحفظ `cleaningStartedAt`
- زر Finish → dialog (notes اختيارية + رفع صور إن وُجد تلف) → يحفظ `cleaningFinishedAt`
- زر Submit Report → ينشئ `HousekeeperReport` ويُرسل للمدير (إشعار في Bell)

## 6) Night Audit Integration

في `src/routes/night-audit.tsx`:
- إضافة بند جديد: **"Reclassify Housekeeping Rooms"**
- منطق `runNightAuditHousekeeping`:
  - لكل غرفة `housekeepingStatus === 'clean' || 'inspected'`:
    - ابحث عن حجز نشط فيها
    - إذا `checkOutDate <= today` → status = `departure`, taskType = `departure`
    - إذا الحجز مستمر → status = `stayover`, taskType = `stayover`
    - إذا لا حجز → تبقى `clean`
  - مسح `assignedHousekeeperId` لكل غرف اليوم السابق

## 7) Print Routes

- `src/routes/print.housekeeping.all.tsx` — كل التعيينات بطابع زمني + توقيع
- `src/routes/print.housekeeping.by-floor.tsx` — مجمّعة حسب الطابق
- `src/routes/print.housekeeping.summary.tsx` — إحصائيات: عدد الغرف/موظف، متوسط الوقت، Issues
- `src/routes/print.housekeeper-report.$reportId.tsx` — تقرير موظف للأرشفة

كلها A4، أبيض، Print-only CSS، حقول توقيع في الأسفل.

## 8) ربط Reservations

في `hotel-store`:
- `checkOut(reservationId)` → الغرفة `housekeepingStatus = 'dirty'`, `taskType = 'departure'`
- `checkIn(reservationId)` → التحقق من `housekeepingStatus === 'inspected' || 'clean'`، تحذير إن لم تكن جاهزة

## 9) إشعارات (`NotificationsBell`)

- "Housekeeper Fanar submitted today's report (12 rooms)"
- "Room 305 marked as Maintenance Issue"
- "DND on Room 210 — assignment skipped"

---

## الملفات

**جديدة:**
- `src/components/housekeeping/RoomCard.tsx`
- `src/components/housekeeping/HousekeepingFilters.tsx`
- `src/components/housekeeping/AssignedPanel.tsx`
- `src/components/housekeeping/ExpressAssignDialog.tsx`
- `src/components/housekeeping/ManageHousekeepersDialog.tsx`
- `src/components/housekeeping/HousekeepingTeamsDialog.tsx`
- `src/components/housekeeping/RoomDetailDialog.tsx`
- `src/components/housekeeping/HousekeeperReportsDialog.tsx`
- `src/lib/housekeeping-distribution.ts` (round-robin + auto-distribute)
- `src/routes/my-housekeeping.tsx`
- `src/routes/print.housekeeping.all.tsx`
- `src/routes/print.housekeeping.by-floor.tsx`
- `src/routes/print.housekeeping.summary.tsx`
- `src/routes/print.housekeeper-report.$reportId.tsx`

**معدّلة:**
- `src/store/hotel-store.ts` (نموذج + actions + night audit logic)
- `src/routes/housekeeping.tsx` (إعادة بناء كاملة)
- `src/routes/night-audit.tsx` (إضافة Reclassify)
- `src/lib/permissions.ts` (صلاحيات جديدة)
- `src/components/system/NotificationsBell.tsx`
- `src/components/layout/Sidebar.tsx` (إضافة رابط My Rooms للموظفين)

---

## ما لم يُدرج في هذه الجولة (تم تأجيله)
- Lost & Found — يمكن إضافته لاحقاً كموديول مستقل
- Minibar consumption — يربط لاحقاً مع POS
- Virtualization — يُضاف عند تجاوز 200 غرفة فعلياً

هل أبدأ التنفيذ؟
