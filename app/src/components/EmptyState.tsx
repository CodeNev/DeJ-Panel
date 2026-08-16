type Props = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ message, actionLabel, onAction }: Props) {
  return (
    <div className="dej-empty-state">
      <p>{message}</p>
      {actionLabel && onAction && (
        <button type="button" className="dej-primary-button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
