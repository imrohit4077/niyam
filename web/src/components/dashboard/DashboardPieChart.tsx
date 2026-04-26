import { type ChartOptions } from 'chart.js'
import { Pie } from 'react-chartjs-2'
import type { DashboardSlice } from './dashboardUtils'

const options: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
  },
}

export function DashboardPieChart({ slices, emptyLabel }: { slices: DashboardSlice[]; emptyLabel: string }) {
  if (slices.length === 0) return <div className="dashboard-empty">{emptyLabel}</div>

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
