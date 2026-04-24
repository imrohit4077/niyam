import type { ChartOptions } from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'
import { ensureChartJsRegistered } from './chartSetup'
import { dashboardBarOptionsVertical, dashboardLineOptions } from './dashboardChartOptions'
import { DASHBOARD_CHART_COLORS, type DashboardSlice } from './dashboardHelpers'

ensureChartJsRegistered()

const funnelBarOptions: ChartOptions<'bar'> = {
  ...dashboardBarOptionsVertical,
  indexAxis: 'y',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => {
          const n = Number(ctx.raw) || 0
          return `${n} candidate${n === 1 ? '' : 's'}`
        },
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
      grid: { color: 'rgba(148,163,184,0.2)' },
    },
    y: {
      ticks: { color: '#475569', font: { size: 12 } },
      grid: { display: false },
    },
  },
}

export function DashboardFunnelBarChart({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(...values, 1)
  const backgroundColor = values.map((_, i) => {
    const alpha = 0.35 + (0.55 * (values[i] ?? 0)) / max
    return `rgba(14, 165, 233, ${Math.min(0.95, alpha)})`
  })

  if (values.every(v => v === 0)) {
    return <div className="dashboard-empty">No pipeline data for this period.</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: 'Candidates',
              data: values,
              backgroundColor,
              borderRadius: 8,
              maxBarThickness: 28,
            },
          ],
        }}
        options={funnelBarOptions}
      />
    </div>
  )
}

export function DashboardWorkspacePieChart({
  slices,
  emptyLabel,
}: {
  slices: DashboardSlice[]
  emptyLabel: string
}) {
  if (slices.length === 0) return <div className="dashboard-empty">{emptyLabel}</div>

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', padding: 12, font: { size: 11 } },
      },
    },
  }

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
        options={options}
      />
    </div>
  )
}

export function DashboardJobsDistributionBar({
  labels,
  values,
}: {
  labels: string[]
  values: number[]
}) {
  if (values.length === 0 || values.every(v => v === 0)) {
    return <div className="dashboard-empty">No applicants across jobs yet.</div>
  }

  const colors = labels.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length])

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar
        data={{
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: colors,
              borderRadius: 8,
              maxBarThickness: 36,
            },
          ],
        }}
        options={dashboardBarOptionsVertical}
      />
    </div>
  )
}

export function DashboardApplicationsLineChart({
  labels,
  values,
}: {
  labels: string[]
  values: number[]
}) {
  if (values.every(v => v === 0)) {
    return <div className="dashboard-empty">No recent application activity yet.</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Line
        data={{
          labels,
          datasets: [
            {
              data: values,
              borderColor: '#0ea5e9',
              backgroundColor: 'rgba(14, 165, 233, 0.12)',
              borderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 5,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#0ea5e9',
              pointBorderWidth: 2,
              fill: true,
              tension: 0.32,
            },
          ],
        }}
        options={dashboardLineOptions}
      />
    </div>
  )
}
