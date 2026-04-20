import type { ChartOptions } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { DASHBOARD_CHART_PALETTE } from './dashboardChartTheme'

type Props = {
  labels: string[]
  values: number[]
}

const FUNNEL_COLORS = [...DASHBOARD_CHART_PALETTE].slice(0, 5)

export function DashboardPipelineFunnel({ labels, values }: Props) {
  const total = values.reduce((a, b) => a + b, 0)
  if (total === 0) {
    return <div className="dashboard-empty">No applications in the workspace yet.</div>
  }

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Candidates',
        data: values,
        backgroundColor: values.map((_, i) => FUNNEL_COLORS[i % FUNNEL_COLORS.length] ?? '#0ea5e9'),
        borderRadius: 8,
        maxBarThickness: 28,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label(ctx) {
            const v = Number(ctx.raw) || 0
            const pct = total > 0 ? Math.round((v / total) * 100) : 0
            return `${v} (${pct}% of pipeline)`
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#475569', font: { size: 12 } },
        grid: { display: false },
      },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar data={chartData} options={options} />
    </div>
  )
}
