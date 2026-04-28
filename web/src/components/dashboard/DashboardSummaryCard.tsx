import type { ReactNode } from 'react'

export type DashboardSummaryCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  /** e.g. "vs prior 30 days" */
  trendHint?: string
  trendArrow?: '↑' | '↓' | '→'
  trendLabel?: string
  /** Muted line under value */
  sublabel?: string
  highlight?: boolean
  loading?: boolean
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trendHint = 'vs prior 30 days',
  trendArrow = '→',
  trendLabel = '0%',
  sublabel,
  highlight,
  loading,
}: DashboardSummaryCardProps) {
  if (loading) {
    return (
      <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card-highlight' : ''} dashboard-summary-card-skeleton`}>
        <div className="dashboard-summary-skel-icon" />
        <div className="dashboard-summary-skel-line dashboard-summary-skel-label" />
        <div className="dashboard-summary-skel-line dashboard-summary-skel-value" />
        <div className="dashboard-summary-skel-line dashboard-summary-skel-trend" />
      </article>
    )
  }

  return (
    <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card-highlight' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      <div className="dashboard-summary-trend" title={trendHint}>
        <span className={`dashboard-summary-trend-arrow dashboard-summary-trend-${trendArrow === '↑' ? 'up' : trendArrow === '↓' ? 'down' : 'flat'}`}>
          {trendArrow}
        </span>
        <span className="dashboard-summary-trend-pct">{trendLabel}</span>
        <span className="dashboard-summary-trend-hint">{trendHint}</span>
      </div>
      {sublabel ? <p className="dashboard-summary-sublabel">{sublabel}</p> : null}
    </article>
  )
}
