import type { ReactNode } from 'react'

export type TrendTone = 'up' | 'down' | 'flat'

export type DashboardKpiSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendLabel: string
  trendTone: TrendTone
  primary?: boolean
  loading?: boolean
}

function TrendArrow({ tone }: { tone: TrendTone }) {
  if (tone === 'up') return <span aria-hidden>↑</span>
  if (tone === 'down') return <span aria-hidden>↓</span>
  return <span aria-hidden>→</span>
}

export function DashboardKpiSummaryCard({
  label,
  value,
  icon,
  trendLabel,
  trendTone,
  primary,
  loading,
}: DashboardKpiSummaryCardProps) {
  if (loading) {
    return (
      <article className={`dashboard-kpi-summary-card ${primary ? 'dashboard-kpi-summary-card--primary' : ''}`}>
        <div className="dashboard-kpi-summary-skeleton-icon" />
        <div className="dashboard-kpi-summary-skeleton-line dashboard-kpi-summary-skeleton-line--short" />
        <div className="dashboard-kpi-summary-skeleton-line dashboard-kpi-summary-skeleton-line--value" />
        <div className="dashboard-kpi-summary-skeleton-line dashboard-kpi-summary-skeleton-line--trend" />
      </article>
    )
  }

  return (
    <article className={`dashboard-kpi-summary-card ${primary ? 'dashboard-kpi-summary-card--primary' : ''}`}>
      <div className="dashboard-kpi-summary-top">
        <div className="dashboard-kpi-summary-icon" aria-hidden>
          {icon}
        </div>
        <span className="dashboard-kpi-summary-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-summary-value">{value}</strong>
      <p className={`dashboard-kpi-summary-trend dashboard-kpi-summary-trend--${trendTone}`}>
        <TrendArrow tone={trendTone} /> {trendLabel}
      </p>
    </article>
  )
}
