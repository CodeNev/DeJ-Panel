import { t, type Locale } from "../i18n";
import type { Theme } from "../hooks/usePreferences";

type Props = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
};

export function SettingsPage({ locale, setLocale, theme, setTheme }: Props) {
  return (
    <div className="dej-card">
      <label className="dej-field-label">{t(locale, "language")}</label>
      <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)} className="dej-input">
        <option value="fa">فارسی</option>
        <option value="en">English</option>
      </select>

      <label className="dej-field-label">{t(locale, "theme")}</label>
      <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)} className="dej-input">
        <option value="dark">{t(locale, "dark")}</option>
        <option value="light">{t(locale, "light")}</option>
        <option value="system">{t(locale, "system")}</option>
      </select>
    </div>
  );
}
