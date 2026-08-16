import { useState } from "react";
import type { InstallerLocale } from "../i18n";
import { t } from "../i18n";
import { cfCheckWorkerNameAvailable } from "../providers/cloudflare-deploy";
import type { InstallerPlatform } from "../state/types";

type Props = {
  locale: InstallerLocale;
  platform: InstallerPlatform;
  apiToken: string;
  accountId: string;
  onSubmit: (data: { workerName: string; databaseName: string }) => void;
};

export function ProjectConfiguration({ locale, platform, apiToken, accountId, onSubmit }: Props) {
  const [workerName, setWorkerName] = useState("dej-panel");
  const [databaseName, setDatabaseName] = useState("dej_panel_db");
  const [checking, setChecking] = useState(false);
  const [nameTaken, setNameTaken] = useState(false);

  async function handleContinue() {
    if (platform !== "cloudflare") {
      onSubmit({ workerName, databaseName });
      return;
    }
    setChecking(true);
    const available = await cfCheckWorkerNameAvailable(apiToken, accountId, workerName);
    setChecking(false);
    setNameTaken(!available);
    if (available) {
      onSubmit({ workerName, databaseName });
    }
  }

  return (
    <div className="dej-step">
      <label className="dej-field-label" htmlFor="worker-name">
        {platform === "cloudflare" ? "Worker name" : "Railway service name"}
      </label>
      <input
        id="worker-name"
        className="dej-mono dej-input"
        dir="ltr"
        value={workerName}
        onChange={(e) => setWorkerName(e.target.value.trim())}
      />

      {platform === "cloudflare" && (
        <>
          <label className="dej-field-label" htmlFor="db-name">
            D1 database name
          </label>
          <input
            id="db-name"
            className="dej-mono dej-input"
            dir="ltr"
            value={databaseName}
            onChange={(e) => setDatabaseName(e.target.value.trim())}
          />
        </>
      )}

      {nameTaken && (
        <div className="dej-error-box">
          <p>
            {platform === "cloudflare"
              ? "A Worker with this name already exists in your account."
              : "A service with this name already exists."}
          </p>
        </div>
      )}

      <button
        type="button"
        className="dej-primary-button"
        disabled={!workerName || checking}
        onClick={handleContinue}
      >
        {checking ? t(locale, "connecting") : t(locale, "next")}
      </button>
    </div>
  );
}
