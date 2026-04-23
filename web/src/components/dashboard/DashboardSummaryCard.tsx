import type { ReactNode } from 'react'

type Props = {
  label: string
  value: string | number
  hint?: string
  icon: ReactNode
  trendLabel: string
  trendDirection: 'up' | 'down' | 'flat'
  primary?: boolean
}

export function DashboardSummaryCard({ label, value, hint, icon, trendLabel, trendDirection, primary }: Props) {
  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-kpi-trend dashboard-kpi-trend--up'
      : trendDirection === 'down'
        ? 'dashboard-kpi-trend dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend dashboard-kpi-trend--flat'

  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-v2 ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <div className="dashboard-kpi-card-label-block">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
        <div className="dashboard-kpi-icon-wrap" aria-hidden>
          {icon}
        </div>
      </div>
      <p className={trendClass}>{trendLabel}</p>
      {hint ? <p className="dashboard-kpi-card-hint">{hint}</p> : null}
    </article>
  )
}

export function CandidatesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function BriefcaseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  )
}

export function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export function OfferIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}
