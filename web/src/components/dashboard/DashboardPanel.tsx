import type { ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
  /** Wider panel spanning full grid row (12 cols) */
  fullWidth?: boolean
  className?: string
}

export default function DashboardPanel({ title, children, fullWidth, className }: Props) {
  return (
    <section
      className={`panel dashboard-panel dashboard-modern-panel ${fullWidth ? 'dashboard-panel-full' : ''} ${className ?? ''}`}
    >
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
