import type { ChartOptions } from 'chart.js'
import { Bar } from 'react-chartjs-2'

const STAGE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type FunnelStageKey = (typeof STAGE_ORDER)[number]

export type DashboardPipelineFunnelChartProps = {
  counts: Record<FunnelStageKey, number>
  formatLabel: (key: string) => string
}

const FUNNEL_COLORS = ['#0ea5e9', '#38bdf8', '#3b82f6', '#6366f1', '#10b981']

export default function DashboardPipelineFunnelChart({ counts, formatLabel }: DashboardPipelineFunnelChartProps) {
  const labels = STAGE_ORDER.map(k => formatLabel(k))
  const data = STAGE_ORDER.map(k => counts[k] ?? 0)
  const max = Math.max(...data, 1)

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Candidates',
        data,
        backgroundColor: FUNNEL_COLORS,
        borderRadius: 6,
        barThickness: 22,
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
          afterLabel: ctx => {
            const v = Number(ctx.raw) || 0
            const pct = max > 0 ? Math.round((v / max) * 100) : 0
            return `${pct}% of peak stage in funnel`
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#64748b', font: { size: 11 }, precision: 0 },
        grid: { color: 'rgba(148,163,184,0.2)' },
      },
      y: {
        ticks: { color: '#475569', font: { size: 12 } },
        grid: { display: false },
      },
    },
  }

  const total = data.reduce((a, b) => a + b, 0)
  if (total === 0) {
    return <div className="dashboard-empty">No pipeline data for this job yet.</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
      <Bar data={chartData} options={options} />
    </div>
  )
}
