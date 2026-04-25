import './registerDashboardCharts'
import type { ChartOptions } from 'chart.js'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import type { DashboardSlice } from './dashboardUtils'
import { dashboardBarOptionsVertical, dashboardLineOptions } from './dashboardChartOptions'

const axisMuted = '#6b7280'
const gridColor = 'rgba(148,163,184,0.22)'

const BRAND_LINE = '#2563eb'
const BRAND_FILL = 'rgba(37,99,235,0.14)'

export function DashboardFunnelChart({
  labels,
  values,
  colors,
}: {
  labels: string[]
  values: number[]
  colors: string[]
}) {
  const max = Math.max(...values, 1)
  const pctData = values.map(v => (max > 0 ? (v / max) * 100 : 0))
  const data = {
    labels,
    datasets: [
      {
        label: 'Pipeline',
        data: pctData,
        backgroundColor: colors,
        borderRadius: 6,
        maxBarThickness: 22,
      },
    ],
  }
  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label(ctx) {
            const idx = ctx.dataIndex
            const count = values[idx] ?? 0
            return `${count} candidates`
          },
        },
      },
    },
    scales: {
      x: {
        max: 100,
        beginAtZero: true,
        ticks: {
          color: axisMuted,
          font: { size: 11 },
          callback: v => `${v}%`,
        },
        grid: { color: gridColor },
      },
      y: {
        ticks: { color: axisMuted, font: { size: 11 } },
        grid: { display: false },
      },
    },
  }
  return <Bar data={data} options={options} />
}

export function DashboardApplicationsLineChart({
  labels,
  values,
}: {
  labels: string[]
  values: number[]
}) {
  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            data: values,
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
      options={dashboardLineOptions}
    />
  )
}

export function DashboardJobsDistributionChart({
  labels,
  values,
  color,
}: {
  labels: string[]
  values: number[]
  color: string
}) {
  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: labels.map(() => color),
            borderRadius: 8,
            maxBarThickness: 36,
          },
        ],
      }}
      options={dashboardBarOptionsVertical}
    />
  )
}

const pieOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } },
    },
  },
}

export function DashboardSourcePieChart({
  labels,
  values,
  colors,
}: {
  labels: string[]
  values: number[]
  colors: string[]
}) {
  if (labels.length === 0) return null
  return (
    <Pie
      data={{
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        ],
      }}
      options={pieOptions}
    />
  )
}

const doughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
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
