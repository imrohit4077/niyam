import type { ReactNode } from 'react'
import type { ChartOptions } from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import type { DashboardSlice } from './dashboardTypes'

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

const barAxisOptions = {
  x: {
    ticks: { color: '#6b7280', font: { size: 11 } },
    grid: { display: false },
  },
  y: {
    beginAtZero: true,
    ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
    grid: { color: 'rgba(148,163,184,0.22)' },
  },
} satisfies ChartOptions<'bar'>['scales']

const sharedBarPlugins: ChartOptions<'bar'>['plugins'] = {
  legend: { display: false },
}

export function DashboardWorkspaceCharts({
  funnelStages,
  monthlyTrend,
  jobDistributionSlices,
  sourceSlices,
}: {
  funnelStages: ReturnType<typeof buildFunnelStages>
  monthlyTrend: { label: string; value: number }[]
  jobDistributionSlices: DashboardSlice[]
  sourceSlices: DashboardSlice[]
}) {
  const funnelHasData = funnelStages.some(s => s.value > 0)
  const lineHasData = monthlyTrend.some(item => item.value > 0)
  const jobBarHasData = jobDistributionSlices.length > 0
  const sourceHasData = sourceSlices.length > 0

  const funnelOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: sharedBarPlugins,
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

  const jobBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: sharedBarPlugins,
    scales: barAxisOptions,
  }

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: barAxisOptions as ChartOptions<'line'>['scales'],
  }

  const pieOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '52%',
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
    },
  }

  return (
    <div className="dashboard-workspace-charts">
      <div className="dashboard-workspace-chart-cell">
        <h3 className="dashboard-workspace-chart-title">Pipeline funnel</h3>
        {!funnelHasData ? (
          <div className="dashboard-empty dashboard-empty--compact">No applications yet.</div>
        ) : (
          <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
            <Bar
              data={{
                labels: funnelStages.map(s => s.label),
                datasets: [
                  {
                    data: funnelStages.map(s => s.value),
                    backgroundColor: funnelStages.map(s => s.color),
                    borderRadius: 6,
                    maxBarThickness: 22,
                  },
                ],
              }}
              options={funnelOptions}
            />
          </div>
        )}
      </div>

      <div className="dashboard-workspace-chart-cell">
        <h3 className="dashboard-workspace-chart-title">Applications over time</h3>
        {!lineHasData ? (
          <div className="dashboard-empty dashboard-empty--compact">No recent application activity.</div>
        ) : (
          <div className="dashboard-chart-shell dashboard-chart-shell-short">
            <Line
              data={{
                labels: monthlyTrend.map(item => item.label),
                datasets: [
                  {
                    data: monthlyTrend.map(item => item.value),
                    borderColor: '#0ea5e9',
                    backgroundColor: 'rgba(14, 165, 233, 0.12)',
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#0ea5e9',
                    pointBorderWidth: 2,
                    fill: true,
                    tension: 0.35,
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
        {!jobBarHasData ? (
          <div className="dashboard-empty dashboard-empty--compact">No applicants assigned to jobs.</div>
        ) : (
          <div className="dashboard-chart-shell dashboard-chart-shell-short">
            <Bar
              data={{
                labels: jobDistributionSlices.map(s => s.label),
                datasets: [
                  {
                    data: jobDistributionSlices.map(s => s.value),
                    backgroundColor: jobDistributionSlices.map(s => s.color),
                    borderRadius: 8,
                    maxBarThickness: 32,
                  },
                ],
              }}
              options={jobBarOptions}
            />
          </div>
        )}
      </div>

      <div className="dashboard-workspace-chart-cell">
        <h3 className="dashboard-workspace-chart-title">Source of candidates</h3>
        {!sourceHasData ? (
          <div className="dashboard-empty dashboard-empty--compact">No source data recorded.</div>
        ) : (
          <div className="dashboard-chart-shell dashboard-chart-shell-pie">
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
          </div>
        )}
      </div>
    </div>
  )
}

export function DashboardPanel({
  title,
  children,
  action,
  wide,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
  /** When true, spans full width in the 12-column dashboard grid. */
  wide?: boolean
}) {
  return (
    <section className={`panel dashboard-panel dashboard-modern-panel${wide ? ' dashboard-panel--wide' : ''}`}>
      <div className="panel-header dashboard-modern-panel-header dashboard-modern-panel-header--flex">
        <span className="panel-header-title">{title}</span>
        {action ? <div className="dashboard-panel-header-action">{action}</div> : null}
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
