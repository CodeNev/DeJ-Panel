import type { InstallerLocale } from "../i18n";
import { t } from "../i18n";
import type { InstallerPlatform } from "../state/types";

type Props = {
  locale: InstallerLocale;
  onSelect: (platform: InstallerPlatform) => void;
};

export function PlatformSelection({ locale, onSelect }: Props) {
  return (
    <div className="dej-step">
      <h1 className="dej-title">{t(locale, "chooseTarget")}</h1>
      <div className="dej-platform-grid">
        <button className="dej-platform-card" onClick={() => onSelect("cloudflare")} type="button">
          <div className="dej-platform-name">{t(locale, "cloudflareTitle")}</div>
          <p className="dej-platform-desc">{t(locale, "cloudflareDesc")}</p>
          <ul className="dej-platform-features">
            <li>Workers</li>
            <li>D1 Database</li>
            <li>API Token Auth</li>
          </ul>
        </button>

        <button className="dej-platform-card" onClick={() => onSelect("railway")} type="button">
          <div className="dej-platform-name">{t(locale, "railwayTitle")}</div>
          <p className="dej-platform-desc">{t(locale, "railwayDesc")}</p>
          <ul className="dej-platform-features">
            <li>Docker Service</li>
            <li>Database Plugin</li>
            <li>API Token Auth</li>
          </ul>
        </button>
      </div>
    </div>
  );
}
