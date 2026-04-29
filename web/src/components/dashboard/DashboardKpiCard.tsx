import { type ReactNode } from 'react'
import { formatTrendLabel, trendFromPeriods } from './trendUtils'

type TrendInput = { current: number; previous: number } | null

const ICONS: Record<string, ReactNode> = {
  candidates: (
    <svg className="dashboard-kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M17 20v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 20v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  jobs: (
    <svg className="dashboard-kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  ),
  interview: (
    <svg className="dashboard-kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  offer: (
    <svg className="dashboard-kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M20 7h-3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3" />
      <path d="M4 7h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  ),
}

export function DashboardKpiCard({
  title,
  value,
  caption,
  icon,
  primary,
  trend,
}: {
  title: string
  value: string | number
  caption?: string
  icon: keyof typeof ICONS
  primary?: boolean
  /** Omit or pass null to hide the trend. */
  trend?: TrendInput
}) {
  const t = trend != null ? trendFromPeriods(trend.current, trend.previous) : null
  const formatted = t ? formatTrendLabel(t) : null

  return (
    <article className={`dashboard-kpi-card ${primary ? 'dashboard-kpi-primary' : ''}`.trim()}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon-wrap" aria-hidden>
          {ICONS[icon] ?? ICONS.candidates}
        </span>
        {formatted && (
          <div
            className={`dashboard-kpi-trend dashboard-kpi-trend--${formatted.tone}`}
            title="Compared to prior period"
          >
            {formatted.tone !== 'neutral' && <span className="dashboard-kpi-trend-arrow">{formatted.arrow}</span>}
            <span className="dashboard-kpi-trend-pct">{formatted.text}</span>
          </div>
        )}
      </div>
      <span className="dashboard-kpi-title">{title}</span>
      <strong className="dashboard-kpi-value">{value}</strong>
      {caption && <p className="dashboard-kpi-caption">{caption}</p>}
    </article>
  )
}
