import { SummaryCard } from './SummaryCard'

export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid--summary" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <SummaryCard key={i} loading />
      ))}
    </div>
  )
}

export function PanelChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div
      className={`dashboard-chart-skeleton ${short ? 'dashboard-chart-skeleton--short' : ''}`}
      aria-busy="true"
      aria-label="Loading chart"
    />
  )
}
