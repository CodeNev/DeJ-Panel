# DeJ Panel

پلتفرم مدیریت کانفیگ/سابسکریپشن با دو مسیر دیپلوی مستقل: **Cloudflare Workers + D1** یا **Railway**،
به همراه یک **اینستالر گرافیکی مستقل** که روی GitHub Pages اجرا می‌شود.

- ریپازیتوری: https://github.com/CodeNev/DeJ-Panel
- تلگرام: [@CodeNev](https://t.me/CodeNev)

## ساختار پروژه

```
/                       پنل اصلی (Hono + Drizzle) — روی Cloudflare یا Railway اجرا می‌شود
  src/
    index.ts            نقطه ورود Cloudflare Worker (API + سرو استاتیک app/dist)
    railway-server.ts   نقطه ورود Node.js برای Railway
    db/                 اسکیمای مشترک + آداپتور D1/SQLite (بدون تغییر منطق تجاری)
    auth/               احراز هویت (مستقل از نوع دیتابیس)
    providers/          لایه انتزاعی Cloudflare/Railway برای اینستالر و APIهای دیپلوی
    configs/            Config Engine (VLESS/VMess/Trojan/Shadowsocks/WireGuard)
    subscriptions/       Subscription Engine
    policy/             Policy Engine مرکزی (انقضا/ترافیک/وضعیت)
    nodes/              مدیریت و سلامت نودها
    api/                مسیرهای REST
  migrations/           مایگریشن‌های SQL دیتابیس
  Dockerfile            بیلد Railway (multi-stage, non-root)
  wrangler.toml         تنظیمات Cloudflare Worker + D1 binding + Assets binding
  railway.json          تنظیمات Railway

app/                    داشبورد ادمین — React + Router، build می‌شود به app/dist
                        و توسط خود Worker (Cloudflare) یا سرور Node (Railway) سرویس داده می‌شود
  src/pages/            Dashboard, Configurations, Subscriptions, Nodes, Settings, Login
  src/components/       Layout, StatCard, EmptyState
  src/api/client.ts     کلاینت مرکزی فراخوانی API با فرمت پاسخ استاندارد
  src/i18n/             سیستم متمرکز ترجمه فارسی/انگلیسی
  src/hooks/            مدیریت زبان/پوسته با پایداری در localStorage

installer/               اینستالر مستقل React — build می‌شود به فایل استاتیک برای GitHub Pages
  src/state/            State Machine نصب (پلتفرم‌محور، پویا)
  src/steps/            صفحات هر مرحله
  src/providers/        کلاینت‌های مرورگر برای Cloudflare API

.github/workflows/
  ci.yml                 تایپ‌چک/لینت/تست خودکار روی هر push
  installer-pages.yml    build خودکار اینستالر و انتشار روی GitHub Pages
  deploy-cloudflare.yml  دیپلوی دستی پنل روی Cloudflare (workflow_dispatch)
  deploy-railway.yml     دیپلوی دستی پنل روی Railway (workflow_dispatch)
```

## نکته‌ی مهم درباره‌ی GitHub Pages

GitHub Pages فقط فایل‌های استاتیک (HTML/CSS/JS) را سرویس می‌دهد و نمی‌تواند `.tsx`، `.ts` یا
هر فرمت دیگری غیر از خروجی نهایی مرورگر را مستقیماً اجرا کند. به همین دلیل اینستالر یک
پروژه‌ی **Vite** جداست: کد TypeScript/React نوشته می‌شود، ولی چیزی که واقعاً روی Pages آپلود
می‌شود خروجیِ build‌شده (`installer/dist`) است — یعنی فقط HTML/CSS/JS استاندارد. این کار را
لازم نیست دستی انجام بدهید؛ Workflow زیر خودش این کار را می‌کند.

## راه‌اندازی اینستالر روی GitHub Pages (خودکار)

1. ریپازیتوری را در گیت‌هاب خودتان فورک/push کنید.
2. در تنظیمات ریپو: **Settings → Pages → Source** را روی **GitHub Actions** بگذارید.
3. به **Actions** بروید و workflow با نام **Deploy Installer to GitHub Pages** را اجرا کنید
   (یا فقط یک push به مسیر `installer/` بزنید — به‌صورت خودکار اجرا می‌شود).
4. بعد از اتمام، آدرس اینستالر شما چیزی شبیه این خواهد بود:
   `https://<username>.github.io/DeJ-Panel/`

### اجرای دستی/محلی اینستالر (برای توسعه)

```bash
cd installer
npm install
npm run dev      # پیش‌نمایش محلی
npm run build    # تولید فایل‌های استاتیک نهایی در installer/dist
```

## دیپلوی پنل روی Cloudflare Workers + D1 — کاملاً از طریق مرورگر، بدون CLI و ترمینال

اینستالر (همان صفحه‌ی GitHub Pages بالا) کل فرایند را خودش انجام می‌دهد. کاری که شما انجام
می‌دهید فقط این‌هاست:

1. در اینستالر، پلتفرم **Cloudflare** را انتخاب کنید.
2. روی دکمه‌ی «دریافت/ساخت API Token» بزنید (به `dash.cloudflare.com/profile/api-tokens`
   می‌روید)، یک توکن با دسترسی‌های Workers Scripts:Edit و D1:Edit بسازید، برگردید و
   پیستش کنید.
3. نام Worker و نام دیتابیس را تایید کنید (یا پیش‌فرض را بگذارید).
4. یک نام‌کاربری/رمز برای حساب ادمین وارد کنید.
5. روی Deploy بزنید.

از همین‌جا به بعد، **همه‌چیز از داخل مرورگر و با فراخوانی مستقیم API کلودفلر** انجام می‌شود
— شبیه دقیقاً همان چیزی که در پروژه‌های مرجع (BPB-Wizard/Nova-Wizard) می‌بینید:

- دیتابیس D1 ساخته می‌شود
- آخرین نسخه‌ی build‌شده‌ی کامل Worker (شامل کد بک‌اند + کل داشبورد ادمین embed‌شده در همان
  فایل) مستقیماً از `raw.githubusercontent.com/CodeNev/DeJ-Panel/main/dist/worker-bundle.js`
  گرفته و با یک درخواست `PUT` به Cloudflare API آپلود می‌شود — این فایل را CI هر بار که
  کد عوض شود خودکار می‌سازد (`.github/workflows/publish-worker-bundle.yml`)
- مایگریشن دیتابیس با فراخوانی D1 Query API اجرا می‌شود
- ساب‌دامین `workers.dev` فعال می‌شود
- سلامت دیپلوی چک می‌شود
- حساب ادمین با همان API که ساختید می‌سازد

در پایان یک آدرس نهایی مثل `https://dej-panel.<subdomain>.workers.dev` می‌گیرید — همان‌جا
لاگین می‌کنید. **هیچ‌جا لازم نیست ترمینال باز کنید یا دستوری بزنید.**

### چرا این کار فنی ممکن است ولی قبلاً نبود؟

قبلاً برای دیپلوی Worker از `wrangler` CLI استفاده می‌شد که از یک صفحه‌ی استاتیک
قابل‌اجرا نیست. راه‌حل: کل اپلیکیشن (بک‌اند + فرانت‌اند ادمین) از قبل توسط CI به یک فایل
جاوااسکریپت خودکفا (`worker-bundle.js`) تبدیل می‌شود؛ اینستالر فقط همین یک فایل را می‌گیرد
و با `fetch()` مستقیم به Cloudflare Workers API آپلود می‌کند — این همان مکانیزم داخلی
`wrangler deploy` است، فقط بدون نیاز به نصب Node/CLI روی سیستم شما.

### گزینه‌ی جایگزین (اختیاری) — از طریق GitHub Actions

اگر ترجیح می‌دهید دیپلوی از طریق CI/CD و نه مستقیماً از اینستالر انجام شود:

1. در تنظیمات ریپو: **Settings → Secrets and variables → Actions** دو سکرت اضافه کنید:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
2. از تب **Actions**، workflow **Deploy to Cloudflare** را به‌صورت دستی اجرا کنید.

### ساخت حساب ادمین اولیه (اگر اینستالر استفاده نشد)

```bash
curl -X POST https://<your-worker-domain>/api/install/admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"یک-رمز-قوی"}'
```

این endpoint فقط تا وقتی هیچ ادمینی در دیتابیس نباشد کار می‌کند؛ بعد از اولین اجرا خودش
قفل می‌شود (خطای `ADMIN_EXISTS`).

## دیپلوی پنل روی Railway — هم از طریق اینستالر، بدون CLI

Railway از D1 پشتیبانی نمی‌کند، بنابراین پنل روی Railway از یک فایل **SQLite** محلی
(روی volume) استفاده می‌کند — همان اسکیما و همان منطق تجاری، فقط آداپتور دیتابیس فرق دارد
(`src/db/client.ts`). دیپلوی روی Railway هم از طریق آبجکت واقعی `Dockerfile` که در ریپو
هست ساخته می‌شود، پس نیازی به هیچ build دستی یا CLI نیست.

### گزینه‌ی ۱ — از طریق خود اینستالر (کاملاً از مرورگر)

در اینستالر، پلتفرم **Railway** را انتخاب کنید. یک توکن اکانت Railway از
`railway.app/account/tokens` بسازید و پیستش کنید. از همان‌جا:

- یک پروژه‌ی جدید Railway ساخته می‌شود
- یک سرویس مستقیماً از روی ریپازیتوری `CodeNev/DeJ-Panel` روی گیت‌هاب ساخته می‌شود
  (Railway خودش با فراخوانی API متوجه `Dockerfile` می‌شود و بیلد می‌کند — بدون نیاز به
  آپلود دستی کد)
- متغیرهای محیطی تنظیم می‌شوند
- یک دامنه‌ی عمومی (`*.up.railway.app`) ساخته می‌شود
- دیپلوی trigger و وضعیت build با polling دنبال می‌شود
- بعد از سالم شدن، حساب ادمین ساخته می‌شود

همه‌ی این‌ها با فراخوانی مستقیم GraphQL API خود Railway از مرورگر انجام می‌شود
(`installer/src/providers/railway-client.ts`) — دقیقاً مثل مسیر Cloudflare، بدون ترمینال.

**نکته:** برای اینکه Railway بتواند سرویس را مستقیم از ریپوی گیت‌هاب بسازد، مخزن باید
عمومی (public) باشد یا Railway به آن دسترسی داشته باشد (اتصال GitHub App که یک‌بار از
داشبورد Railway انجام می‌شود).

### گزینه‌ی ۲ — از طریق Railway Dashboard (چند کلیک، بدون CLI)

1. یک پروژه‌ی جدید در Railway بسازید و ریپازیتوری گیت‌هاب را وصل کنید.
2. Railway به‌صورت خودکار `Dockerfile` را تشخیص می‌دهد و بیلد می‌کند.
3. یک **Volume** به مسیر `/app/data` وصل کنید تا دیتابیس SQLite بین دیپلوی‌ها پایدار بماند.
4. متغیر محیطی `PORT` را Railway خودش تنظیم می‌کند؛ نیازی به دخالت دستی نیست.

### گزینه‌ی ۳ — از طریق GitHub Actions

1. سکرت `RAILWAY_TOKEN` را در تنظیمات ریپو اضافه کنید.
2. workflow **Deploy to Railway** را از تب Actions دستی اجرا کنید.

### ساخت حساب ادمین اولیه (اگر اینستالر استفاده نشد)

مشابه Cloudflare، همان endpoint را به آدرس دامنه‌ی Railway بزنید:

```bash
curl -X POST https://<your-railway-domain>/api/install/admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"یک-رمز-قوی"}'
```

## توسعه‌ی محلی (بدون هیچ اکانت Cloudflare/Railway)

```bash
npm install
npx wrangler d1 migrations apply dej_panel_db --local
npm run dev
```

## تست و بیلد

```bash
npm run typecheck
npm run test
npm run build
```

## وضعیت پیاده‌سازی

جزئیات کامل این‌که کدام بخش از اسپک محصول ساخته شده و کدام بخش باقی مانده،
در [`docs/PROGRESS.md`](./docs/PROGRESS.md) نگه‌داری می‌شود.
