import { Chart as ChartJS, Filler, LineElement, PointElement, type ChartOptions } from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'

ChartJS.register(LineElement, PointElement, Filler)
import type { Application } from '../../api/applications'
import type { Job } from '../../api/jobs'

const FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

const CHART_MUTED = '#6b7280'
const BRAND = '#2563eb'
const BRAND_FILL = 'rgba(37, 99, 235, 0.18)'

const funnelColors = ['#0ea5e9', '#38bdf8', '#3b82f6', '#6366f1', '#10b981']

type Props = {
  allApplications: Application[]
  jobs: Job[]
  monthlyTrend: { label: string; value: number }[]
  sourceSlicesWorkspace: { label: string; value: number; color: string }[]
}

function funnelCounts(apps: Application[]) {
  const by = FUNNEL_STAGES.map(
    stage => apps.filter(a => a.status === stage).length,
  )
  return { labels: FUNNEL_STAGES.map(s => s.charAt(0).toUpperCase() + s.slice(1)), values: by }
}

function topJobsByApplicants(apps: Application[], jobs: Job[], limit = 8) {
  const counts = apps.reduce<Record<number, number>>((acc, a) => {
    acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
    return acc
  }, {})
  const rows = jobs
    .map(j => ({ job: j, count: counts[j.id] ?? 0 }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
  return rows
}

const barAxisOpts = {
  x: {
    ticks: { color: CHART_MUTED, font: { size: 11 } },
    grid: { color: 'rgba(148,163,184,0.22)' },
  },
  y: {
    ticks: { color: CHART_MUTED, precision: 0, font: { size: 11 } },
    grid: { display: false },
  },
} as const

export function DashboardPipelineFunnelChart({ allApplications }: { allApplications: Application[] }) {
  const { labels, values } = funnelCounts(allApplications)
  const max = Math.max(...values, 1)
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
        max: max + Math.ceil(max * 0.08),
        ticks: { color: CHART_MUTED, precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: CHART_MUTED, font: { size: 11 } },
        grid: { display: false },
      },
    },
  }

  if (values.every(v => v === 0)) {
    return <div className="dashboard-empty">No pipeline data yet. Applications will appear here by stage.</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: 'Candidates',
              data: values,
              backgroundColor: labels.map((_, i) => funnelColors[i % funnelColors.length]),
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

export function DashboardApplicationsLineChart({ monthlyTrend }: { monthlyTrend: { label: string; value: number }[] }) {
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: CHART_MUTED, font: { size: 11 } },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: CHART_MUTED, precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
    },
  }

  if (monthlyTrend.every(item => item.value === 0)) {
    return <div className="dashboard-empty">No recent application activity yet.</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Line
        data={{
          labels: monthlyTrend.map(item => item.label),
          datasets: [
            {
              data: monthlyTrend.map(item => item.value),
              borderColor: BRAND,
              backgroundColor: BRAND_FILL,
              borderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 5,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: BRAND,
              pointBorderWidth: 2,
              fill: true,
              tension: 0.32,
            },
          ],
        }}
        options={options}
      />
    </div>
  )
}

export function DashboardJobsDistributionChart({ allApplications, jobs }: Pick<Props, 'allApplications' | 'jobs'>) {
  const top = topJobsByApplicants(allApplications, jobs, 10)
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: items => {
            const idx = items[0]?.dataIndex ?? 0
            return top[idx]?.job.title ?? ''
          },
        },
      },
    },
    scales: {
      ...barAxisOpts,
      x: { ...barAxisOpts.x, ticks: { ...barAxisOpts.x.ticks, maxRotation: 45, minRotation: 32 } },
    },
  }

  if (top.length === 0) {
    return <div className="dashboard-empty">No applicants yet. Distribution by job will show here.</div>
  }

  const shortTitle = (t: string) => (t.length > 22 ? `${t.slice(0, 20)}…` : t)

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar
        data={{
          labels: top.map(({ job }) => shortTitle(job.title)),
          datasets: [
            {
              data: top.map(({ count }) => count),
              backgroundColor: 'rgba(14, 165, 233, 0.55)',
              borderColor: '#0ea5e9',
              borderWidth: 1,
              borderRadius: 8,
              maxBarThickness: 36,
            },
          ],
        }}
        options={options}
      />
    </div>
  )
}

export function DashboardSourcePieChart({ sourceSlicesWorkspace }: { sourceSlicesWorkspace: Props['sourceSlicesWorkspace'] }) {
  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } },
      },
    },
  }

  if (sourceSlicesWorkspace.length === 0) {
    return <div className="dashboard-empty">No source attribution yet.</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Pie
        data={{
          labels: sourceSlicesWorkspace.map(s => s.label),
          datasets: [
            {
              data: sourceSlicesWorkspace.map(s => s.value),
              backgroundColor: sourceSlicesWorkspace.map(s => s.color),
              borderColor: '#ffffff',
              borderWidth: 2,
            },
          ],
        }}
        options={options}
      />
    </div>
  )
}
