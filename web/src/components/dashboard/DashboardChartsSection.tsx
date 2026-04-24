import type { ChartOptions } from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'
import { ensureChartJsRegistered } from './registerCharts'

ensureChartJsRegistered()

const BRAND_LINE = '#2563eb'
const BRAND_FILL = 'rgba(37, 99, 235, 0.12)'
const AXIS = '#64748b'
const GRID = 'rgba(148, 163, 184, 0.22)'

const lineOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: AXIS, font: { size: 11 } }, grid: { display: false } },
    y: { beginAtZero: true, ticks: { color: AXIS, precision: 0, font: { size: 11 } }, grid: { color: GRID } },
  },
}

const barOptionsVertical: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: AXIS, font: { size: 10 }, maxRotation: 45, minRotation: 0 }, grid: { display: false } },
    y: { beginAtZero: true, ticks: { color: AXIS, precision: 0, font: { size: 11 } }, grid: { color: GRID } },
  },
}

const pieOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
  },
}

export type FunnelStage = { label: string; value: number; color: string }

export type MonthlyPoint = { label: string; value: number }

export type JobBarRow = { label: string; value: number; color: string }

export type SourceSlice = { label: string; value: number; color: string }

type Props = {
  funnelStages: FunnelStage[]
  monthlyTrend: MonthlyPoint[]
  jobDistribution: JobBarRow[]
  sourceSlices: SourceSlice[]
}

export function DashboardChartsSection({ funnelStages, monthlyTrend, jobDistribution, sourceSlices }: Props) {
  const funnelMax = Math.max(...funnelStages.map(s => s.value), 1)
  const funnelHasData = funnelStages.some(s => s.value > 0)
  const trendHasData = monthlyTrend.some(p => p.value > 0)
  const jobsHasData = jobDistribution.some(j => j.value > 0)
  const sourceHasData = sourceSlices.some(s => s.value > 0)

  const funnelOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        max: funnelMax,
        ticks: { color: AXIS, precision: 0, font: { size: 11 } },
        grid: { color: GRID },
      },
      y: { ticks: { color: AXIS, font: { size: 11 } }, grid: { display: false } },
    },
  }

  return (
    <div className="dashboard-analytics-grid">
      <section className="panel dashboard-panel dashboard-modern-panel dashboard-analytics-panel dashboard-analytics-span-12">
        <div className="panel-header dashboard-modern-panel-header">
          <span className="panel-header-title">Pipeline funnel</span>
        </div>
        <div className="panel-body dashboard-modern-panel-body">
          <div className="dashboard-panel-content">
            {!funnelHasData ? (
              <div className="dashboard-empty">No candidates in the pipeline yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                <Bar
                  data={{
                    labels: funnelStages.map(s => s.label),
                    datasets: [
                      {
                        data: funnelStages.map(s => s.value),
                        backgroundColor: funnelStages.map(s => s.color),
                        borderRadius: 8,
                        barThickness: 28,
                      },
                    ],
                  }}
                  options={funnelOptions}
                />
              </div>
            )}
            <p className="dashboard-chart-caption">Workspace totals by stage: Applied → Hired</p>
          </div>
        </div>
      </section>

      <section className="panel dashboard-panel dashboard-modern-panel dashboard-analytics-panel dashboard-analytics-span-6">
        <div className="panel-header dashboard-modern-panel-header">
          <span className="panel-header-title">Applications over time</span>
        </div>
        <div className="panel-body dashboard-modern-panel-body">
          <div className="dashboard-panel-content">
            {!trendHasData ? (
              <div className="dashboard-empty">No application activity in the last six months.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Line
                  data={{
                    labels: monthlyTrend.map(p => p.label),
                    datasets: [
                      {
                        data: monthlyTrend.map(p => p.value),
                        borderColor: BRAND_LINE,
                        backgroundColor: BRAND_FILL,
                        borderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: BRAND_LINE,
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
        </div>
      </section>

      <section className="panel dashboard-panel dashboard-modern-panel dashboard-analytics-panel dashboard-analytics-span-6">
        <div className="panel-header dashboard-modern-panel-header">
          <span className="panel-header-title">Source of candidates</span>
        </div>
        <div className="panel-body dashboard-modern-panel-body">
          <div className="dashboard-panel-content">
            {!sourceHasData ? (
              <div className="dashboard-empty">No source data yet.</div>
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
      </section>

      <section className="panel dashboard-panel dashboard-modern-panel dashboard-analytics-panel dashboard-analytics-span-12">
        <div className="panel-header dashboard-modern-panel-header">
          <span className="panel-header-title">Candidates by job</span>
        </div>
        <div className="panel-body dashboard-modern-panel-body">
          <div className="dashboard-panel-content">
            {!jobsHasData ? (
              <div className="dashboard-empty">No applicants assigned to jobs yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-bar-jobs">
                <Bar
                  data={{
                    labels: jobDistribution.map(j => j.label),
                    datasets: [
                      {
                        data: jobDistribution.map(j => j.value),
                        backgroundColor: jobDistribution.map(j => j.color),
                        borderRadius: 6,
                        maxBarThickness: 36,
                      },
                    ],
                  }}
                  options={barOptionsVertical}
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
