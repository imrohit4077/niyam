import type { ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
  /** Optional grid span (12-column layout). Default 6. */
  span?: 4 | 5 | 6 | 7 | 8 | 12
}

export default function DashboardPanel({ title, children, span = 6 }: Props) {
  const spanClass =
    span === 12
      ? 'dashboard-panel-span-12'
      : span === 8
        ? 'dashboard-panel-span-8'
        : span === 7
          ? 'dashboard-panel-span-7'
          : span === 5
            ? 'dashboard-panel-span-5'
            : span === 4
              ? 'dashboard-panel-span-4'
              : 'dashboard-panel-span-6'

  return (
    <section className={`panel dashboard-panel dashboard-modern-panel ${spanClass}`}>
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
