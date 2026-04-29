import type { TrendDirection } from './dashboardMetrics'

const ICONS = {
  candidates: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  ),
  jobs: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  ),
  interviews: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  ),
  offers: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  ),
} as const

export type SummaryIconKey = keyof typeof ICONS

function TrendArrow({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <span className="dashboard-kpi-trend-arrow">↑</span>
  if (direction === 'down') return <span className="dashboard-kpi-trend-arrow dashboard-kpi-trend-arrow--down">↓</span>
  return <span className="dashboard-kpi-trend-arrow dashboard-kpi-trend-arrow--flat">→</span>
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trend,
  hint,
  primary,
}: {
  icon: SummaryIconKey
  label: string
  value: string | number
  trend: { direction: TrendDirection; label: string }
  hint: string
  primary?: boolean
}) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card--rich ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {ICONS[icon]}
        </span>
        <span className={`dashboard-kpi-trend dashboard-kpi-trend--${trend.direction}`}>
          <TrendArrow direction={trend.direction} />
          <span className="dashboard-kpi-trend-pct">{trend.label}</span>
        </span>
      </div>
      <span className="dashboard-kpi-card-label">{label}</span>
      <strong className="dashboard-kpi-card-value">{value}</strong>
      <p className="dashboard-kpi-card-hint">{hint}</p>
    </article>
  )
}
