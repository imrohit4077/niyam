import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
)
import type { DashboardSlice } from './dashboardFormatters'

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
      ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
      grid: { color: 'rgba(148,163,184,0.22)' },
    },
    y: {
      ticks: { color: '#475569', font: { size: 12, weight: 500 } },
      grid: { display: false },
    },
  },
}

export function PipelineFunnelChart({
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
  const max = Math.max(...values, 0)
  if (max === 0) return <div className="dashboard-empty">{emptyLabel}</div>

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
      <Bar
        data={{
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: colors,
              borderRadius: 6,
              barThickness: 28,
            },
          ],
        }}
        options={funnelBarOptions}
      />
    </div>
  )
}
