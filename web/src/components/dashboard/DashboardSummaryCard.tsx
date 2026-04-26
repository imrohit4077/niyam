import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardHelpers'

const trendArrow: Record<TrendDirection, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trend,
  trendCaption,
}: {
  label: string
  value: string | number
  icon: ReactNode
  trend: { direction: TrendDirection; label: string }
  trendCaption?: string
}) {
  const trendClass =
    trend.direction === 'up'
      ? 'dashboard-kpi-trend--up'
      : trend.direction === 'down'
        ? 'dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend--flat'

  return (
    <article className="dashboard-kpi-card dashboard-kpi-card-rich">
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <div className="dashboard-kpi-footer">
        <span className={`dashboard-kpi-trend ${trendClass}`} title={trendCaption}>
          <span className="dashboard-kpi-trend-arrow">{trendArrow[trend.direction]}</span>
          <span className="dashboard-kpi-trend-pct">{trend.label}</span>
        </span>
        {trendCaption ? <span className="dashboard-kpi-trend-caption">{trendCaption}</span> : null}
      </div>
    </article>
  )
}

export function CandidatesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function JobsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  )
}

export function InterviewsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

export function OffersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
      <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
      <path d="M18 12h.01" />
    </svg>
  )
}
