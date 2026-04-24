import type { ChartOptions } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import type { DashboardSlice } from './types'

export function DashboardDoughnutChart({
  slices,
  emptyLabel,
  legendLabel,
  cutout = '68%',
}: {
  slices: DashboardSlice[]
  emptyLabel: string
  legendLabel: string
  cutout?: string
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
    cutout,
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
