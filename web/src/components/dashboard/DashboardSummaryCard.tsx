import type { ReactNode } from 'react'
import type { TrendParts } from './dashboardFormat'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend: TrendParts
  /** When set, replaces the small caption under the percentage (e.g. different baseline than trend.label). */
  trendCaption?: string
  loading?: boolean
  highlight?: boolean
}

export function DashboardSummaryCard({ label, value, icon, trend, trendCaption, loading, highlight }: Props) {
  if (loading) {
    return (
      <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card--primary' : ''} dashboard-summary-card--skeleton`}>
        <div className="dashboard-summary-card__top">
          <span className="dashboard-summary-card__icon dashboard-skeleton dashboard-skeleton--icon" aria-hidden />
          <span className="dashboard-skeleton dashboard-skeleton--text-sm" />
        </div>
        <span className="dashboard-skeleton dashboard-skeleton--value" />
        <span className="dashboard-skeleton dashboard-skeleton--trend" />
      </article>
    )
  }

  const trendClass =
    trend.arrow === '↑' ? 'dashboard-trend--up' : trend.arrow === '↓' ? 'dashboard-trend--down' : 'dashboard-trend--flat'

  return (
    <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card__top">
        <span className="dashboard-summary-card__icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-card__label">{label}</span>
      </div>
      <strong className="dashboard-summary-card__value">{value}</strong>
      <p className={`dashboard-summary-card__trend ${trendClass}`}>
        <span className="dashboard-summary-card__trend-arrow">{trend.arrow}</span>
        <span className="dashboard-summary-card__trend-pct">{trend.pct}%</span>
        <span className="dashboard-summary-card__trend-label">{trendCaption ?? trend.label}</span>
      </p>
    </article>
  )
}

export function DashboardSummaryIcons() {
  return {
    candidates: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    jobs: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
    interviews: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
    offers: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7V3a2 2 0 0 1 4 0v4" />
      </svg>
    ),
  }
}
