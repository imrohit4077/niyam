import type { ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
  className?: string
}

export function DashboardPanel({ title, children, className }: Props) {
  const sectionClass = ['panel', 'dashboard-panel', 'dashboard-modern-panel', className].filter(Boolean).join(' ')
  return (
    <section className={sectionClass}>
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
