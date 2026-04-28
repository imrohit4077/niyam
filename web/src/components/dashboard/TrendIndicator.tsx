/** Small delta for summary cards: direction + percent vs prior period. */
export function TrendIndicator({
  current,
  previous,
  invert = false,
}: {
  current: number
  previous: number
  /** When true, down is "good" (e.g. rejections). */
  invert?: boolean
}) {
  if (previous === 0 && current === 0) {
    return <span className="dashboard-trend dashboard-trend-neutral">—</span>
  }
  let pct: number
  if (previous === 0) {
    pct = current > 0 ? 100 : 0
  } else {
    pct = Math.round(((current - previous) / previous) * 100)
  }
  const up = current >= previous
  const good = invert ? !up : up
  const arrow = up ? '↑' : '↓'
  const label = `${arrow} ${Math.abs(pct)}%`
  const cls = good ? 'dashboard-trend-positive' : 'dashboard-trend-negative'
  return <span className={`dashboard-trend ${cls}`}>{label}</span>
}
