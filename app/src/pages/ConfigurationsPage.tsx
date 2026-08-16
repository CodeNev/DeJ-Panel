import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { t, type Locale } from "../i18n";

type Configuration = {
  id: string;
  name: string;
  protocol: string;
  status: string;
  nodeId: string;
  createdAt: number;
};

export function ConfigurationsPage({ locale }: { locale: Locale }) {
  const [items, setItems] = useState<Configuration[] | null>(null);
  const [qrFor, setQrFor] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function load() {
    api.get<Configuration[]>("/api/configs").then(setItems);
  }

  useEffect(load, []);

  async function handleCopy(id: string) {
    const { uri } = await api.get<{ uri: string }>(`/api/configs/${id}/uri`);
    await navigator.clipboard.writeText(uri);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function handleDisable(id: string) {
    await api.post(`/api/configs/${id}/disable`);
    load();
  }

  async function handleDelete(id: string) {
    await api.delete(`/api/configs/${id}`);
    load();
  }

  if (!items) return <p>{t(locale, "loading")}</p>;

  if (items.length === 0) {
    return <EmptyState message={t(locale, "noConfigsYet")} />;
  }

  return (
    <div className="dej-table-wrap">
      <table className="dej-table">
        <thead>
          <tr>
            <th>{t(locale, "name")}</th>
            <th>{t(locale, "protocol")}</th>
            <th>{t(locale, "status")}</th>
            <th>{t(locale, "actions")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td className="dej-mono">{item.protocol}</td>
              <td>
                <span className={`dej-badge dej-badge-${item.status.toLowerCase()}`}>{item.status}</span>
              </td>
              <td className="dej-row-actions">
                <button type="button" onClick={() => handleCopy(item.id)}>
                  {copiedId === item.id ? t(locale, "copied") : t(locale, "copy")}
                </button>
                <button type="button" onClick={() => setQrFor(item.id)}>
                  {t(locale, "qr")}
                </button>
                <button type="button" onClick={() => handleDisable(item.id)}>
                  {t(locale, "disable")}
                </button>
                <button type="button" onClick={() => handleDelete(item.id)}>
                  {t(locale, "delete")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {qrFor && <ConfigQrModal configId={qrFor} onClose={() => setQrFor(null)} />}
    </div>
  );
}

function ConfigQrModal({ configId, onClose }: { configId: string; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<{ uri: string }>(`/api/configs/${configId}/uri`).then(async (res) => {
      const dataUrl = await QRCode.toDataURL(res.uri, { width: 240, margin: 1 });
      if (!cancelled) setQrDataUrl(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [configId]);

  return (
    <div className="dej-modal-backdrop" onClick={onClose}>
      <div className="dej-modal" onClick={(e) => e.stopPropagation()}>
        {qrDataUrl ? <img className="dej-qr-image" alt="QR code" src={qrDataUrl} /> : <p>...</p>}
        <button type="button" onClick={onClose}>
          ✕
        </button>
      </div>
    </div>
  );
}
