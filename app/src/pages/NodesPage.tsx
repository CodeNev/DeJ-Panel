import { useEffect, useState } from "react";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { t, type Locale } from "../i18n";

type NodeItem = {
  id: string;
  name: string;
  address: string;
  port: number;
  protocol: string;
  status: string;
  tags: string[];
};

export function NodesPage({ locale }: { locale: Locale }) {
  const [items, setItems] = useState<NodeItem[] | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  function load() {
    api.get<NodeItem[]>("/api/nodes").then(setItems);
  }

  useEffect(load, []);

  async function handleHealthCheck(id: string) {
    setCheckingId(id);
    await api.post(`/api/nodes/${id}/health-check`);
    setCheckingId(null);
    load();
  }

  if (!items) return <p>{t(locale, "loading")}</p>;

  if (items.length === 0) {
    return <EmptyState message={t(locale, "noNodesYet")} />;
  }

  return (
    <div className="dej-table-wrap">
      <table className="dej-table">
        <thead>
          <tr>
            <th>{t(locale, "name")}</th>
            <th>{t(locale, "address")}</th>
            <th>{t(locale, "protocol")}</th>
            <th>{t(locale, "status")}</th>
            <th>{t(locale, "actions")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((node) => (
            <tr key={node.id}>
              <td>{node.name}</td>
              <td className="dej-mono">
                {node.address}:{node.port}
              </td>
              <td className="dej-mono">{node.protocol}</td>
              <td>
                <span className={`dej-badge dej-badge-${node.status.toLowerCase()}`}>{node.status}</span>
              </td>
              <td className="dej-row-actions">
                <button
                  type="button"
                  disabled={checkingId === node.id}
                  onClick={() => handleHealthCheck(node.id)}
                >
                  {checkingId === node.id ? "..." : t(locale, "healthCheck")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
