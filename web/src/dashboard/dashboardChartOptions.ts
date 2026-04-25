import type { ChartOptions } from 'chart.js'

const axisMuted = '#6b7280'
const gridColor = 'rgba(148,163,184,0.22)'

export const dashboardBarOptions: ChartOptions<'bar'> = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { color: axisMuted, font: { size: 11 } },
      grid: { color: gridColor },
    },
    y: {
      ticks: { color: axisMuted, font: { size: 11 } },
      grid: { display: false },
    },
  },
}

export const dashboardBarOptionsVertical: ChartOptions<'bar'> = {
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
      grid: { color: gridColor },
    },
  },
}

export const dashboardLineOptions: ChartOptions<'line'> = {
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
      grid: { color: gridColor },
    },
  },
}
