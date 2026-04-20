import type { ChartOptions } from 'chart.js'

const axisMuted = '#6b7280'
const gridColor = 'rgba(148,163,184,0.22)'

export const funnelBarOptions: ChartOptions<'bar'> = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => {
          const v = ctx.parsed.x
          return typeof v === 'number' ? `${v} candidates` : String(ctx.raw)
        },
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { color: axisMuted, precision: 0, font: { size: 11 } },
      grid: { color: gridColor },
    },
    y: {
      ticks: { color: axisMuted, font: { size: 11 } },
      grid: { display: false },
    },
  },
}

export const verticalBarOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      ticks: { color: axisMuted, font: { size: 10 }, maxRotation: 45, minRotation: 0 },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: axisMuted, precision: 0, font: { size: 11 } },
      grid: { color: gridColor },
    },
  },
}

export const lineChartOptions: ChartOptions<'line'> = {
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

export const pieOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } },
    },
  },
}

export const doughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' } },
  },
}
