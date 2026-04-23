import type { ChartOptions } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { DASHBOARD_CHART_COLORS } from './dashboardMetrics'

type Row = { jobId: number; title: string; count: number }

type Props = {
  rows: Row[]
  emptyLabel?: string
}

export function JobsApplicantsBarChart({ rows, emptyLabel = 'No applicants yet.' }: Props) {
  const top = [...rows].sort((a, b) => b.count - a.count).slice(0, 8)
  if (top.length === 0 || top.every(r => r.count === 0)) {
    return <div className="dashboard-empty">{emptyLabel}</div>
  }

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: items => {
            const i = items[0]?.dataIndex ?? 0
            return top[i]?.title ?? ''
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.2)' },
      },
      y: {
        ticks: { color: '#475569', font: { size: 11 } },
        grid: { display: false },
      },
    },
  }

  const labels = top.map(r => (r.title.length > 34 ? `${r.title.slice(0, 32)}…` : r.title))

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-jobs-bar">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: 'Applicants',
              data: top.map(r => r.count),
              backgroundColor: DASHBOARD_CHART_COLORS[0],
              borderRadius: 6,
              maxBarThickness: 22,
            },
          ],
        }}
        options={options}
      />
    </div>
  )
}
