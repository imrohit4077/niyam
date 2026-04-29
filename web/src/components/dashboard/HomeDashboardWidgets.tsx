import './dashboardChartSetup'

import { type ReactNode } from 'react'
import { type ChartOptions } from 'chart.js'
import { Doughnut, Pie } from 'react-chartjs-2'

import type { DashboardSlice } from './dashboardConstants'

export type TrendDirection = 'up' | 'down' | 'flat'

export function LoadingRow() {
  return (
    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      <div className="spinner" style={{ margin: '0 auto 8px', width: 24, height: 24 }} />
      Loading...
    </div>
  )
}

export function ErrorRow({ msg }: { msg: string }) {
  return (
    <div
      style={{
        padding: '16px 20px',
        color: 'var(--error)',
        fontSize: 13,
        background: 'var(--error-bg)',
        borderBottom: '1px solid var(--error-border)',
      }}
    >
      {msg}
    </div>
  )
}

export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid--four">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-kpi-card dashboard-kpi-skeleton" aria-hidden>
          <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--short" />
          <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--value" />
          <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--tiny" />
        </div>
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-shell ${short ? 'dashboard-chart-shell-short' : ''} dashboard-chart-skeleton-wrap`}>
      <div className="dashboard-chart-skeleton-block" />
    </div>
  )
}

export function DashboardSummaryCard({
  title,
  value,
  trendLabel,
  trendDirection,
  icon,
  loading,
}: {
  title: string
  value: string | number
  trendLabel: string
  trendDirection: TrendDirection
  icon: ReactNode
  loading?: boolean
}) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card--metric ${loading ? 'dashboard-kpi-card--loading' : ''}`}>
      <div className="dashboard-kpi-card-head">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-card-label">{title}</span>
      </div>
      {loading ? (
        <>
          <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--value dashboard-kpi-inline-block" />
          <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--tiny dashboard-kpi-inline-block" />
        </>
      ) : (
        <>
          <strong className="dashboard-kpi-value">{value}</strong>
          <p className={`dashboard-kpi-trend dashboard-kpi-trend--${trendDirection}`}>
            <span className="dashboard-kpi-trend-arrow" aria-hidden>
              {trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'}
            </span>
            {trendLabel}
          </p>
        </>
      )}
    </article>
  )
}

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

export function DashboardPieChart({
  slices,
  emptyLabel,
}: {
  slices: DashboardSlice[]
  emptyLabel: string
}) {
  if (slices.length === 0) return <div className="dashboard-empty">{emptyLabel}</div>

  const chartData = {
    labels: slices.map(slice => slice.label),
    datasets: [
      {
        data: slices.map(slice => slice.value),
        backgroundColor: slices.map(slice => slice.color),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  }

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
    },
  }

  return (
    <div className="dashboard-chart-shell dashboard-chart-shell-short">
      <Pie data={chartData} options={options} />
    </div>
  )
}

export function DashboardPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel dashboard-panel dashboard-modern-panel">
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}
