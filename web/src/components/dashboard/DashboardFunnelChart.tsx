import { type ChartOptions } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { DASHBOARD_CHART_BRAND, DASHBOARD_CHART_MUTED } from './dashboardConstants'

const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'] as const
const STAGE_KEYS = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

type Props = {
  counts: Record<string, number>
  emptyLabel?: string
}

export function DashboardFunnelChart({ counts, emptyLabel = 'No applicants for this job yet.' }: Props) {
  const data = STAGE_KEYS.map(k => counts[k] ?? 0)
  if (data.every(v => v === 0)) {
    return <div className="dashboard-empty">{emptyLabel}</div>
  }

  const chartData = {
    labels: [...STAGES],
    datasets: [
      {
        label: 'Candidates',
        data,
        backgroundColor: STAGE_KEYS.map((_, i) =>
          i === STAGE_KEYS.length - 1 ? DASHBOARD_CHART_BRAND : DASHBOARD_CHART_MUTED[i % DASHBOARD_CHART_MUTED.length],
        ),
        borderRadius: 8,
        maxBarThickness: 28,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y' as const,
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
        ticks: { color: '#374151', font: { size: 12, weight: 500 } },
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
