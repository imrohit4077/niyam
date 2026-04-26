import { type ChartOptions } from 'chart.js'
import { Bar } from 'react-chartjs-2'

const funnelStageOrder = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

function formatStageLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

const funnelColors = ['#0ea5e9', '#38bdf8', '#3b82f6', '#6366f1', '#10b981']

type PipelineFunnelProps = {
  counts: Record<string, number>
  emptyLabel?: string
}

/** Horizontal bars: widest = applied, narrowest toward hired (classic funnel read). */
export function PipelineFunnelChart({ counts, emptyLabel = 'No pipeline data yet.' }: PipelineFunnelProps) {
  const labels = funnelStageOrder.map(formatStageLabel)
  const data = funnelStageOrder.map(stage => counts[stage] ?? 0)
  const max = Math.max(...data, 1)

  if (data.every(v => v === 0)) {
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
          label: ctx => `${ctx.parsed.x} candidates`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: max,
        ticks: { color: '#64748b', font: { size: 11 }, precision: 0 },
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
              backgroundColor: funnelColors,
              borderRadius: 8,
              barThickness: 22,
            },
          ],
        }}
        options={options}
      />
    </div>
  )
}

type JobDistributionProps = {
  labels: string[]
  values: number[]
  emptyLabel?: string
}

export function JobDistributionBarChart({
  labels,
  values,
  emptyLabel = 'No applicants across jobs yet.',
}: JobDistributionProps) {
  if (values.length === 0 || values.every(v => v === 0)) {
    return <div className="dashboard-empty">{emptyLabel}</div>
  }

  const barColor = '#3b82f6'

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45, minRotation: 0 },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.2)' },
      },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: 'Applicants',
              data: values,
              backgroundColor: barColor,
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
