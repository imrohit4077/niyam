import type { ChartOptions } from 'chart.js'
import { Pie } from 'react-chartjs-2'
import { DASHBOARD_CHART_COLORS } from './dashboardMetrics'

export type SourceSlice = { key: string; label: string; value: number; color: string }

type Props = {
  slices: SourceSlice[]
  emptyLabel?: string
}

export function WorkspaceSourcePie({ slices, emptyLabel = 'No source data yet.' }: Props) {
  if (slices.length === 0) return <div className="dashboard-empty">{emptyLabel}</div>

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
              backgroundColor: slices.map((s, i) => s.color || DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length]),
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
