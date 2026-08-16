import { useCallback, useEffect, useState } from "react";
import type { Locale } from "../i18n";

export type Theme = "dark" | "light" | "system";

function applyTheme(theme: Theme) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.dataset.theme = resolved;
}

function applyLocale(locale: Locale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
}

export function usePreferences() {
  const [locale, setLocaleState] = useState<Locale>(
    () => (localStorage.getItem("dej_locale") as Locale) ?? "fa"
  );
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem("dej_theme") as Theme) ?? "dark"
  );

  useEffect(() => applyLocale(locale), [locale]);
  useEffect(() => applyTheme(theme), [theme]);

  const setLocale = useCallback((value: Locale) => {
    localStorage.setItem("dej_locale", value);
    setLocaleState(value);
  }, []);

  const setTheme = useCallback((value: Theme) => {
    localStorage.setItem("dej_theme", value);
    setThemeState(value);
  }, []);

  return { locale, setLocale, theme, setTheme };
}
