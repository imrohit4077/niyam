import type { ChartOptions } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { DASHBOARD_CHART_COLORS } from './dashboardConstants'

type Props = {
  labels: string[]
  values: number[]
  emptyLabel?: string
}

export function DashboardFunnelChart({ labels, values, emptyLabel = 'No pipeline data for this job.' }: Props) {
  const total = values.reduce((a, b) => a + b, 0)
  if (total === 0) return <div className="dashboard-empty">{emptyLabel}</div>

  const colors = labels.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length])

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => {
            const v = Number(ctx.raw) || 0
            const pct = total > 0 ? Math.round((v / total) * 100) : 0
            return `${v} candidates (${pct}% of funnel)`
          },
        },
      },
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
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: 'Candidates',
              data: values,
              backgroundColor: colors,
              borderRadius: 6,
              maxBarThickness: 28,
            },
          ],
        }}
        options={options}
      />
    </div>
  )
}
