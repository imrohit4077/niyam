import type { ReactNode } from 'react'

export type SummaryKpiTrend = {
  arrow: '↑' | '↓' | '→'
  pctLabel: string
  positive: boolean | null
}

type Props = {
  title: string
  value: ReactNode
  icon: ReactNode
  trend: SummaryKpiTrend
  hint?: string
  primary?: boolean
  loading?: boolean
}

export function SummaryKpiCard({ title, value, icon, trend, hint, primary, loading }: Props) {
  if (loading) {
    return (
      <article className={`dashboard-kpi-card dashboard-kpi-skeleton ${primary ? 'dashboard-kpi-primary' : ''}`}>
        <div className="dashboard-kpi-skeleton-row">
          <span className="dashboard-kpi-skeleton-icon" />
          <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--short" />
        </div>
        <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--value" />
        <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--hint" />
      </article>
    )
  }

  const trendClass =
    trend.positive === true
      ? 'dashboard-kpi-trend--up'
      : trend.positive === false
        ? 'dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend--flat'

  return (
    <article className={`dashboard-kpi-card ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-head">
        <span className="dashboard-kpi-icon-wrap" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-title">{title}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <p className="dashboard-kpi-meta">
        <span className={`dashboard-kpi-trend ${trendClass}`}>
          {trend.arrow} {trend.pctLabel}
        </span>
        {hint ? <span className="dashboard-kpi-hint">{hint}</span> : null}
      </p>
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

export function BriefcaseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

export function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export function OfferIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M20 12v10H4V12M2 7h20v5H2V7zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}
