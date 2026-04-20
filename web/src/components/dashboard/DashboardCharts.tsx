import type { ChartOptions } from 'chart.js'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import type { DashboardSlice } from './dashboardHelpers'

const doughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' } },
  },
}

const pieOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
  },
}

const barOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
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

const horizontalBarOptions: ChartOptions<'bar'> = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
      grid: { color: 'rgba(148,163,184,0.22)' },
    },
    y: {
      ticks: { color: '#475569', font: { size: 11 } }, grid: { display: false },
    },
  },
}

const lineOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
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
      <Doughnut data={chartData} options={doughnutOptions} />
    </div>
  )
}

export function DashboardPieChart({ slices, emptyLabel }: { slices: DashboardSlice[]; emptyLabel: string }) {
  if (slices.length === 0) return <div className="dashboard-empty">{emptyLabel}</div>

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell--compact">
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

export function DashboardSourceBarChart({ slices }: { slices: DashboardSlice[] }) {
  if (slices.length === 0) return <div className="dashboard-empty">No source data yet.</div>

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar
        data={{
          labels: slices.map(slice => slice.label),
          datasets: [
            {
              data: slices.map(slice => slice.value),
              backgroundColor: slices.map(slice => slice.color),
              borderRadius: 8,
              maxBarThickness: 36,
            },
          ],
        }}
        options={barOptions}
      />
    </div>
  )
}

export function DashboardLineChart({
  labels,
  values,
}: {
  labels: string[]
  values: number[]
}) {
  const hasData = values.some(v => v > 0)
  if (!hasData) return <div className="dashboard-empty">No recent application activity yet.</div>

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

export function DashboardFunnelChart({
  labels,
  values,
}: {
  labels: string[]
  values: number[]
}) {
  const anchor = values[0] ?? 0
  const xMax = Math.max(anchor, ...values, 1)
  const colors = values.map((_, i) => {
    const t = i / Math.max(values.length - 1, 1)
    const alpha = 0.35 + t * 0.55
    return `rgba(14, 165, 233, ${alpha})`
  })

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: 'Candidates',
              data: values,
              backgroundColor: colors,
              borderRadius: 6,
              maxBarThickness: 28,
            },
          ],
        }}
        options={{
          ...horizontalBarOptions,
          scales: {
            ...horizontalBarOptions.scales,
            x: {
              ...horizontalBarOptions.scales?.x,
              max: xMax,
              suggestedMax: xMax,
            },
          },
        }}
      />
    </div>
  )
}

export function DashboardJobsDistributionChart({
  labels,
  values,
}: {
  labels: string[]
  values: number[]
}) {
  if (labels.length === 0) return <div className="dashboard-empty">No applicants to chart yet.</div>

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: 'Applicants',
              data: values,
              backgroundColor: 'rgba(37, 99, 235, 0.55)',
              borderRadius: 6,
              maxBarThickness: 32,
            },
          ],
        }}
        options={horizontalBarOptions}
      />
    </div>
  )
}
