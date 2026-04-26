import { type ChartOptions } from 'chart.js'
import { Bar } from 'react-chartjs-2'

const options: ChartOptions<'bar'> = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
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

export function DashboardFunnelBar({
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
  const total = values.reduce((a, b) => a + b, 0)
  if (total === 0) return <div className="dashboard-empty">{emptyLabel}</div>

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
      <Bar
        data={{
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: colors,
              borderRadius: 8,
              maxBarThickness: 36,
            },
          ],
        }}
        options={options}
      />
    </div>
  )
}
