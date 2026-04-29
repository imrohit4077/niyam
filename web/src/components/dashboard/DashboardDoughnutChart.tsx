import type { ChartOptions } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

type Props = {
  slices: DashboardSlice[]
  emptyLabel: string
  legendLabel: string
}

export default function DashboardDoughnutChart({ slices, emptyLabel, legendLabel }: Props) {
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
