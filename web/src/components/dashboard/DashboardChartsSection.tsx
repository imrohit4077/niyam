import { useMemo } from 'react'
import type { ChartOptions } from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import type { Application } from '../../api/applications'
import type { Job } from '../../api/jobs'
import { DashboardPanel } from './DashboardPanel'

const DASHBOARD_CHART_COLORS = ['#0ea5e9', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#64748b', '#ef4444']

const FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

function formatStageLabel(s: string) {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}

const lineScales: ChartOptions<'line'>['scales'] = {
  x: {
    ticks: { color: '#64748b', font: { size: 11 } },
    grid: { display: false },
  },
  y: {
    beginAtZero: true,
    ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
    grid: { color: 'rgba(148,163,184,0.2)' },
  },
}

/** Vertical bar chart (categories on x). */
const verticalBarScales: ChartOptions<'bar'>['scales'] = {
  x: {
    ticks: { color: '#64748b', font: { size: 11 } },
    grid: { display: false },
  },
  y: {
    beginAtZero: true,
    ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
    grid: { color: 'rgba(148,163,184,0.2)' },
  },
}

/** Horizontal bar chart (categories on y). */
const horizontalBarScales: ChartOptions<'bar'>['scales'] = {
  x: {
    beginAtZero: true,
    ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
    grid: { color: 'rgba(148,163,184,0.2)' },
  },
  y: {
    ticks: { color: '#64748b', font: { size: 11 } },
    grid: { display: false },
  },
}

export function DashboardChartsSection({
  allApplications,
  jobs,
}: {
  allApplications: Application[]
  jobs: Job[]
}) {
  const funnelData = useMemo(() => {
    const counts = FUNNEL_STAGES.map(stage => allApplications.filter(a => a.status === stage).length)
    return {
      labels: FUNNEL_STAGES.map(formatStageLabel),
      datasets: [
        {
          label: 'Candidates',
          data: counts,
          backgroundColor: FUNNEL_STAGES.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length]),
          borderRadius: 8,
          maxBarThickness: 48,
        },
      ],
    }
  }, [allApplications])

  const jobBarData = useMemo(() => {
    const counts = jobs.map(job => allApplications.filter(a => a.job_id === job.id).length)
    return {
      labels: jobs.map(j => (j.title.length > 22 ? `${j.title.slice(0, 20)}…` : j.title)),
      datasets: [
        {
          label: 'Applicants',
          data: counts,
          backgroundColor: 'rgba(14, 165, 233, 0.55)',
          borderRadius: 6,
          maxBarThickness: 28,
        },
      ],
    }
  }, [jobs, allApplications])

  const sourceSlices = useMemo(() => {
    const map = allApplications.reduce<Record<string, number>>((acc, a) => {
      const key = a.source_type?.trim() || 'unknown'
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label: label.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value,
        color: DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length],
      }))
  }, [allApplications])

  const monthlyTrend = useMemo(() => {
    const now = new Date()
    const keys = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('en-US', { month: 'short' })
      return { key, label }
    })
    const counters = keys.reduce<Record<string, number>>((acc, item) => {
      acc[item.key] = 0
      return acc
    }, {})
    allApplications.forEach(application => {
      const date = new Date(application.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (key in counters) counters[key] += 1
    })
    return keys.map(item => ({ label: item.label, value: counters[item.key] ?? 0 }))
  }, [allApplications])

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: horizontalBarScales,
  }

  const funnelBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: verticalBarScales,
  }

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: lineScales,
  }

  const pieOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '0%',
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
    },
  }

  const hasFunnel = funnelData.datasets[0].data.some(n => n > 0)
  const hasJobs = jobs.length > 0
  const hasLine = monthlyTrend.some(x => x.value > 0)
  const hasPie = sourceSlices.length > 0

  return (
    <div className="dashboard-charts-band">
      <DashboardPanel title="Pipeline funnel" subtitle="Workspace-wide stages">
        <div className="dashboard-chart-shell dashboard-chart-shell-compact">
          {!hasFunnel ? (
            <div className="dashboard-empty">No candidates in pipeline stages yet.</div>
          ) : (
            <Bar data={funnelData} options={funnelBarOptions} />
          )}
        </div>
      </DashboardPanel>

      <DashboardPanel title="Applications over time" subtitle="Last 6 months">
        <div className="dashboard-chart-shell dashboard-chart-shell-compact">
          {!hasLine ? (
            <div className="dashboard-empty">No recent application activity yet.</div>
          ) : (
            <Line
              data={{
                labels: monthlyTrend.map(x => x.label),
                datasets: [
                  {
                    data: monthlyTrend.map(x => x.value),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.12)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 5,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#2563eb',
                    pointBorderWidth: 2,
                    fill: true,
                    tension: 0.32,
                  },
                ],
              }}
              options={lineOptions}
            />
          )}
        </div>
      </DashboardPanel>

      <DashboardPanel title="Candidates by job" subtitle="Applicant volume">
        <div className="dashboard-chart-shell dashboard-chart-shell-tall">
          {!hasJobs ? (
            <div className="dashboard-empty">Create a job to see distribution.</div>
          ) : (
            <Bar data={jobBarData} options={barOptions} />
          )}
        </div>
      </DashboardPanel>

      <DashboardPanel title="Source of candidates" subtitle="All applications">
        <div className="dashboard-chart-shell dashboard-chart-shell-compact">
          {!hasPie ? (
            <div className="dashboard-empty">No source data yet.</div>
          ) : (
            <Doughnut
              data={{
                labels: sourceSlices.map(s => s.label),
                datasets: [
                  {
                    data: sourceSlices.map(s => s.value),
                    backgroundColor: sourceSlices.map(s => s.color),
                    borderColor: '#ffffff',
                    borderWidth: 2,
                  },
                ],
              }}
              options={pieOptions}
            />
          )}
        </div>
      </DashboardPanel>
    </div>
  )
}
