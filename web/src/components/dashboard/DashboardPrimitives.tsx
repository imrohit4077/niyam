import type { ReactNode } from 'react'

export function DashboardPanel({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  const extra = className ? ` ${className}` : ''
  return (
    <section className={`panel dashboard-panel dashboard-modern-panel${extra}`}>
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}

type KpiTrend = {
  pct: number | null
  label: string
  direction: 'up' | 'down' | 'flat'
}

export function DashboardKpiCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  highlight,
}: {
  label: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  trend: KpiTrend
  highlight?: boolean
}) {
  const trendClass =
    trend.direction === 'up'
      ? 'dashboard-kpi-trend--up'
      : trend.direction === 'down'
        ? 'dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend--flat'

  return (
    <article className={`dashboard-kpi-card-v2 ${highlight ? 'dashboard-kpi-card-v2--primary' : ''}`}>
      <div className="dashboard-kpi-card-v2-top">
        <div className="dashboard-kpi-card-v2-icon" aria-hidden>
          {icon}
        </div>
        <div className={`dashboard-kpi-trend ${trendClass}`} title={trend.label}>
          {trend.direction === 'up' && <span className="dashboard-kpi-trend-arrow">↑</span>}
          {trend.direction === 'down' && <span className="dashboard-kpi-trend-arrow">↓</span>}
          {trend.direction === 'flat' && <span className="dashboard-kpi-trend-arrow">→</span>}
          <span className="dashboard-kpi-trend-pct">{trend.label}</span>
        </div>
      </div>
      <span className="dashboard-kpi-card-v2-label">{label}</span>
      <strong className="dashboard-kpi-card-v2-value">{value}</strong>
      {subtitle ? <p className="dashboard-kpi-card-v2-sub">{subtitle}</p> : null}
    </article>
  )
}

export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-kpi-card-v2 dashboard-kpi-card-v2--skeleton" aria-hidden>
      <div className="dashboard-skeleton dashboard-skeleton--icon" />
      <div className="dashboard-skeleton dashboard-skeleton--line sm" />
      <div className="dashboard-skeleton dashboard-skeleton--line lg" />
      <div className="dashboard-skeleton dashboard-skeleton--line md" />
    </div>
  )
}

export function DashboardChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short" style={{ height }} aria-hidden>
      <div className="dashboard-skeleton dashboard-skeleton--chart" />
    </div>
  )
}

export function DashboardPanelSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={`dashboard-skeleton dashboard-skeleton--block ${i === lines - 1 ? 'short' : ''}`} />
      ))}
    </div>
  )
}

export function IconCandidates() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function IconBriefcase() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M2 13h20" />
    </svg>
  )
}

export function IconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

export function IconOffer() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  )
}
