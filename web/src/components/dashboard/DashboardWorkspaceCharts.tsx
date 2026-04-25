import { type ChartOptions } from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'
import type { Application } from '../../api/applications'
import type { Job } from '../../api/jobs'
import { DASHBOARD_CHART_COLORS, PIPELINE_FUNNEL_ORDER, makeDashboardSlices } from './dashboardUtils'

const lineOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      ticks: { color: '#6b7280', font: { size: 11 } },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
      grid: { color: 'rgba(148,163,184,0.22)' },
    },
  },
}

const barOptionsHorizontal: ChartOptions<'bar'> = {
  indexAxis: 'y',
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
      ticks: { color: '#6b7280', font: { size: 11 } },
      grid: { display: false },
    },
  },
}

const pieOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' } },
  },
}

const funnelBarOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      ticks: { color: '#6b7280', font: { size: 11 } },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
      grid: { color: 'rgba(148,163,184,0.22)' },
    },
  },
}

type MonthlyPoint = { label: string; value: number }

export function DashboardWorkspaceCharts({
  allApplications,
  jobs,
  monthlyTrend,
}: {
  allApplications: Application[]
  jobs: Job[]
  monthlyTrend: MonthlyPoint[]
}) {
  const statusCounts = allApplications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  const funnelLabels = PIPELINE_FUNNEL_ORDER.map(s => s.charAt(0).toUpperCase() + s.slice(1))
  const funnelValues = PIPELINE_FUNNEL_ORDER.map(stage => statusCounts[stage] ?? 0)
  const funnelHasData = funnelValues.some(v => v > 0)

  const applicantsByJobId = allApplications.reduce<Record<number, number>>((acc, a) => {
    acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
    return acc
  }, {})
  const jobBars = jobs
    .map(j => ({ id: j.id, title: j.title, count: applicantsByJobId[j.id] ?? 0 }))
    .filter(j => j.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
  const barColors = jobBars.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length])

  const sourceEntries = Object.entries(
    allApplications.reduce<Record<string, number>>((acc, a) => {
      const k = a.source_type || 'unknown'
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {}),
  )
  const sourceSlices = makeDashboardSlices(sourceEntries as Array<[string, number]>)

  return (
    <div className="dashboard-workspace-charts">
      <div className="dashboard-workspace-chart-cell">
        <h3 className="dashboard-workspace-chart-title">Pipeline funnel</h3>
        {!funnelHasData ? (
          <div className="dashboard-empty dashboard-empty--compact">No applications in funnel stages yet.</div>
        ) : (
          <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
            <Bar
              data={{
                labels: funnelLabels,
                datasets: [
                  {
                    label: 'Candidates',
                    data: funnelValues,
                    backgroundColor: funnelValues.map(
                      (_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length],
                    ),
                    borderRadius: 6,
                    maxBarThickness: 48,
                  },
                ],
              }}
              options={funnelBarOptions}
            />
          </div>
        )}
      </div>

      <div className="dashboard-workspace-chart-cell">
        <h3 className="dashboard-workspace-chart-title">Applications over time</h3>
        {monthlyTrend.every(p => p.value === 0) ? (
          <div className="dashboard-empty dashboard-empty--compact">No recent application activity.</div>
        ) : (
          <div className="dashboard-chart-shell dashboard-chart-shell-short">
            <Line
              data={{
                labels: monthlyTrend.map(p => p.label),
                datasets: [
                  {
                    data: monthlyTrend.map(p => p.value),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.18)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 5,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#3b82f6',
                    pointBorderWidth: 2,
                    fill: true,
                    tension: 0.32,
                  },
                ],
              }}
              options={lineOptions}
            />
          </div>
        )}
      </div>

      <div className="dashboard-workspace-chart-cell">
        <h3 className="dashboard-workspace-chart-title">Candidates by job</h3>
        {jobBars.length === 0 ? (
          <div className="dashboard-empty dashboard-empty--compact">No applicants mapped to jobs yet.</div>
        ) : (
          <div className="dashboard-chart-shell dashboard-chart-shell-horizontal">
            <Bar
              data={{
                labels: jobBars.map(j => (j.title.length > 28 ? `${j.title.slice(0, 26)}…` : j.title)),
                datasets: [
                  {
                    data: jobBars.map(j => j.count),
                    backgroundColor: barColors,
                    borderRadius: 6,
                    maxBarThickness: 22,
                  },
                ],
              }}
              options={barOptionsHorizontal}
            />
          </div>
        )}
      </div>

      <div className="dashboard-workspace-chart-cell">
        <h3 className="dashboard-workspace-chart-title">Source of candidates</h3>
        {sourceSlices.length === 0 ? (
          <div className="dashboard-empty dashboard-empty--compact">No source data yet.</div>
        ) : (
          <div className="dashboard-chart-shell dashboard-chart-shell-pie">
            <Pie
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
          </div>
        )}
      </div>
    </div>
  )
}
