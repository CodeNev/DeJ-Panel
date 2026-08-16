type Props = {
  label: string;
  value: number;
};

export function StatCard({ label, value }: Props) {
  return (
    <div className="dej-stat-card">
      <div className="dej-stat-value">{value.toLocaleString()}</div>
      <div className="dej-stat-label">{label}</div>
    </div>
  );
}
