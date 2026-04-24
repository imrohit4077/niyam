import type { ChartOptions } from 'chart.js'

export const DASHBOARD_CHART_COLORS = [
  '#0ea5e9',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6b7280',
  '#8b5cf6',
]

export const DASHBOARD_PRIMARY = '#0ea5e9'
export const DASHBOARD_PRIMARY_LINE = '#0284c7'

export const dashboardAxisTicks: { color: string; font: { size: number } } = {
  color: '#64748b',
  font: { size: 11 },
}

export const dashboardGridColor = 'rgba(148, 163, 184, 0.22)'

export const barChartOptionsBase: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      ticks: dashboardAxisTicks,
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { ...dashboardAxisTicks, precision: 0 },
      grid: { color: dashboardGridColor },
    },
  },
}

export const horizontalBarChartOptions: ChartOptions<'bar'> = {
  ...barChartOptionsBase,
  indexAxis: 'y',
  scales: {
    x: {
      beginAtZero: true,
      ticks: { ...dashboardAxisTicks, precision: 0 },
      grid: { color: dashboardGridColor },
    },
    y: {
      ticks: dashboardAxisTicks,
      grid: { display: false },
    },
  },
}

export const lineChartOptionsBase: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      ticks: dashboardAxisTicks,
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { ...dashboardAxisTicks, precision: 0 },
      grid: { color: dashboardGridColor },
    },
  },
}
