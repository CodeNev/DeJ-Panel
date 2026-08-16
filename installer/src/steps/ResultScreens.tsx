import type { InstallerErrorInfo, InstallerState } from "../state/types";

type SuccessProps = {
  state: InstallerState;
};

export function CompletionScreen({ state }: SuccessProps) {
  return (
    <div className="dej-step">
      <h2>DeJ Panel installed successfully 🎉</h2>

      {state.deploymentUrl && (
        <div className="dej-error-box" style={{ borderColor: "var(--dej-success)", background: "color-mix(in srgb, var(--dej-success) 12%, transparent)" }}>
          <p className="dej-mono" dir="ltr">
            {state.deploymentUrl}
          </p>
        </div>
      )}

      <ul className="dej-prereq-list">
        <li className="dej-prereq">
          <strong>Platform</strong>
          <span className="dej-mono">{state.platform}</span>
        </li>
        {state.createdResources.map((r) => (
          <li key={r.id} className="dej-prereq">
            <strong>{r.type}</strong>
            <span className="dej-mono">{r.name}</span>
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {state.deploymentUrl && (
          <a className="dej-link-button" href={state.deploymentUrl} target="_blank" rel="noreferrer noopener">
            Open Panel
          </a>
        )}
        {state.deploymentUrl && (
          <button type="button" onClick={() => navigator.clipboard.writeText(state.deploymentUrl ?? "")}>
            Copy URL
          </button>
        )}
        <a className="dej-link-button" href="https://github.com/CodeNev/DeJ-Panel" target="_blank" rel="noreferrer noopener">
          View GitHub
        </a>
      </div>
    </div>
  );
}

type FailureProps = {
  error: InstallerErrorInfo;
  onRetry: () => void;
  onBack: () => void;
};

export function FailedScreen({ error, onRetry, onBack }: FailureProps) {
  return (
    <div className="dej-step">
      <div className="dej-error-box">
        <strong>{error.message}</strong>
        <p className="dej-mono">
          {error.code} · requestId: {error.requestId}
        </p>
        <ul>
          {error.possibleCauses.map((cause) => (
            <li key={cause}>{cause}</li>
          ))}
        </ul>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={onBack}>
          Back
        </button>
        {error.retryable && (
          <button type="button" className="dej-primary-button" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
