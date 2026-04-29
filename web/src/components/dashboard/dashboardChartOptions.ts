import type { ChartOptions } from 'chart.js'

const axisMuted = '#6b7280'
const gridMuted = 'rgba(148,163,184,0.22)'

export const dashboardBarChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      ticks: { color: axisMuted, font: { size: 11 }, maxRotation: 45, minRotation: 0 },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: axisMuted, precision: 0, font: { size: 11 } },
      grid: { color: gridMuted },
    },
  },
}

export const dashboardLineChartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      ticks: { color: axisMuted, font: { size: 11 } },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: axisMuted, precision: 0, font: { size: 11 } },
      grid: { color: gridMuted },
    },
  },
}
