## استبدال ملفات المشروع بالنسخة المرفوعة

سأقوم بمسح الملفات الحالية للمشروع واستبدالها بالكامل من ملف `NEXORA-OS-final.zip`.

### المحتوى المكتشف في الـ ZIP
- مشروع TanStack Start v1 كامل (React 19, Tailwind 4, Zustand, shadcn/ui)
- `src/` يحوي: 52 صفحة (routes)، 80+ مكون، store، lib، sync engine
- `public/` (icon, manifest, landing.html)
- `scripts/` (إعداد LAN server)
- ملفات الإعداد: `package.json`, `vite.config.ts`, `tsconfig.json`, `wrangler.jsonc`, `components.json`, `eslint.config.js`, `bunfig.toml`, `.prettierrc`, `.prettierignore`

### الخطوات

1. **حذف الملفات الحالية في الجذر**
   - `src/`, `public/`, `scripts/`
   - ملفات الإعداد القابلة للاستبدال: `package.json`, `vite.config.ts`, `tsconfig.json`, `wrangler.jsonc`, `components.json`, `eslint.config.js`, `bunfig.toml`, `.prettierrc`, `.prettierignore`
   - **الاحتفاظ بـ**: `.lovable/`, `.git/`, `node_modules/`, `mem://`, أي ملفات بيئة (`.env*`)

2. **نسخ كل محتويات الـ ZIP** إلى جذر المشروع كما هي.

3. **تثبيت الاعتماديات** عبر `bun install` (الـ `package.json` الجديد يحوي نفس stack المتوقع).

4. **إعادة توليد `routeTree.gen.ts`** تلقائيًا بواسطة Vite عند أول build/dev.

5. **التحقق**: تشغيل البناء والتأكد من عدم وجود أخطاء.

### ملاحظات
- لن أمس ذاكرة المشروع (`mem://`) ولا إعدادات Lovable.
- إذا كان هناك Lovable Cloud مفعّل، الجداول تبقى كما هي على الـ backend (الـ ZIP لا يحوي migrations).
- بعد الاستبدال ستضيع كل التعديلات السابقة (CheckoutDialog، TodayGuestsPanel، hotel-store) وتُستبدل بنسخة الـ ZIP.

هل أتابع؟