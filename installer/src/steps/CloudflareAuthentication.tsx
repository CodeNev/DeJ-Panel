import { useState } from "react";
import type { InstallerLocale } from "../i18n";
import { t } from "../i18n";
import {
  buildCloudflareTokenCreationUrl,
  REQUIRED_CLOUDFLARE_PERMISSIONS,
  verifyCloudflareTokenFromBrowser,
} from "../providers/cloudflare-client";

type Props = {
  locale: InstallerLocale;
  onVerified: (apiToken: string, accountId: string, accountName: string) => void;
};

export function CloudflareAuthentication({ locale, onVerified }: Props) {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleVerify() {
    if (!token.trim()) return;
    setStatus("checking");
    setErrorMessage(null);

    const result = await verifyCloudflareTokenFromBrowser(token.trim());

    if (result.ok) {
      onVerified(token.trim(), result.accountId, result.accountName);
      setStatus("idle");
      setToken("");
      return;
    }

    setStatus("error");
    setErrorMessage(result.message);
  }

  return (
    <div className="dej-step">
      <a
        className="dej-link-button"
        href={buildCloudflareTokenCreationUrl()}
        target="_blank"
        rel="noreferrer noopener"
      >
        {t(locale, "getToken")}
      </a>

      <div className="dej-permission-list">
        <p>{t(locale, "requiredPermissions")}</p>
        <ul>
          {REQUIRED_CLOUDFLARE_PERMISSIONS.map((permission) => (
            <li key={permission} className="dej-mono">
              {permission}
            </li>
          ))}
        </ul>
      </div>

      <label className="dej-field-label" htmlFor="cf-token">
        {t(locale, "tokenLabel")}
      </label>
      <input
        id="cf-token"
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
