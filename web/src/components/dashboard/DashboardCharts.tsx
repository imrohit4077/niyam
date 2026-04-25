import type { ChartOptions } from 'chart.js'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import type { DashboardSlice } from './dashboardUtils'

const axisMuted = '#6b7280'
const gridColor = 'rgba(148,163,184,0.22)'

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

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' } },
    },
  }

  return (
    <div className="dashboard-chart-shell">
      <Doughnut data={chartData} options={options} />
    </div>
  )
}

const funnelStageOrder = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
const funnelLabels = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'] as const
const funnelColors = ['#38bdf8', '#3b82f6', '#6366f1', '#10b981', '#059669']

export function WorkspacePipelineFunnelChart({
  countsByStatus,
  emptyLabel,
}: {
  countsByStatus: Record<string, number>
  emptyLabel: string
}) {
  const data = funnelStageOrder.map(key => countsByStatus[key] ?? 0)
  if (data.every(v => v === 0)) {
    return <div className="dashboard-empty">{emptyLabel}</div>
  }

  const chartData = {
    labels: [...funnelLabels],
    datasets: [
      {
        label: 'Candidates',
        data,
        backgroundColor: funnelColors,
        borderRadius: 8,
        maxBarThickness: 28,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: axisMuted, font: { size: 11 }, precision: 0 },
        grid: { color: gridColor },
      },
      y: {
        ticks: { color: axisMuted, font: { size: 11 } },
        grid: { display: false },
      },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar data={chartData} options={options} />
    </div>
  )
}

export function JobApplicantDistributionChart({
  jobRows,
  emptyLabel,
}: {
  jobRows: Array<{ title: string; count: number }>
  emptyLabel: string
}) {
  const top = [...jobRows].sort((a, b) => b.count - a.count).slice(0, 10)
  if (top.length === 0 || top.every(r => r.count === 0)) {
    return <div className="dashboard-empty">{emptyLabel}</div>
  }

  const palette = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#10b981', '#14b8a6', '#f59e0b', '#f97316', '#64748b']

  const chartData = {
    labels: top.map(r => (r.title.length > 42 ? `${r.title.slice(0, 40)}…` : r.title)),
    datasets: [
      {
        label: 'Applicants',
        data: top.map(r => r.count),
        backgroundColor: top.map((_, i) => palette[i % palette.length]),
        borderRadius: 6,
        maxBarThickness: 22,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: axisMuted, font: { size: 11 }, precision: 0 },
        grid: { color: gridColor },
      },
      y: {
        ticks: { color: axisMuted, font: { size: 10 } },
        grid: { display: false },
      },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-medium">
      <Bar data={chartData} options={options} />
    </div>
  )
}

export function SourcePieChart({ slices, emptyLabel }: { slices: DashboardSlice[]; emptyLabel: string }) {
  if (slices.length === 0) return <div className="dashboard-empty">{emptyLabel}</div>

  const chartData = {
    labels: slices.map(s => s.label),
    datasets: [
      {
        data: slices.map(s => s.value),
        backgroundColor: slices.map(s => s.color),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  }

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Pie data={chartData} options={options} />
    </div>
  )
}

export function ApplicationsLineChart({
  monthlyTrend,
  emptyLabel,
}: {
  monthlyTrend: Array<{ label: string; value: number }>
  emptyLabel: string
}) {
  if (monthlyTrend.every(item => item.value === 0)) {
    return <div className="dashboard-empty">{emptyLabel}</div>
  }

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
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

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Line
        data={{
          labels: monthlyTrend.map(item => item.label),
          datasets: [
            {
              data: monthlyTrend.map(item => item.value),
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

export function SourceBarChart({
  slices,
  barOptions,
}: {
  slices: DashboardSlice[]
  barOptions: ChartOptions<'bar'>
}) {
  if (slices.length === 0) return null
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
