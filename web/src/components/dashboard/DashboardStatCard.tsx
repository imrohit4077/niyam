import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export function DashboardStatCard({
  icon,
  label,
  value,
  sublabel,
  trendDirection,
  trendPct,
  trendCaption,
  primary,
  loading,
}: {
  icon: ReactNode
  label: string
  value: string | number
  sublabel?: string
  trendDirection?: TrendDirection
  trendPct?: number | null
  trendCaption?: string
  primary?: boolean
  loading?: boolean
}) {
  const trendArrow =
    trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : trendDirection === 'flat' ? '→' : null
  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-stat-trend-up'
      : trendDirection === 'down'
        ? 'dashboard-stat-trend-down'
        : 'dashboard-stat-trend-flat'

  return (
    <article className={`dashboard-stat-card${primary ? ' dashboard-stat-card-primary' : ''}`}>
      <div className="dashboard-stat-card-top">
        <span className="dashboard-stat-icon" aria-hidden>
          {icon}
        </span>
        {loading ? (
          <div className="dashboard-skeleton dashboard-skeleton-value" />
        ) : (
          <strong className="dashboard-stat-value">{value}</strong>
        )}
      </div>
      <span className="dashboard-stat-label">{label}</span>
      {loading ? (
        <div className="dashboard-skeleton dashboard-skeleton-line" />
      ) : (
        <>
          {sublabel ? <p className="dashboard-stat-sublabel">{sublabel}</p> : null}
          <div
            className={`dashboard-stat-trend${trendPct == null && !trendCaption ? ' dashboard-stat-trend-muted' : ''} ${trendClass}`}
          >
            {trendPct != null && trendArrow ? (
              <>
                <span className="dashboard-stat-trend-arrow" aria-hidden>
                  {trendArrow}
                </span>
                <span>{Math.abs(trendPct)}%</span>
                {trendCaption ? <span className="dashboard-stat-trend-caption">{trendCaption}</span> : null}
              </>
            ) : trendCaption ? (
              <span>{trendCaption}</span>
            ) : (
              <span>—</span>
            )}
          </div>
        </>
      )}
    </article>
  )
}
