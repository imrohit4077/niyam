import type { ReactNode } from 'react'
import type { TrendResult } from './dashboardUtils'
import { formatTrendLabel } from './dashboardUtils'

type SummaryKpiCardProps = {
  label: string
  value: string | number
  trend: TrendResult
  trendCaption?: string
  icon: ReactNode
  primary?: boolean
  loading?: boolean
}

function TrendBadge({ trend, caption }: { trend: TrendResult; caption?: string }) {
  const cls =
    trend.direction === 'up'
      ? 'dashboard-kpi-trend dashboard-kpi-trend--up'
      : trend.direction === 'down'
        ? 'dashboard-kpi-trend dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend dashboard-kpi-trend--flat'
  return (
    <div className="dashboard-kpi-trend-wrap">
      <span className={cls} aria-hidden>
        {formatTrendLabel(trend)}
      </span>
      {caption ? <span className="dashboard-kpi-trend-caption">{caption}</span> : null}
    </div>
  )
}

export function SummaryKpiCard({
  label,
  value,
  trend,
  trendCaption = 'vs prior 30 days',
  icon,
  primary,
  loading,
}: SummaryKpiCardProps) {
  if (loading) {
    return (
      <article className={`dashboard-kpi-card dashboard-kpi-summary ${primary ? 'dashboard-kpi-primary' : ''}`}>
        <div className="dashboard-kpi-summary-top">
          <span className="dashboard-kpi-icon dashboard-skeleton dashboard-skeleton--circle" aria-hidden />
          <span className="dashboard-skeleton dashboard-skeleton--text-sm" style={{ width: '55%' }} />
        </div>
        <span className="dashboard-skeleton dashboard-skeleton--value" />
        <span className="dashboard-skeleton dashboard-skeleton--text-xs" style={{ width: '70%', marginTop: 10 }} />
      </article>
    )
  }

  return (
    <article className={`dashboard-kpi-card dashboard-kpi-summary ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-summary-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-summary-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-summary-value">{value}</strong>
      <TrendBadge trend={trend} caption={trendCaption} />
    </article>
  )
}

export function IconCandidates() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function IconBriefcase() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

export function IconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export function IconOffer() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}
