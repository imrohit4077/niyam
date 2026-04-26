import type { ReactNode } from 'react'

type Trend = { pct: number; direction: 'up' | 'down' | 'flat' }

function TrendLine({ trend, label }: { trend: Trend; label: string }) {
  if (trend.direction === 'flat' && trend.pct === 0) {
    return (
      <span className="dashboard-summary-trend dashboard-summary-trend--flat" title={label}>
        <span className="dashboard-summary-trend-arrow">→</span>
        <span className="dashboard-summary-trend-pct">0%</span>
        <span className="dashboard-summary-trend-hint">{label}</span>
      </span>
    )
  }
  const up = trend.direction === 'up'
  const arrow = trend.direction === 'flat' ? '→' : up ? '↑' : '↓'
  const pctLabel = trend.pct >= 100 && trend.direction === 'up' && trend.pct === 100 ? '100%+' : `${trend.pct}%`
  return (
    <span
      className={`dashboard-summary-trend ${up ? 'dashboard-summary-trend--up' : trend.direction === 'down' ? 'dashboard-summary-trend--down' : 'dashboard-summary-trend--flat'}`}
      title={label}
    >
      <span className="dashboard-summary-trend-arrow">{arrow}</span>
      <span className="dashboard-summary-trend-pct">{pctLabel}</span>
      <span className="dashboard-summary-trend-hint">{label}</span>
    </span>
  )
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trend,
  trendLabel,
  loading,
}: {
  icon: ReactNode
  label: string
  value: string | number
  trend: Trend
  trendLabel: string
  loading?: boolean
}) {
  return (
    <article className="dashboard-summary-card">
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <TrendLine trend={trend} label={trendLabel} />
      </div>
      <span className="dashboard-summary-label">{label}</span>
      {loading ? (
        <div className="dashboard-summary-value-skeleton" aria-hidden />
      ) : (
        <strong className="dashboard-summary-value">{value}</strong>
      )}
    </article>
  )
}

export function DashboardSummaryGridSkeleton() {
  return (
    <div className="dashboard-summary-grid" aria-busy>
      {Array.from({ length: 4 }).map((_, i) => (
        <article key={i} className="dashboard-summary-card dashboard-summary-card--skeleton">
          <div className="dashboard-summary-card-top">
            <span className="dashboard-summary-icon-skeleton" />
            <span className="dashboard-summary-trend-skeleton" />
          </div>
          <span className="dashboard-summary-label-skeleton" />
          <div className="dashboard-summary-value-skeleton dashboard-summary-value-skeleton--lg" />
        </article>
      ))}
    </div>
  )
}
