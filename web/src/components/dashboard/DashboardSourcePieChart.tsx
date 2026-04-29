import { type ChartOptions } from 'chart.js'
import { Pie } from 'react-chartjs-2'
import { type DashboardSlice } from './dashboardTypes'

type Props = {
  slices: DashboardSlice[]
  emptyLabel: string
}

export function DashboardSourcePieChart({ slices, emptyLabel }: Props) {
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
      legend: { position: 'right', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' } },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-pie">
      <Pie data={chartData} options={options} />
    </div>
  )
}
