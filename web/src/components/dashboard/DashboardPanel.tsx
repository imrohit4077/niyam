import type { ReactNode } from 'react'

type DashboardPanelProps = {
  title: string
  children: ReactNode
  /** Optional right slot (e.g. link) */
  actions?: ReactNode
}

export function DashboardPanel({ title, children, actions }: DashboardPanelProps) {
  return (
    <section className="panel dashboard-panel dashboard-modern-panel">
      <div className="panel-header dashboard-modern-panel-header dashboard-modern-panel-header--flex">
        <span className="panel-header-title">{title}</span>
        {actions ? <div className="dashboard-panel-header-actions">{actions}</div> : null}
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
