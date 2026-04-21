import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'neutral'

export type SummaryStatCardProps = {
  title: string
  value: string | number
  icon: ReactNode
  /** Percent change vs prior period (e.g. prior 30 days). */
  trendPercent: number | null
  trendDirection: TrendDirection
  footnote?: string
  loading?: boolean
  highlight?: boolean
}

function formatTrendPercent(n: number) {
  const rounded = Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 10) / 10
  const s = Number.isInteger(rounded) ? String(Math.trunc(rounded)) : String(rounded)
  return `${n > 0 ? '+' : ''}${s}%`
}

export function SummaryStatCard({
  title,
  value,
  icon,
  trendPercent,
  trendDirection,
  footnote,
  loading,
  highlight,
}: SummaryStatCardProps) {
  if (loading) {
    return (
      <article className={`dashboard-summary-card dashboard-summary-card-skeleton ${highlight ? 'dashboard-summary-card-highlight' : ''}`}>
        <div className="dashboard-summary-card-top">
          <span className="dashboard-summary-skel dashboard-summary-skel-icon" />
          <span className="dashboard-summary-skel dashboard-summary-skel-trend" />
        </div>
        <span className="dashboard-summary-skel dashboard-summary-skel-label" />
        <span className="dashboard-summary-skel dashboard-summary-skel-value" />
        <span className="dashboard-summary-skel dashboard-summary-skel-foot" />
      </article>
    )
  }

  const showTrend = trendPercent !== null && trendDirection !== 'neutral'
  const arrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'

  return (
    <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card-highlight' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {showTrend ? (
          <span
            className={`dashboard-summary-trend dashboard-summary-trend-${trendDirection}`}
            title="Vs prior 30 days"
          >
            {arrow} {formatTrendPercent(trendPercent)}
          </span>
        ) : (
          <span className="dashboard-summary-trend dashboard-summary-trend-neutral" title="Vs prior 30 days">
            → 0%
          </span>
        )}
      </div>
      <span className="dashboard-summary-label">{title}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {footnote ? <p className="dashboard-summary-foot">{footnote}</p> : null}
    </article>
  )
}

export function CandidatesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function BriefcaseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  )
}

export function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export function OfferIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12v10H4V12" />
      <path d="M2 7h20v5H2z" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}
