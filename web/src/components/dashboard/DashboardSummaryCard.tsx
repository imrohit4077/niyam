import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardUtils'
import { formatTrendLabel } from './dashboardUtils'

type Props = {
  label: string
  value: string | number
  trend?: { direction: TrendDirection; pct: number }
  trendCaption?: string
  icon: ReactNode
  highlight?: boolean
  loading?: boolean
}

export function DashboardSummaryCard({ label, value, trend, trendCaption, icon, highlight, loading }: Props) {
  return (
    <article className={`dashboard-summary-card${highlight ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-card-icon" aria-hidden>
          {icon}
        </span>
        {loading ? (
          <span className="dashboard-summary-card-skeleton dashboard-summary-card-skeleton--value" />
        ) : (
          <span className="dashboard-summary-card-value">{value}</span>
        )}
      </div>
      <span className="dashboard-summary-card-label">{label}</span>
      {loading ? (
        <span className="dashboard-summary-card-skeleton dashboard-summary-card-skeleton--trend" />
      ) : trend ? (
        <div className="dashboard-summary-card-trend">
          <span
            className={`dashboard-summary-card-trend-badge dashboard-summary-card-trend-badge--${trend.direction}`}
          >
            {formatTrendLabel(trend.direction, trend.pct)}
          </span>
          {trendCaption ? <span className="dashboard-summary-card-trend-caption">{trendCaption}</span> : null}
        </div>
      ) : null}
    </article>
  )
}

export function SummaryIconCandidates() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function SummaryIconBriefcase() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

export function SummaryIconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export function SummaryIconGift() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}
