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

## دیپلوی پنل روی Cloudflare Workers + D1

قبل از دیپلوی، داشبورد ادمین باید یک‌بار build شود تا Worker بتواند آن را به‌عنوان
static asset سرویس بدهد (طبق `wrangler.toml` → `[assets] directory = "app/dist"`):

```bash
cd app && npm install && npm run build && cd ..
```

### گزینه‌ی ۱ — از طریق خود اینستالر (توصیه‌شده)

اینستالر توکن Cloudflare شما را می‌گیرد، حساب و دسترسی‌ها را تایید می‌کند، دیتابیس D1 را
می‌سازد و شما را برای اتصال نهایی راهنمایی می‌کند. توکن هرگز جایی ذخیره نمی‌شود.

### گزینه‌ی ۲ — دستی از خط فرمان

```bash
npm install
npx wrangler login
npx wrangler d1 create dej_panel_db
# مقدار database_id خروجی بالا را داخل wrangler.toml جایگزین REPLACE_WITH_D1_DATABASE_ID کنید
npm run db:migrate:remote
npm run deploy
```

### گزینه‌ی ۳ — از طریق GitHub Actions

1. در تنظیمات ریپو: **Settings → Secrets and variables → Actions** دو سکرت اضافه کنید:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
2. از تب **Actions**، workflow **Deploy to Cloudflare** را به‌صورت دستی اجرا کنید
   (این workflow خودکار روی هر push اجرا نمی‌شود؛ عمداً دستی است تا دیپلوی پروداکشن
   بدون تایید صریح شما اتفاق نیفتد).

### ساخت حساب ادمین اولیه (Cloudflare)

بعد از دیپلوی موفق، یک بار این درخواست را بزنید (یا از داخل اینستالر در مرحله‌ی
Security Configuration این‌کار انجام می‌شود):

```bash
curl -X POST https://<your-worker-domain>/api/install/admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"یک-رمز-قوی"}'
```

این endpoint فقط تا وقتی هیچ ادمینی در دیتابیس نباشد کار می‌کند؛ بعد از اولین اجرا خودش
قفل می‌شود (خطای `ADMIN_EXISTS`).

## دیپلوی پنل روی Railway

Railway از D1 پشتیبانی نمی‌کند، بنابراین پنل روی Railway از یک فایل **SQLite** محلی
(روی volume) استفاده می‌کند — همان اسکیما و همان منطق تجاری، فقط آداپتور دیتابیس فرق دارد
(`src/db/client.ts`).

### گزینه‌ی ۱ — از طریق Railway Dashboard

1. یک پروژه‌ی جدید در Railway بسازید و ریپازیتوری گیت‌هاب را وصل کنید.
2. Railway به‌صورت خودکار `Dockerfile` را تشخیص می‌دهد و بیلد می‌کند.
3. یک **Volume** به مسیر `/app/data` وصل کنید تا دیتابیس SQLite بین دیپلوی‌ها پایدار بماند.
4. متغیر محیطی `PORT` را Railway خودش تنظیم می‌کند؛ نیازی به دخالت دستی نیست.

### گزینه‌ی ۲ — از طریق GitHub Actions

1. سکرت `RAILWAY_TOKEN` را در تنظیمات ریپو اضافه کنید.
2. workflow **Deploy to Railway** را از تب Actions دستی اجرا کنید.

### ساخت حساب ادمین اولیه (Railway)

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
