import type { ChartOptions } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { DASHBOARD_CHART_COLORS, FUNNEL_STAGES } from './dashboardUtils'

const FUNNEL_COLORS = FUNNEL_STAGES.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length])

export function PipelineFunnelChart({
  countsByStage,
  title = 'Workspace pipeline',
}: {
  countsByStage: Record<string, number>
  title?: string
}) {
  const labels = FUNNEL_STAGES.map(s => s.label)
  const data = FUNNEL_STAGES.map(s => countsByStage[s.key] ?? 0)
  const total = data.reduce((a, b) => a + b, 0)

  if (total === 0) {
    return (
      <div className="dashboard-chart-empty-wrap">
        <p className="dashboard-chart-empty-title">{title}</p>
        <div className="dashboard-empty">No applications in pipeline stages yet.</div>
      </div>
    )
  }

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Candidates',
        data,
        backgroundColor: FUNNEL_COLORS,
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
            return `${v} (${pct}% of funnel)`
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
      <Bar data={chartData} options={options} />
    </div>
  )
}
