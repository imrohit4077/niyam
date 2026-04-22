import type { ChartOptions } from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'
import type { DashboardSlice } from './dashboardChartTypes'

const BRAND = '#2563eb'
const BRAND_SOFT = 'rgba(37, 99, 235, 0.15)'
const AXIS = '#6b7280'
const GRID = 'rgba(148, 163, 184, 0.22)'

const barAxisOptions = {
  x: { ticks: { color: AXIS, font: { size: 11 } }, grid: { display: false } },
  y: { beginAtZero: true, ticks: { color: AXIS, precision: 0, font: { size: 11 } }, grid: { color: GRID } },
} as const

type MonthlyPoint = { label: string; value: number }

type JobBarRow = { title: string; count: number }

type Props = {
  funnelLabels: string[]
  funnelValues: number[]
  monthlyTrend: MonthlyPoint[]
  jobBarRows: JobBarRow[]
  sourceSlices: DashboardSlice[]
  loading?: boolean
}

const funnelColors = ['#0ea5e9', '#38bdf8', '#3b82f6', '#6366f1', '#22c55e']

export function DashboardChartsSection({
  funnelLabels,
  funnelValues,
  monthlyTrend,
  jobBarRows,
  sourceSlices,
  loading,
}: Props) {
  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: barAxisOptions,
  }

  const funnelOptions: ChartOptions<'bar'> = {
    ...barOptions,
    indexAxis: 'y',
    scales: {
      x: { beginAtZero: true, ticks: { color: AXIS, precision: 0, font: { size: 11 } }, grid: { color: GRID } },
      y: { ticks: { color: AXIS, font: { size: 11 } }, grid: { display: false } },
    },
  }

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: barAxisOptions,
  }

  const pieOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
    },
  }

  if (loading) {
    return (
      <div className="dashboard-charts-section">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="dashboard-chart-tile">
            <div className="dashboard-chart-tile-skeleton-title" />
            <div className="dashboard-chart-tile-skeleton-chart" />
          </div>
        ))}
      </div>
    )
  }

  const funnelEmpty = funnelValues.every(v => v === 0)
  const trendEmpty = monthlyTrend.every(p => p.value === 0)
  const jobBarEmpty = jobBarRows.length === 0
  const sourceEmpty = sourceSlices.length === 0

  return (
    <div className="dashboard-charts-section">
      <div className="dashboard-chart-tile">
        <h3 className="dashboard-chart-tile-title">Pipeline funnel</h3>
        {funnelEmpty ? (
          <div className="dashboard-empty dashboard-empty--compact">No pipeline data for this scope.</div>
        ) : (
          <div className="dashboard-chart-shell dashboard-chart-shell-tile">
            <Bar
              data={{
                labels: funnelLabels,
                datasets: [
                  {
                    label: 'Candidates',
                    data: funnelValues,
                    backgroundColor: funnelLabels.map((_, i) => funnelColors[i % funnelColors.length]),
                    borderRadius: 8,
                    maxBarThickness: 28,
                  },
                ],
              }}
              options={funnelOptions}
            />
          </div>
        )}
      </div>

      <div className="dashboard-chart-tile">
        <h3 className="dashboard-chart-tile-title">Applications over time</h3>
        {trendEmpty ? (
          <div className="dashboard-empty dashboard-empty--compact">No application activity in the last six months.</div>
        ) : (
          <div className="dashboard-chart-shell dashboard-chart-shell-tile">
            <Line
              data={{
                labels: monthlyTrend.map(p => p.label),
                datasets: [
                  {
                    data: monthlyTrend.map(p => p.value),
                    borderColor: BRAND,
                    backgroundColor: BRAND_SOFT,
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
              options={lineOptions}
            />
          </div>
        )}
      </div>

      <div className="dashboard-chart-tile">
        <h3 className="dashboard-chart-tile-title">Applicants by job</h3>
        {jobBarEmpty ? (
          <div className="dashboard-empty dashboard-empty--compact">No applicants mapped to jobs yet.</div>
        ) : (
          <div className="dashboard-chart-shell dashboard-chart-shell-tile">
            <Bar
              data={{
                labels: jobBarRows.map(r => r.title),
                datasets: [
                  {
                    data: jobBarRows.map(r => r.count),
                    backgroundColor: jobBarRows.map((_, i) => funnelColors[i % funnelColors.length]),
                    borderRadius: 8,
                    maxBarThickness: 36,
                  },
                ],
              }}
              options={barOptions}
            />
          </div>
        )}
      </div>

      <div className="dashboard-chart-tile">
        <h3 className="dashboard-chart-tile-title">Source of candidates</h3>
        {sourceEmpty ? (
          <div className="dashboard-empty dashboard-empty--compact">No source breakdown for this scope.</div>
        ) : (
          <div className="dashboard-chart-shell dashboard-chart-shell-tile">
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
