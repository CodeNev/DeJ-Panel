import { useState } from "react";
import type { InstallerLocale } from "../i18n";
import { t } from "../i18n";
import { rwVerifyToken } from "../providers/railway-client";

type Props = {
  locale: InstallerLocale;
  onVerified: (apiToken: string, accountId: string, accountName: string) => void;
};

const RAILWAY_TOKEN_URL = "https://railway.app/account/tokens";

export function RailwayAuthentication({ locale, onVerified }: Props) {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleVerify() {
    if (!token.trim()) return;
    setStatus("checking");
    setErrorMessage(null);

    const result = await rwVerifyToken(token.trim());

    if (result.ok) {
      onVerified(token.trim(), result.data.id, result.data.name || result.data.email);
      setStatus("idle");
      setToken("");
      return;
    }

    setStatus("error");
    setErrorMessage(result.message);
  }

  return (
    <div className="dej-step">
      <a className="dej-link-button" href={RAILWAY_TOKEN_URL} target="_blank" rel="noreferrer noopener">
        {t(locale, "getToken")}
      </a>

      <div className="dej-permission-list">
        <p>{t(locale, "requiredPermissions")}</p>
        <ul>
          <li className="dej-mono">Account Token (full access to your Railway account)</li>
        </ul>
      </div>

      <label className="dej-field-label" htmlFor="rw-token">
        Railway API Token
      </label>
      <input
        id="rw-token"
        className="dej-mono dej-input"
        type="password"
        autoComplete="off"
        spellCheck={false}
        dir="ltr"
        placeholder={t(locale, "tokenPlaceholder")}
        value={token}
        onChange={(e) => setToken(e.target.value)}
      />

      {status === "error" && errorMessage && (
        <div className="dej-error-box">
          <strong>{t(locale, "corsWarningTitle")}</strong>
          <p>{errorMessage}</p>
        </div>
      )}

      <button
        type="button"
        className="dej-primary-button"
        disabled={!token.trim() || status === "checking"}
        onClick={handleVerify}
      >
        {status === "checking" ? t(locale, "connecting") : t(locale, "connect")}
      </button>
    </div>
  );
}
