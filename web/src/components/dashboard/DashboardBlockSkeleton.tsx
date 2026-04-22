type Props = { lines?: number; className?: string }

export default function DashboardBlockSkeleton({ lines = 3, className = '' }: Props) {
  return (
    <div className={`dashboard-skeleton ${className}`.trim()} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="dashboard-skeleton-line" style={{ width: `${68 + (i % 3) * 8}%` }} />
      ))}
    </div>
  )
}
