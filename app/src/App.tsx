import { useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ConfigurationsPage } from "./pages/ConfigurationsPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";
import { NodesPage } from "./pages/NodesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AppLayout } from "./components/AppLayout";
import { usePreferences } from "./hooks/usePreferences";
import { api } from "./api/client";

function useAuthStatus() {
  const [status, setStatus] = useState<"checking" | "authenticated" | "anonymous">("checking");

  useEffect(() => {
    api
      .get("/api/auth/me")
      .then(() => setStatus("authenticated"))
      .catch(() => setStatus("anonymous"));
  }, []);

  return status;
}

function ProtectedLayout({ children }: { children: ReactNode }) {
  const status = useAuthStatus();
  if (status === "checking") return null;
  if (status === "anonymous") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { locale, setLocale, theme, setTheme } = usePreferences();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage locale={locale} onLoggedIn={() => {}} />} />
        <Route
          path="/*"
          element={
            <ProtectedLayout>
              <AppLayout locale={locale} setLocale={setLocale} theme={theme} setTheme={setTheme}>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage locale={locale} />} />
                  <Route path="/configurations" element={<ConfigurationsPage locale={locale} />} />
                  <Route path="/subscriptions" element={<SubscriptionsPage locale={locale} />} />
                  <Route path="/nodes" element={<NodesPage locale={locale} />} />
                  <Route
                    path="/settings"
                    element={
                      <SettingsPage locale={locale} setLocale={setLocale} theme={theme} setTheme={setTheme} />
                    }
                  />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AppLayout>
            </ProtectedLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
