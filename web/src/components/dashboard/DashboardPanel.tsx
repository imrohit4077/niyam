import type { ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
  /** Optional wider layout (CSS class suffix) */
  spanClass?: string
}

export function DashboardPanel({ title, children, spanClass = '' }: Props) {
  return (
    <section className={`panel dashboard-panel dashboard-modern-panel ${spanClass}`.trim()}>
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
