import type { ChartOptions } from 'chart.js'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import type { DashboardSlice } from './dashboardFormat'

const doughnutBase: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' } },
  },
}

export function DashboardDoughnutChart({
  slices,
  emptyLabel,
  legendLabel,
}: {
  slices: DashboardSlice[]
  emptyLabel: string
  legendLabel: string
}) {
  if (slices.length === 0) return <div className="dashboard-empty">{emptyLabel}</div>

  const chartData = {
    labels: slices.map(slice => slice.label),
    datasets: [
      {
        label: legendLabel,
        data: slices.map(slice => slice.value),
        backgroundColor: slices.map(slice => slice.color),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  }

  return (
    <div className="dashboard-chart-shell">
      <Doughnut data={chartData} options={doughnutBase} />
    </div>
  )
}

const funnelOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => `${ctx.parsed.x?.toLocaleString?.() ?? ctx.parsed.x} candidates`,
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
      grid: { color: 'rgba(148,163,184,0.22)' },
    },
    y: {
      ticks: { color: '#374151', font: { size: 12, weight: 500 } },
      grid: { display: false },
    },
  },
}

export function PipelineFunnelChart({ labels, values, colors }: { labels: string[]; values: number[]; colors: string[] }) {
  const total = values.reduce((a, b) => a + b, 0)
  if (total === 0) return <div className="dashboard-empty">No candidates in the pipeline yet.</div>

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar
        data={{
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: colors,
              borderRadius: 8,
              maxBarThickness: 28,
            },
          ],
        }}
        options={funnelOptions}
      />
    </div>
  )
}

const barOptionsJobs: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      ticks: { color: '#6b7280', font: { size: 10 }, maxRotation: 45, minRotation: 0 },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
      grid: { color: 'rgba(148,163,184,0.22)' },
    },
  },
}

export function JobDistributionBarChart({
  labels,
  values,
  color,
}: {
  labels: string[]
  values: number[]
  color: string
}) {
  if (values.length === 0 || values.every(v => v === 0)) {
    return <div className="dashboard-empty">No applicants across jobs yet.</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar
        data={{
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: color,
              borderRadius: 6,
              maxBarThickness: 32,
            },
          ],
        }}
        options={barOptionsJobs}
      />
    </div>
  )
}

const pieOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' } },
  },
}

export function SourcesPieChart({ slices, emptyLabel }: { slices: DashboardSlice[]; emptyLabel: string }) {
  if (slices.length === 0) return <div className="dashboard-empty">{emptyLabel}</div>

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
        options={pieOptions}
      />
    </div>
  )
}

const lineOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      ticks: { color: '#6b7280', font: { size: 11 } },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
      grid: { color: 'rgba(148,163,184,0.22)' },
    },
  },
}

export function ApplicationsLineChart({
  labels,
  values,
}: {
  labels: string[]
  values: number[]
}) {
  if (values.every(v => v === 0)) {
    return <div className="dashboard-empty">No recent application activity yet.</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Line
        data={{
          labels,
          datasets: [
            {
              data: values,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59,130,246,0.18)',
              borderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 5,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#3b82f6',
              pointBorderWidth: 2,
              fill: true,
              tension: 0.32,
            },
          ],
        }}
        options={lineOptions}
      />
    </div>
  )
}
