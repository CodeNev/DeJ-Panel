import type { InstallerLocale } from "../i18n";
import { t } from "../i18n";
import type { InstallerFormData, InstallerPlatform } from "../state/types";

type Props = {
  locale: InstallerLocale;
  platform: InstallerPlatform;
  formData: InstallerFormData;
  onConfirm: () => void;
  onBack: () => void;
};

export function ReviewScreen({ locale, platform, formData, onConfirm, onBack }: Props) {
  return (
    <div className="dej-step">
      <ul className="dej-prereq-list">
        <li className="dej-prereq">
          <strong>Platform</strong>
          <span className="dej-mono">{platform}</span>
        </li>
        <li className="dej-prereq">
          <strong>Name</strong>
          <span className="dej-mono">{formData.workerName}</span>
        </li>
        {platform === "cloudflare" && (
          <li className="dej-prereq">
            <strong>D1 database</strong>
            <span className="dej-mono">{formData.databaseName}</span>
          </li>
        )}
        <li className="dej-prereq">
          <strong>Admin username</strong>
          <span className="dej-mono">{formData.adminUsername}</span>
        </li>
      </ul>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={onBack}>
          {t(locale, "back")}
        </button>
        <button type="button" className="dej-primary-button" onClick={onConfirm}>
          Deploy
        </button>
      </div>
    </div>
  );
}
