import type { InstallerErrorInfo, InstallerState } from "../state/types";

type SuccessProps = {
  state: InstallerState;
};

export function CompletionScreen({ state }: SuccessProps) {
  return (
    <div className="dej-step">
      <h2>DeJ Panel installation prepared</h2>
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
      <a className="dej-link-button" href="https://github.com/CodeNev/DeJ-Panel" target="_blank" rel="noreferrer noopener">
        View GitHub
      </a>
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
