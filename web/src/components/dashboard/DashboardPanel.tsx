import type { ReactNode } from 'react'

export function DashboardPanel({
  title,
  children,
  span = 6,
}: {
  title: string
  children: ReactNode
  /** Grid span in the 12-column dashboard layout */
  span?: 6 | 12
}) {
  const spanClass = span === 12 ? 'dashboard-panel-span-12' : ''
  return (
    <section className={`panel dashboard-panel dashboard-modern-panel ${spanClass}`}>
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
