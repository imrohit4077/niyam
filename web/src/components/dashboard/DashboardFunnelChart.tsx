import { Bar } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import type { FunnelStage } from '../../lib/dashboardMetrics'
import { DASHBOARD_CHART_COLORS } from './dashboardChartUtils'

const ORDER: { stage: FunnelStage; label: string }[] = [
  { stage: 'applied', label: 'Applied' },
  { stage: 'screening', label: 'Screening' },
  { stage: 'interview', label: 'Interview' },
  { stage: 'offer', label: 'Offer' },
  { stage: 'hired', label: 'Hired' },
]

export function DashboardFunnelChart({ counts }: { counts: Record<FunnelStage, number> }) {
  const values = ORDER.map(({ stage }) => counts[stage] ?? 0)
  const total = values.reduce((a, b) => a + b, 0)
  if (total === 0) {
    return <div className="dashboard-empty">No pipeline data yet. Applications will appear here.</div>
  }

  const chartData = {
    labels: ORDER.map(o => o.label),
    datasets: [
      {
        label: 'Candidates',
        data: values,
        backgroundColor: ORDER.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length]),
        borderRadius: 8,
        maxBarThickness: 44,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#475569', font: { size: 12 } },
        grid: { display: false },
      },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
      <Bar data={chartData} options={options} />
    </div>
  )
}
