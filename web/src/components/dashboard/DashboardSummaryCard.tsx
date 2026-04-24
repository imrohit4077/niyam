import type { ReactElement } from 'react'
import type { TrendBadge } from './dashboardUtils'

type Props = {
  label: string
  value: string | number
  subtitle?: string
  trend?: TrendBadge
  icon: 'users' | 'briefcase' | 'calendar' | 'gift'
  variant?: 'default' | 'primary'
}

const icons: Record<Props['icon'], ReactElement> = {
  users: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 18.5A5.5 5.5 0 0 1 9.5 13h5A5.5 5.5 0 0 1 20 18.5v.5H4v-.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  briefcase: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 9h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  calendar: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 3v3m8-3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  gift: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 8v13M4 12h16M4 8h16v4H4V8Zm4-4h8a2 2 0 0 1 0 4H8a2 2 0 0 1 0-4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
}

export function DashboardSummaryCard({ label, value, subtitle, trend, icon, variant = 'default' }: Props) {
  const cls = variant === 'primary' ? 'dashboard-summary-card dashboard-summary-card-primary' : 'dashboard-summary-card'

  return (
    <article className={cls}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-card-icon" aria-hidden>
          {icons[icon]}
        </span>
        {trend && (
          <span
            className={`dashboard-summary-trend dashboard-summary-trend-${trend.direction}`}
            title={trend.srLabel}
          >
            <span className="visually-hidden">{trend.srLabel}</span>
            {trend.label}
          </span>
        )}
      </div>
      <span className="dashboard-summary-card-label">{label}</span>
      <strong className="dashboard-summary-card-value">{value}</strong>
      {subtitle ? <p className="dashboard-summary-card-sub">{subtitle}</p> : null}
    </article>
  )
}

export function DashboardSummaryCardSkeleton() {
  return (
    <div className="dashboard-summary-card dashboard-summary-card-skeleton" aria-busy="true" aria-label="Loading metric">
      <div className="dashboard-skeleton dashboard-skeleton-icon" />
      <div className="dashboard-skeleton dashboard-skeleton-line sm" />
      <div className="dashboard-skeleton dashboard-skeleton-line lg" />
      <div className="dashboard-skeleton dashboard-skeleton-line md" />
    </div>
  )
}
