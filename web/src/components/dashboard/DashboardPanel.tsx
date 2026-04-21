import type { ReactNode } from 'react'

type DashboardPanelProps = {
  title: string
  children: ReactNode
  /** Wider panel spanning more grid columns (set via className from parent grid). */
  className?: string
}

export function DashboardPanel({ title, children, className = '' }: DashboardPanelProps) {
  return (
    <section className={`panel dashboard-panel dashboard-modern-panel ${className}`.trim()}>
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
