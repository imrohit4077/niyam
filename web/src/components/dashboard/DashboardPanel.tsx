import type { ReactNode } from 'react'

type DashboardPanelProps = {
  title: string
  children: ReactNode
  /** Optional action in header (e.g. link) */
  headerRight?: ReactNode
}

export function DashboardPanel({ title, children, headerRight }: DashboardPanelProps) {
  return (
    <section className="panel dashboard-panel dashboard-modern-panel">
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
        {headerRight ? <div className="dashboard-panel-header-right">{headerRight}</div> : null}
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
