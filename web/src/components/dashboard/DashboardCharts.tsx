import type { ChartOptions } from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'
import { DASHBOARD_CHART_PRIMARY, DASHBOARD_CHART_SCALE } from './dashboardChartTheme'

export { DASHBOARD_CHART_PRIMARY, DASHBOARD_CHART_SCALE } from './dashboardChartTheme'
import { funnelChartLabels, type FunnelStage, FUNNEL_STAGES } from './dashboardUtils'

const BRAND = DASHBOARD_CHART_PRIMARY

const funnelBarOptions: ChartOptions<'bar'> = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label(ctx) {
          const v = ctx.parsed.x
          return typeof v === 'number' ? `${v} candidates` : String(v)
        },
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { color: DASHBOARD_CHART_SCALE, precision: 0, font: { size: 11 } },
      grid: { color: 'rgba(148,163,184,0.22)' },
    },
    y: {
      ticks: { color: DASHBOARD_CHART_SCALE, font: { size: 11 } },
      grid: { display: false },
    },
  },
}

/** Horizontal bar chart: Applied → Hired funnel for a set of applications. */
export function DashboardPipelineFunnelChart({ counts }: { counts: Record<FunnelStage, number> }) {
  const data = FUNNEL_STAGES.map(s => counts[s])
  if (data.every(v => v === 0)) {
    return <div className="dashboard-empty">No candidates in pipeline stages yet.</div>
  }

  const chartData = {
    labels: funnelChartLabels(),
    datasets: [
      {
        label: 'Candidates',
        data,
        backgroundColor: FUNNEL_STAGES.map(
          (_, i) => `rgba(14, 165, 233, ${0.35 + (i / FUNNEL_STAGES.length) * 0.55})`,
        ),
        borderColor: FUNNEL_STAGES.map(() => BRAND),
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 28,
      },
    ],
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
      <Bar data={chartData} options={funnelBarOptions} />
    </div>
  )
}

const pieOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } },
    },
  },
}

export function DashboardSourcePieChart({
  labels,
  values,
  colors,
  emptyLabel,
}: {
  labels: string[]
  values: number[]
  colors: string[]
  emptyLabel: string
}) {
  if (labels.length === 0 || values.every(v => v === 0)) {
    return <div className="dashboard-empty">{emptyLabel}</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Pie
        data={{
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: colors,
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

const jobBarOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      ticks: { color: DASHBOARD_CHART_SCALE, font: { size: 10 }, maxRotation: 45, minRotation: 0 },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: DASHBOARD_CHART_SCALE, precision: 0, font: { size: 11 } },
      grid: { color: 'rgba(148,163,184,0.22)' },
    },
  },
}

export function DashboardJobApplicantBarChart({
  jobLabels,
  applicantCounts,
}: {
  jobLabels: string[]
  applicantCounts: number[]
}) {
  if (jobLabels.length === 0) {
    return <div className="dashboard-empty">No applications to show by job.</div>
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar
        data={{
          labels: jobLabels,
          datasets: [
            {
              label: 'Applicants',
              data: applicantCounts,
              backgroundColor: 'rgba(37, 99, 235, 0.55)',
              borderColor: BRAND,
              borderWidth: 1,
              borderRadius: 6,
              maxBarThickness: 40,
            },
          ],
        }}
        options={jobBarOptions}
      />
    </div>
  )
}
