export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendResult = {
  direction: TrendDirection
  /** Human-readable label, e.g. "12%" or "—" */
  label: string
}
