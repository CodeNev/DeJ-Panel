import { useState } from "react";
import type { InstallerLocale } from "../i18n";
import { t } from "../i18n";

type Props = {
  locale: InstallerLocale;
  onSubmit: (data: { adminUsername: string; adminPassword: string }) => void;
};

function generateSecurePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 24);
}

export function SecurityConfiguration({ locale, onSubmit }: Props) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState(generateSecurePassword());
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="dej-step">
      <label className="dej-field-label" htmlFor="admin-username">
        Admin username
      </label>
      <input
        id="admin-username"
        className="dej-mono dej-input"
        dir="ltr"
        value={username}
        onChange={(e) => setUsername(e.target.value.trim())}
      />

      <label className="dej-field-label" htmlFor="admin-password">
        Admin password
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id="admin-password"
          className="dej-mono dej-input"
          dir="ltr"
          type={revealed ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="button" onClick={() => setRevealed((r) => !r)}>
          {revealed ? "Hide" : "Show"}
        </button>
        <button type="button" onClick={() => setPassword(generateSecurePassword())}>
          Regenerate
        </button>
      </div>

      <button
        type="button"
        className="dej-primary-button"
        disabled={!username || password.length < 8}
        onClick={() => onSubmit({ adminUsername: username, adminPassword: password })}
      >
        {t(locale, "next")}
      </button>
    </div>
  );
}
