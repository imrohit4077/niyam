import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import type { DashboardSlice } from './dashboardFormat'
import { dashboardBarOptionsBase, dashboardLineOptions } from './dashboardChartOptions'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler)

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

export function DashboardBarChart({
  labels,
  values,
  colors,
  horizontal,
  shellClassName,
}: {
  labels: string[]
  values: number[]
  colors: string[]
  horizontal?: boolean
  /** Extra classes for the chart wrapper (e.g. dashboard-chart-shell-short) */
  shellClassName?: string
}) {
  if (labels.length === 0 || values.every(v => v === 0)) {
    return <div className="dashboard-empty">No data to display.</div>
  }

  const options: ChartOptions<'bar'> = horizontal
    ? {
        ...dashboardBarOptionsBase,
        indexAxis: 'y' as const,
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
    : dashboardBarOptionsBase

  const shell =
    shellClassName ??
    (horizontal ? 'dashboard-chart-shell dashboard-chart-shell-funnel' : 'dashboard-chart-shell dashboard-chart-shell-short')

  return (
    <div className={shell}>
      <Bar
        data={{
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: colors,
              borderRadius: horizontal ? 0 : 8,
              borderSkipped: false,
              maxBarThickness: horizontal ? 28 : 36,
            },
          ],
        }}
        options={options}
      />
    </div>
  )
}

export function DashboardLineChart({
  labels,
  values,
  borderColor = '#3b82f6',
  fillColor = 'rgba(59,130,246,0.18)',
}: {
  labels: string[]
  values: number[]
  borderColor?: string
  fillColor?: string
}) {
  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Line
        data={{
          labels,
          datasets: [
            {
              data: values,
              borderColor,
              backgroundColor: fillColor,
              borderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 5,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: borderColor,
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
