export type InstallerLocale = "fa" | "en";

export const installerTranslations = {
  fa: {
    appTitle: "DeJ Panel — نصب‌کننده",
    chooseTarget: "کجا می‌خواهید DeJ Panel را نصب کنید؟",
    cloudflareTitle: "Cloudflare",
    cloudflareDesc: "Workers + D1، بدون سرور، دیپلوی سریع در سراسر جهان",
    railwayTitle: "Railway",
    railwayDesc: "میزبانی سرویس‌محور، مناسب برای دیتابیس‌های سنتی",
    getToken: "دریافت / ساخت API Token",
    tokenLabel: "API Token کلودفلر",
    tokenPlaceholder: "توکن را اینجا وارد کنید",
    connect: "اتصال و تایید",
    connecting: "در حال بررسی...",
    requiredPermissions: "دسترسی‌های لازم برای توکن",
    back: "بازگشت",
    next: "بعدی",
    retry: "تلاش مجدد",
    corsWarningTitle: "درخواست از مرورگر مسدود شد",
  },
  en: {
    appTitle: "DeJ Panel — Installer",
    chooseTarget: "Where do you want to deploy DeJ Panel?",
    cloudflareTitle: "Cloudflare",
    cloudflareDesc: "Workers + D1, serverless, fast global deployment",
    railwayTitle: "Railway",
    railwayDesc: "Service-based hosting, suited for traditional databases",
    getToken: "Get / Create API Token",
    tokenLabel: "Cloudflare API Token",
    tokenPlaceholder: "Paste your token here",
    connect: "Connect & Verify",
    connecting: "Verifying...",
    requiredPermissions: "Required token permissions",
    back: "Back",
    next: "Next",
    retry: "Retry",
    corsWarningTitle: "Browser request was blocked",
  },
} as const;

export type InstallerTranslationKey = keyof typeof installerTranslations.fa;

export function t(locale: InstallerLocale, key: InstallerTranslationKey): string {
  return installerTranslations[locale][key] ?? installerTranslations.en[key];
}
