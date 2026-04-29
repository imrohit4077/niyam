import type { TrendTone } from './dashboardUtils'

const ICONS = {
  users: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  briefcase: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  ),
  calendar: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  gift: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  ),
} as const

export type SummaryIcon = keyof typeof ICONS

type Props = {
  title: string
  value: string | number
  subtitle?: string
  icon: SummaryIcon
  trendLabel: string
  trendTone: TrendTone
  loading?: boolean
}

export function SummaryStatCard({ title, value, subtitle, icon, trendLabel, trendTone, loading }: Props) {
  const trendClass =
    trendTone === 'up' ? 'dashboard-stat-trend-up' : trendTone === 'down' ? 'dashboard-stat-trend-down' : 'dashboard-stat-trend-neutral'

  if (loading) {
    return (
      <article className="dashboard-stat-card dashboard-stat-card-skeleton" aria-busy="true">
        <div className="dashboard-stat-skel-icon" />
        <div className="dashboard-stat-skel-line dashboard-stat-skel-line-short" />
        <div className="dashboard-stat-skel-line dashboard-stat-skel-line-value" />
        <div className="dashboard-stat-skel-line dashboard-stat-skel-line-trend" />
      </article>
    )
  }

  return (
    <article className="dashboard-stat-card">
      <div className="dashboard-stat-card-top">
        <div className="dashboard-stat-icon" aria-hidden>
          {ICONS[icon]}
        </div>
        <span className={`dashboard-stat-trend ${trendClass}`}>{trendLabel}</span>
      </div>
      <p className="dashboard-stat-title">{title}</p>
      <p className="dashboard-stat-value">{value}</p>
      {subtitle ? <p className="dashboard-stat-subtitle">{subtitle}</p> : null}
    </article>
  )
}
