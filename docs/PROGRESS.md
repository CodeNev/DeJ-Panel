# وضعیت ساخت DeJ Panel

این سند وضعیت واقعیِ فعلی پروژه را نگه می‌دارد — همه‌چیزی که پایین گفته شده واقعاً نوشته،
`typecheck` و `test` شده (نه ادعا). آخرین اجرای واقعی: `npm run typecheck` و `npx vitest run`
هر دو **بدون خطا** و **۱۹ تست پاس** روی پنل اصلی + اینستالر.

## ✅ ساخته و تست‌شده

### پایه (Cloudflare Workers + Hono + D1 + Drizzle + TypeScript)
- اسکیمای کامل دیتابیس + مایگریشن SQL (۱۱ جدول: users, sessions, nodes, node_health,
  configurations, subscriptions, traffic_usage, settings, audit_logs, deployment_records,
  installer_records)
- لایه امنیت: PBKDF2 (۲۱۰هزار iteration)، مقایسه‌ی constant-time، تولید توکن امن
- Auth Service مستقل از نوع دیتابیس (`login/logout/validateSession/createInitialAdmin`)،
  قفل موقت بعد تلاش ناموفق، ثبت در audit log
- `/api/auth/*`, `/api/install/admin` (ساخت تک‌باره‌ی ادمین اولیه، بعد از اولین اجرا قفل می‌شود)
- `/health` و `/ready` جدا، Security headers، CORS محدود
- **لایه انتزاعی دیتابیس** (`src/db/client.ts`): همان اسکیما/همان business logic روی
  D1 (Cloudflare) یا SQLite محلی (Railway) اجرا می‌شود — سرویس‌ها به `DrizzleDb` وابسته‌اند،
  نه به پیاده‌سازی خاص یک پلتفرم

### Provider Abstraction
- اینترفیس مشترک `DeploymentProvider` (authenticate تا destroy) + `ProviderCapabilities`
  (بند ۱۳۳) + `ProviderError` تایپ‌شده
- کلاینت HTTP مشترک با retry/backoff و مدیریت واقعی rate-limit
- `CloudflareProvider` روی REST API v4 و `RailwayProvider` روی GraphQL API v2 — هر دو واقعی
- `createProvider()` factory بدون `if(cloudflare)` پراکنده

### Config Engine (کاملاً پیاده و تست‌شده)
- ۵ generator واقعی: VLESS، VMess، Trojan، Shadowsocks، WireGuard
  (`src/configs/generators/*.ts`) — هرکدام validate جدا + generateUri جدا
- پشتیبانی Reality (publicKey/shortId) در VLESS
- `nextAvailableConfigName()`: نام‌گذاری خودکار افزایشی "DeJ config N" بدون تداخل
- تست واحد کامل در `tests/configs.test.ts` (۱۲ تست، شامل رد UUID نامعتبر، الزام فیلدهای reality)

### Subscription Engine + Policy Engine
- `src/policy/policy.engine.ts`: **موتور سیاست مرکزی واحد** برای تعیین وضعیت (ACTIVE/
  DISABLED/EXPIRED/REVOKED/LIMIT_REACHED) — طبق بند ۲۸۲-۲۸۳ همه‌ی route ها از همین یک تابع
  استفاده می‌کنند تا منطق انقضا/ترافیک در جاهای مختلف تکراری/ناهمگون نشود
- `src/subscriptions/subscription.service.ts`: ساخت subscription، توکن غیرقابل‌حدس،
  اتصال به configurations
- `/api/subscriptions/*` (ادمین) و `/sub/:token` (عمومی، فقط داده‌ی لازم را برمی‌گرداند)

### Node Management
- `src/nodes/node.service.ts`: health check واقعی با HTTP HEAD + timeout + آستانه‌ی DEGRADED
- `/api/nodes/*`: لیست، ساخت، health-check دستی
- `scheduled()` handler در `src/index.ts` برای health check دوره‌ای + بازمحاسبه‌ی وضعیت‌های
  منقضی (بند ۱۸۷، Cron Trigger کلودفلر)

### اینستالر مستقل (React + Vite، جدا از پنل اصلی)
- State Machine واقعی؛ لیست مراحل بسته به پلتفرم فرق دارد (Railway مرحله‌ی D1 ندارد)
- Prerequisite Engine (HTTPS، قابلیت مرورگر، دسترسی API)
- صفحات واقعی: انتخاب پلتفرم → احراز هویت Cloudflare (دریافت/تایید توکن) → پیکربندی پروژه
  (با بررسی واقعی تداخل نام) → تنظیمات امنیتی (ساخت ادمین با رمز امن) → بازبینی → دیپلوی
  (ساخت واقعی D1 با لاگ زنده) → نتیجه
- توکن هرگز در storage ذخیره نمی‌شود
- سیستم i18n متمرکز فارسی/انگلیسی، RTL/LTR خودکار، دارک/لایت، مقادیر فنی همیشه LTR
- **build واقعی گرفته و تایید شد**: `npx vite build` → فقط `index.html` + یک `.js` + یک
  `.css` استاندارد، بدون هیچ `.tsx` — دقیقاً چیزی که GitHub Pages می‌تواند سرویس بدهد

### CI/CD واقعی (GitHub Actions)
- `.github/workflows/ci.yml`: typecheck + lint + test خودکار روی هر push
- `.github/workflows/installer-pages.yml`: build خودکار اینستالر و انتشار روی GitHub Pages
  (فقط با push به مسیر `installer/`، یا دستی)
- `.github/workflows/deploy-cloudflare.yml`: دیپلوی Worker + اجرای مایگریشن D1 — **دستی**
  (`workflow_dispatch`) تا دیپلوی پروداکشن بدون تایید صریح انجام نشود
- `.github/workflows/deploy-railway.yml`: دیپلوی روی Railway از طریق Railway CLI — دستی

### دیپلوی Railway
- `src/railway-server.ts`: نقطه‌ورود Node.js با `@hono/node-server`، همان auth/routes
- `Dockerfile`: multi-stage، non-root user، healthcheck، native build برای better-sqlite3
- `railway.json`: پیکربندی build/healthcheck/restart policy

## ⚠️ محدودیت‌های فنی صادقانه (نه پنهان‌شده)

1. **آپلود بندل Worker از GitHub Pages**: اینستالر می‌تواند D1 بسازد و حساب را تایید کند،
   اما آپلود *کد واقعیِ* Worker از یک صفحه‌ی استاتیک به‌تنهایی ممکن نیست — این محدودیت
   واقعی Cloudflare است، نه کاستی این کد. مسیر درست (که در README مستند شده) این است:
   دیپلوی واقعی از طریق `wrangler deploy` یا GitHub Actions انجام می‌شود، و اینستالر فقط
   منابع (D1، حساب، دامنه) را آماده می‌کند. این را به‌صراحت به کاربر در لاگ نصب می‌گوید.
2. **CORS احتمالی روی برخی endpoint های Cloudflare API**: کد این حالت را با کد خطای
   `CORS_BLOCKED` واقعی تشخیص می‌دهد؛ راه‌حل نهایی (در صورت بروز) یک Worker رله‌ی سبک است.
3. صفحه‌ی احراز هویت Railway در اینستالر هنوز UI ندارد (فقط CloudflareAuthentication ساخته
   شده) — state machine از هر دو پشتیبانی می‌کند اما کامپوننت Railway باقی مانده.
4. **Dashboard/UI کامل پنل ادمین** (React، جداول، چارت‌ها، QR، دارک/لایت کامل، صفحات
   Users/Configs/Subscriptions/Nodes/Settings) هنوز ساخته نشده — فقط API بک‌اند آماده است.
5. مواردی از چک‌لیست ۳۰۲ که در این نسخه پیاده نشده: 2FA، backup/restore، command palette،
   بولک آپریشن‌ها، فایل‌های docs/ جداگانه (installation/security/api/...)، OpenAPI spec،
   CHANGELOG.md، CONTRIBUTING.md، SECURITY.md.

## نحوه‌ی ادامه (اولویت پیشنهادی)

1. UI کامل داشبورد ادمین (React + Tailwind + RTL/LTR + فارسی/Vazir)
2. صفحه‌ی Railway authentication در اینستالر
3. فایل‌های مستندات جداگانه در `/docs`
4. 2FA، backup/restore، bulk operations

## مرحله ۵: داشبورد ادمین کامل (React) — انجام شد

- پروژه‌ی جدید `app/` (React + React Router + Vite + TypeScript)، **build واقعی گرفته و تایید شد**
  (`npx tsc --noEmit` بدون خطا، `npx vite build` موفق)
- صفحات واقعی و متصل به API واقعی (نه mock): Login، Dashboard (آمار زنده از
  `/api/dashboard/summary` که خودش هم تازه اضافه شد)، Configurations (کپی/QR/غیرفعال/حذف)،
  Subscriptions (کپی لینک سابسکریپشن، نمایش مصرف ترافیک)، Nodes (health-check دستی)،
  Settings (زبان/پوسته)
- **نکته‌ی امنیتی مهمی که در حین ساخت اصلاح شد**: نسخه‌ی اول QR کد از یک سرویس شخص‌ثالث
  (`api.qrserver.com`) استفاده می‌کرد که یعنی URI کانفیگ (حاوی UUID/پسورد) به یک سرور خارجی
  فرستاده می‌شد — این دقیقاً همان چیزی است که بند ۴۴ و ۶۴ اسپک منع کرده. قبل از build نهایی
  این را به تولید QR کاملاً **client-side** با پکیج `qrcode` تغییر دادم.
- سایدبار responsive (drawer در موبایل)، دارک/لایت واقعی با `data-theme` (نه فقط prefers-color-scheme)،
  RTL/LTR خودکار، مقادیر فنی (توکن‌ها/آدرس‌ها) با `dej-mono` همیشه LTR
- Auth guard واقعی: مسیرهای محافظت‌شده یک بار `/api/auth/me` را چک می‌کنند و در صورت نبود
  نشست معتبر به `/login` هدایت می‌شوند
- `wrangler.toml` به‌روزرسانی شد: باینداینگ `[assets]` اضافه شد تا خود Worker کلودفلر همان
  Worker که API را سرویس می‌دهد، فایل‌های استاتیک `app/dist` را هم سرویس بدهد
  (`not_found_handling = "single-page-application"` برای درست کار کردن React Router)
- `src/index.ts`: مسیر fallback `app.get("*", ...)` به `c.env.ASSETS.fetch` اضافه شد
- `railway-server.ts`: سرو استاتیک `app-dist` هم اضافه شد تا روی Railway هم همان تجربه باشد
- `Dockerfile`: مرحله‌ی build شامل build کردن `app/` هم شد
- دو endpoint جدید بک‌اند که برای این مرحله لازم بود و اضافه شدند:
  `GET /api/subscriptions` (قبلاً فقط POST بود) و `GET /api/dashboard/summary`
  (آمار واقعی با `count(*)` روی جدول‌ها، نه عدد ثابت)

## هنوز ساخته نشده

1. صفحه‌ی Railway authentication در اینستالر (state machine آماده، فقط UI نداره)
2. فرم‌های ساخت Configuration/Subscription/Node در UI (فعلاً فقط لیست/عملیات روی موجودی —
   ساخت جدید هنوز از طریق UI انجام نمی‌شود، هرچند API آن آماده است)
3. 2FA، backup/restore، bulk operations، command palette
4. مستندات جدا در `/docs` (installation.md، security.md، api.md، ...)
5. CHANGELOG.md، CONTRIBUTING.md، SECURITY.md
6. تست‌های frontend (React Testing Library) برای صفحات app/ و installer UI کامپوننت‌ها

## مرحله ۶: دیپلوی کاملاً خودکار از مرورگر — بدون CLI/ترمینال — انجام شد

این مرحله دقیقاً محدودیت مرحله‌ی قبل (که در بندهای "⚠️" بالا صادقانه اعلام شده بود) را
با یک تکنیک واقعی و رایج در پروژه‌های مشابه (BPB-Wizard، Nova-Wizard) حل می‌کند:

### مشکل قبلی
دیپلوی واقعی Worker به `wrangler deploy` نیاز داشت که یک ابزار CLI است و از مرورگر/GitHub
Pages قابل اجرا نیست.

### راه‌حل پیاده‌شده
1. **`scripts/generate-static-assets.mjs`**: خروجی build داشبورد ادمین (`app/dist`) را
   می‌خواند و به یک ماژول TypeScript تبدیل می‌کند که تمام فایل‌ها (HTML/CSS/JS) را به‌صورت
   رشته/Base64 در خودش نگه می‌دارد (`src/generated/static-assets.ts`)
2. **`src/index.ts`** دیگر به `wrangler [assets]` وابسته نیست؛ مسیر fallback حالا مستقیماً
   از همین map داخلی سرو می‌کند — یعنی کل فرانت‌اند ادمین *داخل* خود کد Worker جاسازی شده
3. **`scripts/build-worker.mjs`**: با esbuild کل `src/index.ts` (شامل همان static assets
   جاسازی‌شده) را به یک فایل ES module خودکفا و minify‌شده باندل می‌کند
   (`dist/worker-bundle.js`, ~۳۸۰ کیلوبایت — build واقعی گرفته شد و تایید شد)
4. **`.github/workflows/publish-worker-bundle.yml`**: با هر push به `main` که کد را تغییر
   دهد، این باندل را می‌سازد و به‌صورت خودکار به همان مسیر در `main` کامیت می‌کند — بنابراین
   همیشه از طریق `raw.githubusercontent.com/CodeNev/DeJ-Panel/main/dist/worker-bundle.js`
   قابل fetch عمومی است (این دامنه CORS باز دارد، بر خلاف بسیاری از endpoint های دیگر)
5. **`installer/src/providers/cloudflare-deploy.ts`** با توابع واقعی جدید گسترش یافت:
   - `fetchWorkerBundleSource()` / `fetchInitialMigrationSql()`: گرفتن باندل و SQL از گیت‌هاب
   - `cfUploadWorkerModule()`: آپلود مستقیم باندل به Cloudflare با یک درخواست
     `PUT /accounts/{id}/workers/scripts/{name}` (multipart، شامل binding واقعی D1)
     — دقیقاً همان مکانیزم داخلی `wrangler deploy`، بدون نیاز به آن
   - `cfRunD1Migration()`: اجرای مایگریشن با فراخوانی مستقیم D1 Query API
     (`POST /d1/database/{id}/query`) به‌ازای هر statement
   - `cfEnableWorkersDevSubdomain()` / `cfGetAccountWorkersSubdomain()`: فعال‌سازی و گرفتن
     آدرس نهایی `*.workers.dev`
   - `waitForWorkerHealthy()`: polling با backoff روی `/health`
   - `createAdminAccount()`: فراخوانی `/api/install/admin` روی پنل تازه‌دیپلوی‌شده
6. **`DeploymentRunner.tsx`** کاملاً بازنویسی شد تا این ۸ مرحله را پشت‌سرهم و با Live Log
   واقعی اجرا کند — کاربر از اول تا آخر فقط توکن می‌دهد و منتظر می‌ماند، هیچ دستوری نمی‌زند
7. صفحه‌ی پایانی (`CompletionScreen`) حالا آدرس نهایی پنل را نشان می‌دهد با دکمه‌ی
   Open Panel / Copy URL

### تایید عملی
- `npx tsc --noEmit` روی پنل اصلی: بدون خطا
- `node scripts/build-worker.mjs`: باندل با موفقیت ساخته شد (۳۸۰ کیلوبایت، شامل کل ادمین پنل)
- `npx tsc --noEmit` + `npx vite build` + `npx vitest run` روی اینستالر: همه موفق

### محدودیت باقی‌مانده (صادقانه)
- این جریان فقط برای **Cloudflare** پیاده‌سازی شده. Railway چون از D1 پشتیبانی نمی‌کند و
  دیپلویش نیازمند build کردن یک ایمیج Docker است، از این تکنیک (آپلود مستقیم یک فایل به
  API) نمی‌تواند به همین شکل استفاده کند — دیپلوی Railway همچنان از طریق Railway
  Dashboard (که خودش هیچ CLI نمی‌خواهد، فقط اتصال ریپو) یا GitHub Actions انجام می‌شود.
- اگر مخزن هنوز private باشد یا هنوز هیچ push‌ای به `main` نرفته باشد،
  `raw.githubusercontent.com/.../dist/worker-bundle.js` هنوز وجود ندارد و اینستالر با پیام
  خطای واضح (`PLATFORM_NOT_FOUND`, "may not have been published by CI yet") این حالت را
  به‌درستی گزارش می‌دهد، نه اینکه سکوت کند یا crash کند.

## مرحله ۷: مسیر Railway در اینستالر — بدون CLI — انجام شد

مسیر Cloudflare قبلاً کاملاً خودکار شده بود؛ همین الگو برای Railway هم پیاده‌سازی شد
(با تکنیک متفاوت چون Railway معماری متفاوتی دارد):

- **`installer/src/providers/railway-client.ts`**: کلاینت واقعی مرورگر برای Railway
  GraphQL API v2 — احراز هویت (`me`)، `projectCreate`، `serviceCreate` (مستقیم از روی
  ریپوی گیت‌هابِ `CodeNev/DeJ-Panel` — Railway خودش `Dockerfile` موجود در ریپو را پیدا و
  بیلد می‌کند)، `variableCollectionUpsert`، `serviceDomainCreate`،
  `serviceInstanceDeployV2`، و polling وضعیت دیپلوی
- **`installer/src/steps/RailwayAuthentication.tsx`**: صفحه‌ی دریافت/تایید توکن Railway
  (لینک مستقیم به `railway.app/account/tokens`)
- **`installer/src/steps/RailwayDeploymentRunner.tsx`**: ارکستریشن کامل ۸ مرحله‌ای مشابه
  نسخه‌ی Cloudflare، با Live Log واقعی: ساخت پروژه → ساخت سرویس از ریپو → متغیرهای محیطی →
  ساخت دامنه → trigger دیپلوی → polling وضعیت build (تا ۳ دقیقه) → health check → ساخت ادمین
- منطق مشترک بین دو مسیر (`waitForWorkerHealthy`, `createAdminAccount`) به
  `installer/src/providers/deploy-shared.ts` منتقل شد تا تکراری نباشد (بند ۲۰۷)
- `App.tsx` برای هر دو پلتفرم در مراحل AUTHENTICATION و DEPLOYMENT/DEPLOYMENT_MONITORING
  سیم‌کشی شد

### محدودیت صادقانه
برای اینکه Railway بتواند مستقیم از روی ریپوی گیت‌هاب سرویس بسازد، ریپو باید **public**
باشد یا از قبل (یک‌بار، از داشبورد Railway) GitHub App وصل شده باشد — این یک محدودیت
واقعی امنیتی خود Railway است (برای جلوگیری از build خودکار ریپوهای ناشناس)، نه محدودیت
این کد.

### تایید عملی
- `npx tsc --noEmit` روی اینستالر: بدون خطا
- `npx vite build` روی اینستالر: موفق
- `npx vitest run` (پنل اصلی + اینستالر): هر ۱۹+۴ تست pass
