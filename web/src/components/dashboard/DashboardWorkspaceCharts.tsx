import type { ChartOptions } from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'
import { DASHBOARD_CHART_COLORS, PIPELINE_FUNNEL_ORDER } from './constants'
import { formatDashboardLabel } from './formatters'

const funnelBarOptions: ChartOptions<'bar'> = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => {
          const n = Number(ctx.raw) || 0
          return ` ${n} candidate${n === 1 ? '' : 's'}`
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

const pieOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } },
    },
  },
}

const jobsBarOptions: ChartOptions<'bar'> = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => {
          const n = Number(ctx.raw) || 0
          return ` ${n} applicant${n === 1 ? '' : 's'}`
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
      ticks: { color: '#475569', font: { size: 11 } },
      grid: { display: false },
    },
  },
}

export function DashboardPipelineFunnelChart({
  countsByStatus,
}: {
  countsByStatus: Record<string, number>
}) {
  const labels = PIPELINE_FUNNEL_ORDER.map(s => formatDashboardLabel(s))
  const data = PIPELINE_FUNNEL_ORDER.map(s => countsByStatus[s] ?? 0)
  const total = data.reduce((a, b) => a + b, 0)
  if (total === 0) {
    return <div className="dashboard-empty">No pipeline data yet. Applications will appear here.</div>
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
              backgroundColor: [
                'rgba(37, 99, 235, 0.92)',
                'rgba(37, 99, 235, 0.78)',
                'rgba(37, 99, 235, 0.64)',
                'rgba(37, 99, 235, 0.5)',
                'rgba(37, 99, 235, 0.36)',
              ],
              borderRadius: 6,
              maxBarThickness: 22,
            },
          ],
        }}
        options={funnelBarOptions}
      />
    </div>
  )
}

export function DashboardSourcePieChart({
  slices,
  emptyLabel,
}: {
  slices: { label: string; value: number; color: string }[]
  emptyLabel: string
}) {
  if (slices.length === 0) return <div className="dashboard-empty">{emptyLabel}</div>

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-pie">
      <Pie
        data={{
          labels: slices.map(s => s.label),
          datasets: [
            {
              data: slices.map(s => s.value),
              backgroundColor: slices.map(s => s.color),
              borderColor: '#ffffff',
              borderWidth: 2,
            },
          ],
        }}
        options={pieOptions}
      />
    </div>
  )
}

function truncateTitle(title: string, max = 30) {
  const t = title.trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

export function DashboardJobsDistributionChart({
  jobRows,
  emptyLabel,
}: {
  jobRows: { title: string; count: number }[]
  emptyLabel: string
}) {
  const top = jobRows.slice(0, 8)
  if (top.length === 0 || top.every(r => r.count === 0)) {
    return <div className="dashboard-empty">{emptyLabel}</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
      <Bar
        data={{
          labels: top.map(r => truncateTitle(r.title)),
          datasets: [
            {
              label: 'Applicants',
              data: top.map(r => r.count),
              backgroundColor: top.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length]),
              borderRadius: 6,
              maxBarThickness: 20,
            },
          ],
        }}
        options={jobsBarOptions}
      />
    </div>
  )
}
