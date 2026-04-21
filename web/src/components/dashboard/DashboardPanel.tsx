import type { ReactNode } from 'react'

export function DashboardPanel({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  const cls = ['panel', 'dashboard-panel', 'dashboard-modern-panel', className].filter(Boolean).join(' ')
  return (
    <section className={cls}>
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
