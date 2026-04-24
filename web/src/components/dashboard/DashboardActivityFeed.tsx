import type { Application } from '../../api/applications'
import { formatDashboardLabel } from './formatDashboard'

function formatActivityWhen(ts: number) {
  const d = new Date(ts)
  const now = Date.now()
  const diffMs = now - ts
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type FeedEvent = {
  id: string
  ts: number
  title: string
  detail: string
}

function buildFeedEvents(applications: Application[], jobTitleById: Map<number, string>): FeedEvent[] {
  const events: FeedEvent[] = []

  for (const app of applications) {
    const jobTitle = jobTitleById.get(app.job_id) ?? `Job #${app.job_id}`
    const name = app.candidate_name?.trim() || app.candidate_email

    events.push({
      id: `sub-${app.id}`,
      ts: new Date(app.created_at).getTime(),
      title: name,
      detail: `Application submitted · ${jobTitle}`,
    })

    for (const h of app.stage_history ?? []) {
      events.push({
        id: `st-${app.id}-${h.changed_at}-${h.stage}`,
        ts: new Date(h.changed_at).getTime(),
        title: name,
        detail: `Stage: ${formatDashboardLabel(h.stage)} · ${jobTitle}`,
      })
    }
  }

  events.sort((a, b) => b.ts - a.ts)
  return events
}

export function DashboardActivityFeed({
  applications,
  jobTitleById,
  loading,
  limit = 10,
}: {
  applications: Application[]
  jobTitleById: Map<number, string>
  loading: boolean
  limit?: number
}) {
  if (loading) {
    return (
      <ul className="dashboard-activity-list" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="dashboard-activity-item dashboard-activity-skeleton">
            <div className="dashboard-activity-skeleton-lines">
              <span className="dashboard-skeleton-line dashboard-skeleton-line--lg" />
              <span className="dashboard-skeleton-line dashboard-skeleton-line--sm" />
            </div>
          </li>
        ))}
      </ul>
    )
  }

  const sorted = buildFeedEvents(applications, jobTitleById)
  const seen = new Set<string>()
  const items: { id: string; title: string; detail: string; when: string; whenIso: string }[] = []
  for (const e of sorted) {
    const key = `${e.title}|${e.detail}|${Math.floor(e.ts / 60000)}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push({
      id: e.id,
      title: e.title,
      detail: e.detail,
      when: formatActivityWhen(e.ts),
      whenIso: new Date(e.ts).toISOString(),
    })
    if (items.length >= limit) break
  }

  if (items.length === 0) {
    return <div className="dashboard-empty">No recent candidate activity yet.</div>
  }

  return (
    <ul className="dashboard-activity-list">
      {items.map(item => (
        <li key={item.id} className="dashboard-activity-item">
          <div className="dashboard-activity-dot" aria-hidden />
          <div className="dashboard-activity-body">
            <strong>{item.title}</strong>
            <span className="dashboard-activity-detail">{item.detail}</span>
          </div>
          <time className="dashboard-activity-when" dateTime={item.whenIso}>
            {item.when}
          </time>
        </li>
      ))}
    </ul>
  )
}
