import type { ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
  /** Wider panel spanning full grid row */
  wide?: boolean
}

export function DashboardPanel({ title, children, wide }: Props) {
  return (
    <section className={`panel dashboard-panel dashboard-modern-panel${wide ? ' dashboard-panel--wide' : ''}`}>
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
