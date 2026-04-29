import type { ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
  /** Extra classes on the outer section (e.g. grid span). */
  className?: string
}

export default function DashboardPanel({ title, children, className = '' }: Props) {
  return (
    <section className={['panel', 'dashboard-panel', 'dashboard-modern-panel', className].filter(Boolean).join(' ')}>
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
