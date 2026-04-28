import type { ChartOptions } from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'

export type FunnelStage = { label: string; value: number; color: string }

const barBaseOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title(items) {
          return items[0]?.label ?? ''
        },
      },
    },
  },
}

export function DashboardFunnelChart({ stages, emptyLabel }: { stages: FunnelStage[]; emptyLabel: string }) {
  const hasData = stages.some(s => s.value > 0)
  if (!hasData) {
    return <div className="dashboard-empty">{emptyLabel}</div>
  }

  const options: ChartOptions<'bar'> = {
    ...barBaseOptions,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#64748b', font: { size: 11 }, precision: 0 },
        grid: { color: 'rgba(148,163,184,0.2)' },
      },
      y: {
        ticks: { color: '#475569', font: { size: 12 } },
        grid: { display: false },
      },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-compact">
      <Bar
        data={{
          labels: stages.map(s => s.label),
          datasets: [
            {
              data: stages.map(s => s.value),
              backgroundColor: stages.map(s => s.color),
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

export type SourceSlice = { label: string; value: number; color: string }

export function DashboardSourcePieChart({ slices, emptyLabel }: { slices: SourceSlice[]; emptyLabel: string }) {
  if (slices.length === 0) {
    return <div className="dashboard-empty">{emptyLabel}</div>
  }

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } },
      },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-compact">
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

export type JobBarRow = { label: string; value: number; color: string }

export function DashboardJobApplicantsBar({ rows, emptyLabel }: { rows: JobBarRow[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return <div className="dashboard-empty">{emptyLabel}</div>
  }

  const options: ChartOptions<'bar'> = {
    ...barBaseOptions,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#64748b', font: { size: 11 }, precision: 0 },
        grid: { color: 'rgba(148,163,184,0.2)' },
      },
      y: {
        ticks: { color: '#475569', font: { size: 11 }, maxRotation: 0 },
        grid: { display: false },
      },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-tall">
      <Bar
        data={{
          labels: rows.map(r => r.label),
          datasets: [
            {
              data: rows.map(r => r.value),
              backgroundColor: rows.map(r => r.color),
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
