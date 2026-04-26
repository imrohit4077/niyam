import type { ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
  /** Wider panel spanning 2 columns in 12-col grid */
  span?: 6 | 12
}

export function DashboardPanel({ title, children, span = 6 }: Props) {
  return (
    <section
      className={`panel dashboard-panel dashboard-modern-panel ${span === 12 ? 'dashboard-panel-span-12' : ''}`}
    >
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
