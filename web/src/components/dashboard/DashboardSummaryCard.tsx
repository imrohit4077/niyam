import type { ReactNode } from 'react'
import type { TrendIndicator } from './dashboardUtils'

function IconUsers() {
  return (
    <svg className="dashboard-summary-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 20a6 6 0 0 1 12 0M20 19a4 4 0 0 0-4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconBriefcase() {
  return (
    <svg className="dashboard-summary-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 9h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg className="dashboard-summary-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconGift() {
  return (
    <svg className="dashboard-summary-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 8V22M12 8h5.5A2.5 2.5 0 0 0 20 5.5v0A2.5 2.5 0 0 0 17.5 3h-1.14a2 2 0 0 0-1.64.86L12 8ZM12 8H6.5A2.5 2.5 0 0 1 4 5.5v0A2.5 2.5 0 0 1 6.5 3h1.14a2 2 0 0 1 1.64.86L12 8ZM20 12v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V12M2 8h20v4H2V8Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const ICONS = {
  users: IconUsers,
  briefcase: IconBriefcase,
  calendar: IconCalendar,
  gift: IconGift,
} as const

export type SummaryIconKey = keyof typeof ICONS

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trend,
  caption,
  loading,
}: {
  icon: SummaryIconKey | ReactNode
  label: string
  value: string | number
  trend: TrendIndicator
  caption?: string
  loading?: boolean
}) {
  const IconCmp = typeof icon === 'string' && icon in ICONS ? ICONS[icon as SummaryIconKey] : null

  return (
    <article className="dashboard-summary-card">
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {IconCmp ? <IconCmp /> : icon}
        </div>
        <span
          className={`dashboard-summary-trend dashboard-summary-trend-${trend.direction}`}
          title="Change vs prior period"
        >
          {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.label}
        </span>
      </div>
      <span className="dashboard-summary-label">{label}</span>
      {loading ? (
        <div className="dashboard-summary-skeleton-value" />
      ) : (
        <strong className="dashboard-summary-value">{value}</strong>
      )}
      {caption != null && caption !== '' && <p className="dashboard-summary-caption">{caption}</p>}
    </article>
  )
}
