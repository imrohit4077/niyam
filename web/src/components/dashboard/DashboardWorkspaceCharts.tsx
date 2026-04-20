import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PieController,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'
import type { DashboardSlice } from './dashboardFormat'
import { formatDashboardLabel } from './dashboardFormat'
import {
  PIPELINE_FUNNEL_STAGES,
  type MonthlyTrendPoint,
  type PipelineFunnelStage,
} from './dashboardWorkspaceMetrics'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  PieController,
)

const BRAND_LINE = '#2563eb'
const BRAND_FILL = 'rgba(37, 99, 235, 0.14)'
const AXIS = '#64748b'
const GRID = 'rgba(148, 163, 184, 0.22)'

const baseCartesianOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
} satisfies ChartOptions<'bar' | 'line'>

export function DashboardPipelineFunnelChart({ counts }: { counts: Record<PipelineFunnelStage, number> }) {
  const labels = PIPELINE_FUNNEL_STAGES.map(s => formatDashboardLabel(s))
  const data = PIPELINE_FUNNEL_STAGES.map(s => counts[s])
  const max = Math.max(...data, 1)
  const backgroundColor = PIPELINE_FUNNEL_STAGES.map((_, i) => {
    const t = i / Math.max(PIPELINE_FUNNEL_STAGES.length - 1, 1)
    const alpha = 0.35 + t * 0.55
    return `rgba(37, 99, 235, ${alpha})`
  })

  const options: ChartOptions<'bar'> = {
    ...baseCartesianOptions,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        max: max + Math.ceil(max * 0.08),
        ticks: { color: AXIS, font: { size: 11 }, precision: 0 },
        grid: { color: GRID },
      },
      y: {
        ticks: { color: AXIS, font: { size: 12 } },
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
              label: 'Candidates',
              data,
              backgroundColor,
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

export function DashboardApplicationsLineChart({ monthlyTrend }: { monthlyTrend: MonthlyTrendPoint[] }) {
  const options: ChartOptions<'line'> = {
    ...baseCartesianOptions,
    scales: {
      x: {
        ticks: { color: AXIS, font: { size: 11 } },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: AXIS, precision: 0, font: { size: 11 } },
        grid: { color: GRID },
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
        options={options}
      />
    </div>
  )
}

export function DashboardJobsDistributionChart({
  rows,
  maxBars = 8,
}: {
  rows: { jobId: number; title: string; count: number }[]
  maxBars?: number
}) {
  const sorted = [...rows].sort((a, b) => b.count - a.count).slice(0, maxBars)
  const labels = sorted.map(r => (r.title.length > 36 ? `${r.title.slice(0, 34)}…` : r.title))
  const data = sorted.map(r => r.count)

  const options: ChartOptions<'bar'> = {
    ...baseCartesianOptions,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: AXIS, font: { size: 11 }, precision: 0 },
        grid: { color: GRID },
      },
      y: {
        ticks: { color: AXIS, font: { size: 11 } },
        grid: { display: false },
      },
    },
  }

  if (sorted.length === 0) {
    return <div className="dashboard-empty">No applicant data yet.</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: 'Applicants',
              data,
              backgroundColor: 'rgba(14, 165, 233, 0.55)',
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

export function DashboardSourcePieChart({ slices }: { slices: DashboardSlice[] }) {
  if (slices.length === 0) {
    return <div className="dashboard-empty">No source data yet.</div>
  }

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } },
      },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-pie">
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
