import type { ChartOptions } from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'
import type { DashboardSlice } from './types'

const BRAND_LINE = '#2563eb'
const BRAND_FILL = 'rgba(37, 99, 235, 0.12)'

const defaultLineOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      ticks: { color: '#64748b', font: { size: 11 } },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
      grid: { color: 'rgba(148, 163, 184, 0.2)' },
    },
  },
}

const defaultBarOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: { legend: { display: false } },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
      grid: { color: 'rgba(148, 163, 184, 0.2)' },
    },
    y: {
      ticks: { color: '#64748b', font: { size: 11 } },
      grid: { display: false },
    },
  },
}

const defaultPieOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } },
    },
  },
}

type FunnelProps = {
  labels: string[]
  values: number[]
  colors: string[]
}

export function PipelineFunnelChart({ labels, values, colors }: FunnelProps) {
  const data = {
    labels,
    datasets: [
      {
        label: 'Candidates',
        data: values,
        backgroundColor: colors,
        borderRadius: 6,
        barThickness: 22,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    ...defaultBarOptions,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label(ctx) {
            const n = Number(ctx.raw) || 0
            return `${n} candidate${n === 1 ? '' : 's'}`
          },
        },
      },
    },
  }

  if (values.every(v => v === 0)) {
    return <div className="dashboard-empty">No pipeline data yet.</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
      <Bar data={data} options={options} />
    </div>
  )
}

type MonthlyPoint = { label: string; value: number }

export function ApplicationsLineChart({ series }: { series: MonthlyPoint[] }) {
  if (series.every(p => p.value === 0)) {
    return <div className="dashboard-empty">No recent application activity yet.</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Line
        data={{
          labels: series.map(p => p.label),
          datasets: [
            {
              data: series.map(p => p.value),
              borderColor: BRAND_LINE,
              backgroundColor: BRAND_FILL,
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
        options={defaultLineOptions}
      />
    </div>
  )
}

type JobBarRow = { title: string; count: number; color: string }

export function JobApplicantsBarChart({ rows }: { rows: JobBarRow[] }) {
  if (rows.length === 0 || rows.every(r => r.count === 0)) {
    return <div className="dashboard-empty">No applicants distributed across jobs yet.</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar
        data={{
          labels: rows.map(r => r.title),
          datasets: [
            {
              data: rows.map(r => r.count),
              backgroundColor: rows.map(r => r.color),
              borderRadius: 6,
              maxBarThickness: 28,
            },
          ],
        }}
        options={defaultBarOptions}
      />
    </div>
  )
}

export function SourcePieChart({ slices }: { slices: DashboardSlice[] }) {
  if (slices.length === 0) {
    return <div className="dashboard-empty">No source data yet.</div>
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
        options={defaultPieOptions}
      />
    </div>
  )
}
