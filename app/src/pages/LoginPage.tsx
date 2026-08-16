import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { t, type Locale } from "../i18n";

type Props = { locale: Locale; onLoggedIn: () => void };

export function LoginPage({ locale, onLoggedIn }: Props) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/login", { username, password });
      onLoggedIn();
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? t(locale, "loginFailed") : (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dej-center-screen">
      <form className="dej-card dej-login-card" onSubmit={handleSubmit}>
        <h1 className="dej-brand-title">{t(locale, "appName")}</h1>

        <label className="dej-field-label" htmlFor="username">
          {t(locale, "username")}
        </label>
        <input
          id="username"
          className="dej-input dej-mono"
          dir="ltr"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />

        <label className="dej-field-label" htmlFor="password">
          {t(locale, "password")}
        </label>
        <input
          id="password"
          type="password"
          className="dej-input dej-mono"
          dir="ltr"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div className="dej-error-box">{error}</div>}

        <button type="submit" className="dej-primary-button" disabled={loading}>
          {loading ? t(locale, "loading") : t(locale, "login")}
        </button>
      </form>
    </div>
  );
}
