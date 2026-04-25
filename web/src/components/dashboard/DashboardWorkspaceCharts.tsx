import { type ChartOptions } from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'
import { PIPELINE_FUNNEL_LABELS } from './pipelineFunnel'

const BRAND = '#0ea5e9'
const BRAND_LINE = '#2563eb'
const MUTED = '#64748b'
const GRID = 'rgba(148,163,184,0.22)'

type LinePoint = { label: string; value: number }

export function DashboardApplicationsLineChart({ points }: { points: LinePoint[] }) {
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: MUTED, font: { size: 11 } },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: MUTED, precision: 0, font: { size: 11 } },
        grid: { color: GRID },
      },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Line
        data={{
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
        }}
        options={options}
      />
    </div>
  )
}

export function DashboardPipelineFunnelChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.parsed.x ?? 0} candidates`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: max,
        ticks: { color: MUTED, precision: 0, font: { size: 11 } },
        grid: { color: GRID },
      },
      y: {
        ticks: { color: MUTED, font: { size: 11 } },
        grid: { display: false },
      },
    },
  }

  const colors = ['#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985']

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar
        data={{
          labels: [...PIPELINE_FUNNEL_LABELS],
          datasets: [
            {
              data: values,
              backgroundColor: values.map((_, i) => colors[i] ?? BRAND),
              borderRadius: 8,
              maxBarThickness: 28,
            },
          ],
        }}
        options={options}
      />
    </div>
  )
}

type Slice = { label: string; value: number; color: string }

export function DashboardSourcePieChart({ slices, emptyLabel }: { slices: Slice[]; emptyLabel: string }) {
  if (slices.length === 0) {
    return <div className="dashboard-empty">{emptyLabel}</div>
  }

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 10 } },
      },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Pie
        data={{
          labels: slices.map(s => s.label),
          datasets: [
            {
              data: slices.map(s => s.value),
              backgroundColor: slices.map(s => s.color),
              borderColor: '#ffffff',
              borderWidth: 2,
            },
          ],
        }}
        options={options}
      />
    </div>
  )
}

type JobBarRow = { title: string; count: number; color: string }

export function DashboardJobsDistributionChart({ rows, maxBars }: { rows: JobBarRow[]; maxBars?: number }) {
  const top = rows.slice(0, maxBars ?? 8)
  if (top.length === 0) {
    return <div className="dashboard-empty">No applications yet to chart by job.</div>
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: items => {
            const i = items[0]?.dataIndex ?? 0
            return top[i]?.title ?? ''
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: MUTED, precision: 0, font: { size: 11 } },
        grid: { color: GRID },
      },
      y: {
        ticks: {
          color: MUTED,
          font: { size: 10 },
          callback: function (val) {
            const label = typeof val === 'number' ? top[val]?.title : ''
            const s = String(label ?? '')
            return s.length > 22 ? `${s.slice(0, 20)}…` : s
          },
        },
        grid: { display: false },
      },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-medium">
      <Bar
        data={{
          labels: top.map(r => r.title),
          datasets: [
            {
              data: top.map(r => r.count),
              backgroundColor: top.map(r => r.color),
              borderRadius: 6,
              maxBarThickness: 22,
            },
          ],
        }}
        options={options}
      />
    </div>
  )
}
