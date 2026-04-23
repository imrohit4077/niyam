import type { ChartOptions } from 'chart.js'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import type { DashboardSlice } from './dashboardUtils'
import {
  dashboardHorizontalBarOptions,
  dashboardLineOptions,
  dashboardPieOptions,
} from './dashboardChartOptions'

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

export function WorkspaceSourcePie({ slices, emptyLabel }: { slices: DashboardSlice[]; emptyLabel: string }) {
  if (slices.length === 0) return <div className="dashboard-empty">{emptyLabel}</div>
  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
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
        options={dashboardPieOptions}
      />
    </div>
  )
}

export function WorkspaceFunnelBar({
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
  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: 'Candidates',
              data: values,
              backgroundColor: colors,
              borderRadius: 8,
              maxBarThickness: 28,
            },
          ],
        }}
        options={dashboardHorizontalBarOptions}
      />
    </div>
  )
}

export function WorkspaceLineChart({
  labels,
  values,
}: {
  labels: string[]
  values: number[]
}) {
  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Line
        data={{
          labels,
          datasets: [
            {
              data: values,
              borderColor: '#0ea5e9',
              backgroundColor: 'rgba(14,165,233,0.12)',
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

export function WorkspaceJobBarChart({
  jobTitles,
  counts,
}: {
  jobTitles: string[]
  counts: number[]
}) {
  if (counts.every(c => c === 0)) {
    return <div className="dashboard-empty">No applicants yet to compare across jobs.</div>
  }
  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar
        data={{
          labels: jobTitles,
          datasets: [
            {
              label: 'Applicants',
              data: counts,
              backgroundColor: '#3b82f6',
              borderRadius: 8,
              maxBarThickness: 22,
            },
          ],
        }}
        options={dashboardHorizontalBarOptions}
      />
    </div>
  )
}
