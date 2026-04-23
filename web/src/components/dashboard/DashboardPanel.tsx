import type { ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
  /** Optional right-side slot (filters, links). */
  actions?: ReactNode
  className?: string
}

export function DashboardPanel({ title, children, actions, className = '' }: Props) {
  return (
    <section className={`panel dashboard-panel dashboard-modern-panel ${className}`.trim()}>
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
        {actions ? <div className="dashboard-panel-header-actions">{actions}</div> : null}
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
