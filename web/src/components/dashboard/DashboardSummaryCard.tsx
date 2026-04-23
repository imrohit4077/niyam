import type { ReactNode } from 'react'
import type { TrendResult } from './dashboardHelpers'

const ICONS: Record<string, ReactNode> = {
  candidates: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 20a8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  jobs: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M4 9h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  calendar: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  offer: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V7l8-4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

function TrendBadge({ trend }: { trend: TrendResult }) {
  const arrow =
    trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : trend.direction === 'flat' ? '→' : ''
  return (
    <span
      className={`dashboard-kpi-trend dashboard-kpi-trend--${trend.direction}`}
      title={trend.label}
    >
      {arrow && <span className="dashboard-kpi-trend-arrow">{arrow}</span>}
      <span className="dashboard-kpi-trend-text">{trend.label}</span>
    </span>
  )
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  subtitle,
  trend,
  primary,
}: {
  icon: keyof typeof ICONS
  label: string
  value: string | number
  subtitle?: string
  trend?: TrendResult | null
  primary?: boolean
}) {
  return (
    <article className={`dashboard-kpi-card ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {ICONS[icon]}
        </span>
        <span className="dashboard-kpi-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      {trend && <TrendBadge trend={trend} />}
      {subtitle && <p className="dashboard-kpi-subtitle">{subtitle}</p>}
    </article>
  )
}

export function DashboardKpiSkeleton() {
  return (
    <article className="dashboard-kpi-card dashboard-kpi-skeleton" aria-busy="true" aria-label="Loading metric">
      <div className="dashboard-kpi-skeleton-icon" />
      <div className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--short" />
      <div className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--value" />
      <div className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--muted" />
    </article>
  )
}
