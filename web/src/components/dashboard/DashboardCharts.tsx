import { useMemo } from 'react'
import type { ChartOptions } from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { ensureChartJsRegistered } from '../../lib/chartRegister'

ensureChartJsRegistered()

const BRAND_LINE = '#2563eb'
const MUTED = '#94a3b8'

const CHART_COLORS = ['#0ea5e9', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6']

type Slice = { label: string; value: number; color?: string }

const barOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: MUTED, font: { size: 11 } }, grid: { display: false } },
    y: {
      beginAtZero: true,
      ticks: { color: MUTED, precision: 0, font: { size: 11 } },
      grid: { color: 'rgba(148,163,184,0.22)' },
    },
  },
}

const lineOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: MUTED, font: { size: 11 } }, grid: { display: false } },
    y: {
      beginAtZero: true,
      ticks: { color: MUTED, precision: 0, font: { size: 11 } },
      grid: { color: 'rgba(148,163,184,0.22)' },
    },
  },
}

const doughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' } },
  },
}

export function PipelineFunnelChart({ labels, values }: { labels: string[]; values: number[] }) {
  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'Candidates',
          data: values,
          backgroundColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]!),
          borderRadius: 8,
          maxBarThickness: 48,
        },
      ],
    }),
    [labels, values],
  )

  if (values.every(v => v === 0)) {
    return <div className="dashboard-empty">No pipeline data yet.</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-medium">
      <Bar data={data} options={barOptions} />
    </div>
  )
}

export function ApplicationsLineChart({ points }: { points: { label: string; value: number }[] }) {
  const data = useMemo(
    () => ({
      labels: points.map(p => p.label),
      datasets: [
        {
          data: points.map(p => p.value),
          borderColor: BRAND_LINE,
          backgroundColor: 'rgba(14,165,233,0.12)',
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
    }),
    [points],
  )

  if (points.every(p => p.value === 0)) {
    return <div className="dashboard-empty">No recent application activity yet.</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-medium">
      <Line data={data} options={lineOptions} />
    </div>
  )
}

export function JobDistributionBarChart({ labels, values }: { labels: string[]; values: number[] }) {
  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]!),
          borderRadius: 6,
          maxBarThickness: 28,
        },
      ],
    }),
    [labels, values],
  )

  if (values.every(v => v === 0)) {
    return <div className="dashboard-empty">No applicants mapped to jobs yet.</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-tall">
      <Bar
        data={data}
        options={{
          ...barOptions,
          indexAxis: 'y' as const,
          scales: {
            x: {
              beginAtZero: true,
              ticks: { color: MUTED, precision: 0, font: { size: 11 } },
              grid: { color: 'rgba(148,163,184,0.22)' },
            },
            y: {
              ticks: { color: MUTED, font: { size: 10 } },
              grid: { display: false },
            },
          },
        }}
      />
    </div>
  )
}

export function SourcePieChart({ slices }: { slices: Slice[] }) {
  const data = useMemo(
    () => ({
      labels: slices.map(s => s.label),
      datasets: [
        {
          data: slices.map(s => s.value),
          backgroundColor: slices.map((s, i) => s.color ?? CHART_COLORS[i % CHART_COLORS.length]!),
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    }),
    [slices],
  )

  if (slices.length === 0) {
    return <div className="dashboard-empty">No source data for this scope.</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-medium">
      <Doughnut data={data} options={doughnutOptions} />
    </div>
  )
}
