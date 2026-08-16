import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { t, type Locale } from "../i18n";
import type { Theme } from "../hooks/usePreferences";

type Props = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  children: ReactNode;
};

const NAV_ITEMS = [
  { to: "/dashboard", key: "dashboard" as const },
  { to: "/configurations", key: "configurations" as const },
  { to: "/subscriptions", key: "subscriptions" as const },
  { to: "/nodes", key: "nodes" as const },
  { to: "/settings", key: "settings" as const },
];

export function AppLayout({ locale, setLocale, theme, setTheme, children }: Props) {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function handleLogout() {
    await api.post("/api/auth/logout");
    navigate("/login");
  }

  return (
    <div className="dej-app-shell">
      <button
        className="dej-drawer-toggle"
        type="button"
        onClick={() => setDrawerOpen((v) => !v)}
        aria-label="Toggle navigation"
      >
        ☰
      </button>

      <aside className={`dej-sidebar ${drawerOpen ? "dej-sidebar-open" : ""}`}>
        <div className="dej-brand-title">{t(locale, "appName")}</div>
        <nav className="dej-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `dej-nav-link ${isActive ? "dej-nav-active" : ""}`}
              onClick={() => setDrawerOpen(false)}
            >
              {t(locale, item.key)}
            </NavLink>
          ))}
        </nav>
        <div className="dej-sidebar-footer">
          <button type="button" onClick={() => setLocale(locale === "fa" ? "en" : "fa")}>
            {locale === "fa" ? "EN" : "فا"}
          </button>
          <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button type="button" onClick={handleLogout}>
            {t(locale, "logout")}
          </button>
        </div>
      </aside>

      <main className="dej-content">{children}</main>
    </div>
  );
}
