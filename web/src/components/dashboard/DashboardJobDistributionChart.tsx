import type { ChartOptions } from 'chart.js'
import { Bar } from 'react-chartjs-2'

const BAR_COLOR = '#0ea5e9'

export type JobBarRow = { label: string; count: number }

export default function DashboardJobDistributionChart({ rows, maxJobs }: { rows: JobBarRow[]; maxJobs?: number }) {
  const slice = rows.slice(0, maxJobs ?? 8)
  if (slice.length === 0) {
    return <div className="dashboard-empty">No applications to show distribution.</div>
  }

  const chartData = {
    labels: slice.map(r => r.label),
    datasets: [
      {
        label: 'Applicants',
        data: slice.map(r => r.count),
        backgroundColor: BAR_COLOR,
        borderRadius: 8,
        maxBarThickness: 36,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45, minRotation: 0 },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar data={chartData} options={options} />
    </div>
  )
}
