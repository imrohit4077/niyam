import type { ChartOptions } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { PIPELINE_FUNNEL_STATUSES } from './dashboardMetrics'

const FUNNEL_LABELS: Record<(typeof PIPELINE_FUNNEL_STATUSES)[number], string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
}

const PRIMARY = '#2563eb'
const PRIMARY_SOFT = 'rgba(37, 99, 235, 0.12)'

type FunnelProps = {
  counts: Record<string, number>
}

export function WorkspaceFunnelBar({ counts }: FunnelProps) {
  const labels = PIPELINE_FUNNEL_STATUSES.map(s => FUNNEL_LABELS[s])
  const data = PIPELINE_FUNNEL_STATUSES.map(s => counts[s] ?? 0)
  const total = data.reduce((a, b) => a + b, 0)
  if (total === 0) {
    return <div className="dashboard-empty">No applications yet — funnel appears once candidates apply.</div>
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.parsed.x} candidates`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#475569', font: { size: 12 } },
        grid: { display: false },
      },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
      <Bar
        data={{
          labels,
          datasets: [
            {
              data,
              backgroundColor: data.map((_, i) => `rgba(37, 99, 235, ${0.35 + i * 0.12})`),
              borderColor: PRIMARY,
              borderWidth: 1,
              borderRadius: 6,
              maxBarThickness: 28,
            },
          ],
        }}
        options={options}
      />
    </div>
  )
}

type JobsBarProps = {
  labels: string[]
  values: number[]
}

export function JobApplicantsBarChart({ labels, values }: JobsBarProps) {
  if (labels.length === 0 || values.every(v => v === 0)) {
    return <div className="dashboard-empty">No applicant distribution to show yet.</div>
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.parsed.x} applicants`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#475569', font: { size: 11 } },
        grid: { display: false },
      },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: 'Applicants',
              data: values,
              backgroundColor: PRIMARY_SOFT,
              borderColor: PRIMARY,
              borderWidth: 1.5,
              borderRadius: 6,
              maxBarThickness: 26,
            },
          ],
        }}
        options={options}
      />
    </div>
  )
}
