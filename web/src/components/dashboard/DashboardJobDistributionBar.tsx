import { type ChartOptions } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { DASHBOARD_CHART_BRAND } from './dashboardConstants'
import { type Application } from '../../api/applications'
import { type Job } from '../../api/jobs'

const MAX_BARS = 8

type Props = {
  jobs: Job[]
  allApplications: Application[]
}

export function DashboardJobDistributionBar({ jobs, allApplications }: Props) {
  if (jobs.length === 0) {
    return <div className="dashboard-empty">Add a job to see distribution.</div>
  }

  const byJob: Record<number, number> = {}
  allApplications.forEach(app => {
    byJob[app.job_id] = (byJob[app.job_id] ?? 0) + 1
  })
  const rows = jobs
    .map(job => ({ id: job.id, title: job.title, count: byJob[job.id] ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_BARS)

  if (rows.every(r => r.count === 0)) {
    return <div className="dashboard-empty">No applications across jobs yet.</div>
  }

  const shortTitle = (t: string) => (t.length > 32 ? `${t.slice(0, 30)}…` : t)

  const labels = rows.map(r => shortTitle(r.title))
  const data = rows.map(r => r.count)

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Applicants',
        data,
        backgroundColor: DASHBOARD_CHART_BRAND,
        borderRadius: 8,
        maxBarThickness: 32,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#374151', font: { size: 10 } },
        grid: { display: false },
      },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-tall">
      <Bar data={chartData} options={options} />
    </div>
  )
}
