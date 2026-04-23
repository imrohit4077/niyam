import type { ChartOptions } from 'chart.js'

const barAxisOptions = {
  x: {
    ticks: { color: '#64748b', font: { size: 11 } },
    grid: { display: false },
  },
  y: {
    beginAtZero: true,
    ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
    grid: { color: 'rgba(148,163,184,0.2)' },
  },
} as const

export const dashboardBarOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: barAxisOptions,
}

export const dashboardLineOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: barAxisOptions,
}

export const dashboardHorizontalBarOptions: ChartOptions<'bar'> = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
      grid: { color: 'rgba(148,163,184,0.2)' },
    },
    y: {
      ticks: { color: '#64748b', font: { size: 11 } },
      grid: { display: false },
    },
  },
}

export const dashboardPieOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } },
    },
  },
}
