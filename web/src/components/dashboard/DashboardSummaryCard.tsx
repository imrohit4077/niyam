import type { ReactNode } from 'react'

export type DashboardTrend = {
  pct: number | null
  label: string
}

function formatTrend(trend: DashboardTrend) {
  if (trend.pct == null) return { arrow: '—' as const, text: trend.label, tone: 'neutral' as const }
  if (trend.pct === 0) return { arrow: '→' as const, text: '0%', tone: 'neutral' as const }
  const up = trend.pct > 0
  return {
    arrow: up ? ('↑' as const) : ('↓' as const),
    text: `${up ? '+' : ''}${trend.pct}%`,
    tone: up ? ('up' as const) : ('down' as const),
  }
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trend,
  sublabel,
  highlight,
}: {
  icon: ReactNode
  label: string
  value: string | number
  trend: DashboardTrend
  sublabel?: string
  highlight?: boolean
}) {
  const t = formatTrend(trend)
  return (
    <article className={`dashboard-summary-card${highlight ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card__top">
        <span className="dashboard-summary-card__icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-card__label">{label}</span>
      </div>
      <strong className="dashboard-summary-card__value">{value}</strong>
      <div className="dashboard-summary-card__meta">
        <span className={`dashboard-summary-card__trend dashboard-summary-card__trend--${t.tone}`}>
          <span className="dashboard-summary-card__trend-arrow">{t.arrow}</span>
          <span>{t.text}</span>
        </span>
        {sublabel ? <span className="dashboard-summary-card__sublabel">{sublabel}</span> : null}
      </div>
    </article>
  )
}
