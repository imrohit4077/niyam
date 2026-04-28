import type { ChartOptions } from 'chart.js'

export const dashboardChartCommon: Pick<ChartOptions<'bar' | 'line' | 'doughnut'>, 'responsive' | 'maintainAspectRatio'> = {
  responsive: true,
  maintainAspectRatio: false,
}

export const axisOptions = {
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
