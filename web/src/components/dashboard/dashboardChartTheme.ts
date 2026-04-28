import type { ChartOptions } from 'chart.js'

/** Shared Chart.js options for dashboard analytics (light theme, readable axes). */
export const dashboardBarOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      ticks: { color: '#64748b', font: { size: 11 } },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
      grid: { color: 'rgba(148,163,184,0.2)' },
    },
  },
}

export const dashboardBarHorizontalOptions: ChartOptions<'bar'> = {
  ...dashboardBarOptions,
  indexAxis: 'y' as const,
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

export const dashboardLineOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      ticks: { color: '#64748b', font: { size: 11 } },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
      grid: { color: 'rgba(148,163,184,0.2)' },
    },
  },
}

export const dashboardPieOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', padding: 14, font: { size: 11 } },
    },
  },
}
