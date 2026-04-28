import type { ChartOptions } from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { axisOptions, dashboardChartCommon } from './dashboardChartOptions'

const BRAND = '#0ea5e9'
const BRAND_SOFT = 'rgba(14, 165, 233, 0.15)'

export function ApplicationsLineChart({
  labels,
  values,
}: {
  labels: string[]
  values: number[]
}) {
  const lineOptions: ChartOptions<'line'> = {
    ...dashboardChartCommon,
    plugins: { legend: { display: false } },
    scales: axisOptions,
  }
  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Line
        data={{
          labels,
          datasets: [
            {
              data: values,
              borderColor: BRAND,
              backgroundColor: BRAND_SOFT,
              borderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 5,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: BRAND,
              pointBorderWidth: 2,
              fill: true,
              tension: 0.32,
            },
          ],
        }}
        options={lineOptions}
      />
    </div>
  )
}

export function JobDistributionBarChart({
  labels,
  values,
}: {
  labels: string[]
  values: number[]
}) {
  const options: ChartOptions<'bar'> = {
    ...dashboardChartCommon,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { display: false },
      },
    },
  }
  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Bar
        data={{
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: labels.map((_, i) => `hsl(${200 + i * 12}, 75%, 48%)`),
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

export function SourceBarChartVertical({
  labels,
  values,
  colors,
}: {
  labels: string[]
  values: number[]
  colors: string[]
}) {
  const options: ChartOptions<'bar'> = {
    ...dashboardChartCommon,
    plugins: { legend: { display: false } },
    scales: axisOptions,
  }
  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
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

export function SourcePieChart({
  labels,
  values,
  colors,
}: {
  labels: string[]
  values: number[]
  colors: string[]
}) {
  const options: ChartOptions<'doughnut'> = {
    ...dashboardChartCommon,
    cutout: '58%',
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
    },
  }
  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Doughnut
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
        options={options}
      />
    </div>
  )
}

export function PipelineFunnelBarChart({
  labels,
  values,
  colors,
}: {
  labels: string[]
  values: number[]
  colors: string[]
}) {
  const options: ChartOptions<'bar'> = {
    ...dashboardChartCommon,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 11 } },
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
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: 'Candidates',
              data: values,
              backgroundColor: colors,
              borderRadius: 8,
              maxBarThickness: 48,
            },
          ],
        }}
        options={options}
      />
    </div>
  )
}
