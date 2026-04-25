import type { ChartOptions } from 'chart.js'
import { Bar, Doughnut, Pie } from 'react-chartjs-2'
import type { DashboardSlice } from './dashboardChartHelpers'

export type { DashboardSlice } from './dashboardChartHelpers'

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

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' } },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-medium">
      <Pie data={chartData} options={options} />
    </div>
  )
}

const verticalBarScales: ChartOptions<'bar'>['scales'] = {
  x: {
    ticks: { color: '#64748b', font: { size: 11 } },
    grid: { display: false },
  },
  y: {
    beginAtZero: true,
    ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
    grid: { color: 'rgba(148,163,184,0.22)' },
  },
}

const horizontalBarScales: ChartOptions<'bar'>['scales'] = {
  x: {
    beginAtZero: true,
    ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
    grid: { color: 'rgba(148,163,184,0.22)' },
  },
  y: {
    ticks: { color: '#64748b', font: { size: 11 } },
    grid: { display: false },
  },
}

export function DashboardBarChart({
  labels,
  data,
  colors,
  horizontal = false,
  short = false,
}: {
  labels: string[]
  data: number[]
  colors: string[]
  horizontal?: boolean
  short?: boolean
}) {
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: {
      legend: { display: false },
    },
    scales: horizontal ? horizontalBarScales : verticalBarScales,
  }

  return (
    <div className={`dashboard-chart-shell ${short ? 'dashboard-chart-shell-short' : ''}`}>
      <Bar
        data={{
          labels,
          datasets: [
            {
              data,
              backgroundColor: colors,
              borderRadius: 8,
              maxBarThickness: horizontal ? 28 : 36,
            },
          ],
        }}
        options={options}
      />
    </div>
  )
}
