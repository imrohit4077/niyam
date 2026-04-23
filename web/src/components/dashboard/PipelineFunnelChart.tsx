import type { ChartOptions } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { DASHBOARD_CHART_COLORS, FUNNEL_STAGES, type FunnelStage } from './dashboardMetrics'

const COLORS = DASHBOARD_CHART_COLORS

const STAGE_LABELS: Record<FunnelStage, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
}

type Props = {
  counts: Record<FunnelStage, number>
  emptyLabel?: string
}

export function PipelineFunnelChart({ counts, emptyLabel = 'No pipeline data yet.' }: Props) {
  const labels = FUNNEL_STAGES.map(s => STAGE_LABELS[s])
  const data = FUNNEL_STAGES.map(s => counts[s] ?? 0)
  const total = data.reduce((a, b) => a + b, 0)
  if (total === 0) {
    return <div className="dashboard-empty">{emptyLabel}</div>
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
            const v = Number(ctx.raw) || 0
            const pct = total > 0 ? Math.round((v / total) * 100) : 0
            return `${v} (${pct}% of funnel volume)`
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
        ticks: { color: '#475569', font: { size: 12, weight: 500 } },
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
              data,
              backgroundColor: FUNNEL_STAGES.map((_, i) => COLORS[i % COLORS.length]),
              borderRadius: 8,
              maxBarThickness: 28,
            },
          ],
        }}
        options={options}
      />
    </div>
  )
}
