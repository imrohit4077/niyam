import type { ReactNode } from 'react'

export function DashboardPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel dashboard-panel dashboard-modern-panel">
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}

export function DashboardLoadingBlock() {
  return (
    <div className="dashboard-skeleton-block" aria-busy aria-label="Loading">
      <div className="dashboard-skeleton dashboard-skeleton--line" />
      <div className="dashboard-skeleton dashboard-skeleton--line dashboard-skeleton--short" />
      <div className="dashboard-skeleton dashboard-skeleton--chart" />
    </div>
  )
}

export function DashboardErrorRow({ msg }: { msg: string }) {
  return (
    <div
      style={{
        padding: '16px 20px',
        color: 'var(--error)',
        fontSize: 13,
        background: 'var(--error-bg)',
        borderBottom: '1px solid var(--error-border)',
      }}
    >
      {msg}
    </div>
  )
}
