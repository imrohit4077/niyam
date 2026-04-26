import type { ChartOptions } from 'chart.js'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import type { DashboardSlice } from './dashboardUtils'
import { dashboardBarOptions, dashboardBarOptionsVertical, dashboardLineOptions } from './dashboardChartOptions'

const doughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' } },
  },
}

const pieOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' } },
  },
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

  return (
    <div className="dashboard-chart-shell">
      <Doughnut data={chartData} options={doughnutOptions} />
    </div>
  )
}

export function DashboardPieChart({
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

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Pie data={chartData} options={pieOptions} />
    </div>
  )
}

export function PipelineFunnelChart({
  labels,
  values,
  colors,
  emptyLabel,
}: {
  labels: string[]
  values: number[]
  colors: string[]
  emptyLabel: string
}) {
  const total = values.reduce((a, b) => a + b, 0)
  if (total === 0) return <div className="dashboard-empty">{emptyLabel}</div>

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Candidates',
        data: values,
        backgroundColor: colors,
        borderRadius: 8,
        maxBarThickness: 44,
      },
    ],
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
      <Bar data={chartData} options={dashboardBarOptionsVertical} />
    </div>
  )
}

export function ApplicationsLineChart({
  labels,
  values,
}: {
  labels: string[]
  values: number[]
}) {
  const chartData = {
    labels,
    datasets: [
      {
        data: values,
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
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Line data={chartData} options={dashboardLineOptions} />
    </div>
  )
}

export function JobDistributionBarChart({
  jobTitles,
  counts,
}: {
  jobTitles: string[]
  counts: number[]
}) {
  if (counts.every(c => c === 0))
    return <div className="dashboard-empty">No applicants across jobs yet.</div>

  const chartData = {
    labels: jobTitles,
    datasets: [
      {
        label: 'Applicants',
        data: counts,
        backgroundColor: 'rgba(14, 165, 233, 0.55)',
        borderColor: '#0ea5e9',
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 22,
      },
    ],
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar data={chartData} options={dashboardBarOptions} />
    </div>
  )
}
