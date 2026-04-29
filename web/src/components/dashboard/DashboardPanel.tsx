import type { ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
  className?: string
}

export function DashboardPanel({ title, children, className = '' }: Props) {
  return (
    <section className={`panel dashboard-panel dashboard-modern-panel ${className}`.trim()}>
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
