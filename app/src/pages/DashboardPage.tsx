import { useEffect, useState } from "react";
import { api } from "../api/client";
import { StatCard } from "../components/StatCard";
import { t, type Locale } from "../i18n";

type DashboardSummary = {
  configurations: { total: number; active: number };
  subscriptions: { total: number; active: number };
  nodes: { total: number; online: number };
  platform: string;
  environment: string;
  version: string;
};

export function DashboardPage({ locale }: { locale: Locale }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardSummary>("/api/dashboard/summary")
      .then(setSummary)
      .catch((err) => setError((err as Error).message));
  }, []);

  if (error) {
    return <div className="dej-error-box">{error}</div>;
  }

  if (!summary) {
    return <p>{t(locale, "loading")}</p>;
  }

  return (
    <div>
      <div className="dej-platform-badge">
        {summary.platform} · {summary.environment} · v{summary.version}
      </div>
      <div className="dej-stat-grid">
        <StatCard label={t(locale, "totalConfigs")} value={summary.configurations.total} />
        <StatCard label={t(locale, "activeConfigs")} value={summary.configurations.active} />
        <StatCard label={t(locale, "totalSubscriptions")} value={summary.subscriptions.total} />
        <StatCard label={t(locale, "activeSubscriptions")} value={summary.subscriptions.active} />
        <StatCard label={t(locale, "totalNodes")} value={summary.nodes.total} />
        <StatCard label={t(locale, "onlineNodes")} value={summary.nodes.online} />
      </div>
    </div>
  );
}
