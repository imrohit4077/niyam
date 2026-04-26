import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardMetrics'

const trendArrow: Record<TrendDirection, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
}

const trendClass: Record<TrendDirection, string> = {
  up: 'dashboard-summary-trend--up',
  down: 'dashboard-summary-trend--down',
  flat: 'dashboard-summary-trend--flat',
}

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendLabel: string
  trendDirection: TrendDirection
  footnote?: string
  primary?: boolean
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trendLabel,
  trendDirection,
  footnote,
  primary,
}: DashboardSummaryCardProps) {
  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {icon}
        </div>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      <div className={`dashboard-summary-trend ${trendClass[trendDirection]}`}>
        <span className="dashboard-summary-trend-arrow" aria-hidden>
          {trendArrow[trendDirection]}
        </span>
        <span>{trendLabel}</span>
        <span className="dashboard-summary-trend-hint">vs prior month</span>
      </div>
      {footnote ? <p className="dashboard-summary-footnote">{footnote}</p> : null}
    </article>
  )
}

export function CandidatesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function BriefcaseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

export function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export function OfferIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M20 12v10H4V12" />
      <path d="M22 7H2v5h20V7z" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}
