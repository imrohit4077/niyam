import type { ChartOptions } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { PIPELINE_FUNNEL_STAGES } from './dashboardConstants'
import { formatDashboardLabel } from './dashboardUtils'

const FUNNEL_COLOR = 'rgba(37, 99, 235, 0.85)'

export function DashboardPipelineFunnelChart({ counts }: { counts: Record<string, number> }) {
  const labels = PIPELINE_FUNNEL_STAGES.map(s => formatDashboardLabel(s))
  const data = PIPELINE_FUNNEL_STAGES.map(s => counts[s] ?? 0)
  const max = Math.max(...data, 1)

  if (data.every(v => v === 0)) {
    return <div className="dashboard-empty">No pipeline data yet. Applications will appear here by stage.</div>
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.parsed.x ?? 0} candidates`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        suggestedMax: max + Math.ceil(max * 0.12),
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
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
              label: 'Candidates',
              data,
              backgroundColor: FUNNEL_COLOR,
              borderRadius: 6,
              barThickness: 22,
            },
          ],
        }}
        options={options}
      />
    </div>
  )
}
