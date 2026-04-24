import type { ReactNode } from 'react'

type DashboardPanelProps = {
  title: string
  children: ReactNode
  /** Column span in the 12-col dashboard grid */
  span?: 4 | 6 | 8 | 12
}

const SPAN_CLASS: Record<NonNullable<DashboardPanelProps['span']>, string> = {
  4: 'dashboard-panel-span-4',
  6: 'dashboard-panel-span-6',
  8: 'dashboard-panel-span-8',
  12: 'dashboard-panel-span-12',
}

export function DashboardPanel({ title, children, span = 6 }: DashboardPanelProps) {
  const spanClass = SPAN_CLASS[span]
  return (
    <section className={`panel dashboard-panel dashboard-modern-panel ${spanClass}`}>
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
