/** Month key YYYY-MM */
export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function pctChangeVsPrevious(current: number, previous: number): { direction: 'up' | 'down' | 'flat'; label: string } {
  if (previous === 0 && current === 0) return { direction: 'flat', label: '0%' }
  if (previous === 0 && current > 0) return { direction: 'up', label: 'New' }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw)
  const direction = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
  const sign = rounded > 0 ? '+' : ''
  return { direction, label: `${sign}${rounded}%` }
}

export function countApplicationsInMonth(
  applications: { created_at: string }[],
  year: number,
  monthIndex0: number,
): number {
  const start = new Date(year, monthIndex0, 1).getTime()
  const end = new Date(year, monthIndex0 + 1, 1).getTime()
  return applications.filter(a => {
    const t = new Date(a.created_at).getTime()
    return t >= start && t < end
  }).length
}
