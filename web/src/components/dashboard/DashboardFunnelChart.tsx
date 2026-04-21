import type { ChartOptions } from 'chart.js'
import { Bar } from 'react-chartjs-2'

type FunnelRow = { key: string; label: string; value: number }

const FUNNEL_COLORS = ['#0ea5e9', '#38bdf8', '#22c55e', '#a78bfa', '#14b8a6']

export function DashboardFunnelChart({ rows, emptyLabel }: { rows: FunnelRow[]; emptyLabel: string }) {
  const max = Math.max(...rows.map(r => r.value), 0)
  if (max === 0) return <div className="dashboard-empty">{emptyLabel}</div>

  const data = {
    labels: rows.map(r => r.label),
    datasets: [
      {
        label: 'Candidates',
        data: rows.map(r => r.value),
        backgroundColor: rows.map((_, i) => FUNNEL_COLORS[i % FUNNEL_COLORS.length]),
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
          label: ctx => {
            const v = typeof ctx.raw === 'number' ? ctx.raw : 0
            return ` ${v} candidate${v === 1 ? '' : 's'} (cumulative)`
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
      <Bar data={data} options={options} />
    </div>
  )
}
