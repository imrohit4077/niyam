import type { ChartOptions } from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import type { DashboardSlice } from './dashboardUtils'

const FUNNEL_STAGE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

const FUNNEL_LABELS: Record<(typeof FUNNEL_STAGE_ORDER)[number], string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
}

export function DashboardDoughnutChart({
  slices,
  emptyLabel,
  legendLabel,
}: {
  slices: DashboardSlice[]
  emptyLabel: string
  legendLabel: string
}) {
  if (slices.length === 0) return <div className="dashboard-empty">{emptyLabel}</div>

  const chartData = {
    labels: slices.map(slice => slice.label),
    datasets: [
      {
        label: legendLabel,
        data: slices.map(slice => slice.value),
        backgroundColor: slices.map(slice => slice.color),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  }

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' } },
    },
  }

  return (
    <div className="dashboard-chart-shell">
      <Doughnut data={chartData} options={options} />
    </div>
  )
}

export function WorkspaceSourcePie({ slices, emptyLabel }: { slices: DashboardSlice[]; emptyLabel: string }) {
  if (slices.length === 0) return <div className="dashboard-empty">{emptyLabel}</div>
  return (
    <DashboardDoughnutChart slices={slices} emptyLabel={emptyLabel} legendLabel="Candidates" />
  )
}

export function PipelineFunnelBar({
  countsByStatus,
  emptyLabel,
}: {
  countsByStatus: Record<string, number>
  emptyLabel: string
}) {
  const labels = FUNNEL_STAGE_ORDER.map(k => FUNNEL_LABELS[k])
  const data = FUNNEL_STAGE_ORDER.map(k => countsByStatus[k] ?? 0)
  const total = data.reduce((a, b) => a + b, 0)
  if (total === 0) return <div className="dashboard-empty">{emptyLabel}</div>

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
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
              data,
              backgroundColor: FUNNEL_STAGE_ORDER.map(
                (_, i) => ['#38bdf8', '#3b82f6', '#6366f1', '#a855f7', '#10b981'][i],
              ),
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

function shortenTitle(title: string, max = 30) {
  const t = title.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export function JobDistributionBar({
  jobRows,
  emptyLabel,
}: {
  jobRows: { title: string; count: number }[]
  emptyLabel: string
}) {
  const top = [...jobRows].sort((a, b) => b.count - a.count).slice(0, 10)
  if (top.length === 0 || top.every(r => r.count === 0)) {
    return <div className="dashboard-empty">{emptyLabel}</div>
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
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
        ticks: { color: '#475569', font: { size: 11 } },
        grid: { display: false },
      },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
      <Bar
        data={{
          labels: top.map(r => shortenTitle(r.title)),
          datasets: [
            {
              data: top.map(r => r.count),
              backgroundColor: '#3b82f6',
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
