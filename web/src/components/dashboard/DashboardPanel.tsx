import type { ReactNode } from 'react'

export function DashboardPanel({
  title,
  subtitle,
  children,
  span = 'half',
}: {
  title: string
  subtitle?: string
  children: ReactNode
  /** `full` spans the entire dashboard grid row (12 cols). */
  span?: 'half' | 'full'
}) {
  return (
    <section
      className={`panel dashboard-panel dashboard-modern-panel${span === 'full' ? ' dashboard-panel--span-full' : ''}`}
    >
      <div className="panel-header dashboard-modern-panel-header">
        <div className="dashboard-panel-title-block">
          <span className="panel-header-title">{title}</span>
          {subtitle ? <span className="dashboard-panel-subtitle">{subtitle}</span> : null}
        </div>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
