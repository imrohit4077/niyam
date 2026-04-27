import type { ReactNode } from 'react'

export function DashboardPanel({
  title,
  children,
  wide,
}: {
  title: string
  children: ReactNode
  /** Full-width row (12 columns) on the dashboard grid. */
  wide?: boolean
}) {
  return (
    <section className={`panel dashboard-panel dashboard-modern-panel${wide ? ' dashboard-panel-wide' : ''}`}>
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
