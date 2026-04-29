type Props = {
  /** Positive = up is good (e.g. more candidates). Negative = down is good (e.g. fewer rejections). */
  polarity?: 'up_good' | 'down_good' | 'neutral'
  current: number
  previous: number
  /** When true, show neutral dash if previous is 0 */
  hideWhenNoBaseline?: boolean
}

export default function TrendIndicator({ polarity = 'neutral', current, previous, hideWhenNoBaseline }: Props) {
  if (hideWhenNoBaseline && previous === 0 && current === 0) {
    return <span className="dashboard-trend dashboard-trend-neutral">—</span>
  }
  if (previous === 0 && current === 0) {
    return <span className="dashboard-trend dashboard-trend-neutral">0%</span>
  }

  let pct: number
  if (previous === 0) {
    pct = current > 0 ? 100 : 0
  } else {
    pct = Math.round(((current - previous) / previous) * 100)
  }

  const up = current >= previous
  const arrow = up ? '↑' : '↓'
  const label = `${arrow} ${Math.abs(pct)}%`

  let tone: 'up' | 'down' | 'flat' = 'flat'
  if (current !== previous) {
    if (polarity === 'neutral') tone = up ? 'up' : 'down'
    else if (polarity === 'up_good') tone = up ? 'up' : 'down'
    else tone = up ? 'down' : 'up'
  }

  const className =
    tone === 'flat'
      ? 'dashboard-trend dashboard-trend-neutral'
      : tone === 'up'
        ? 'dashboard-trend dashboard-trend-positive'
        : 'dashboard-trend dashboard-trend-negative'

  return <span className={className}>{label}</span>
}
