import { useEffect, useState } from "react";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { t, type Locale } from "../i18n";

type Subscription = {
  id: string;
  token: string;
  name: string;
  status: string;
  trafficLimitBytes: number | null;
  trafficUsedBytes: number;
  expiresAt: number | null;
};

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "∞";
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

export function SubscriptionsPage({ locale }: { locale: Locale }) {
  const [items, setItems] = useState<Subscription[] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    api.get<Subscription[]>("/api/subscriptions").then(setItems);
  }, []);

  async function handleCopyLink(sub: Subscription) {
    const url = `${window.location.origin}/sub/${sub.token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(sub.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  if (!items) return <p>{t(locale, "loading")}</p>;

  if (items.length === 0) {
    return <EmptyState message={t(locale, "noSubscriptionsYet")} />;
  }

  return (
    <div className="dej-table-wrap">
      <table className="dej-table">
        <thead>
          <tr>
            <th>{t(locale, "name")}</th>
            <th>{t(locale, "status")}</th>
            <th>Traffic</th>
            <th>{t(locale, "actions")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((sub) => (
            <tr key={sub.id}>
              <td>{sub.name}</td>
              <td>
                <span className={`dej-badge dej-badge-${sub.status.toLowerCase()}`}>{sub.status}</span>
              </td>
              <td className="dej-mono">
                {formatBytes(sub.trafficUsedBytes)} / {formatBytes(sub.trafficLimitBytes)}
              </td>
              <td className="dej-row-actions">
                <button type="button" onClick={() => handleCopyLink(sub)}>
                  {copiedId === sub.id ? t(locale, "copied") : t(locale, "copy")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
