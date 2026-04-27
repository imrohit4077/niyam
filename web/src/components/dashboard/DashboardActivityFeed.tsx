import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'

export type ActivityFeedItem = {
  id: string
  at: string
  title: string
  subtitle: string
  tone: 'default' | 'success' | 'accent'
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function buildFeed(applications: Application[], interviews: InterviewAssignmentRow[], limit = 14): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = []

  const recentApps = [...applications].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  for (const a of recentApps.slice(0, 10)) {
    const name = a.candidate_name || a.candidate_email
    items.push({
      id: `app-${a.id}`,
      at: a.created_at,
      title: 'New application',
      subtitle: `${name} · Job #${a.job_id}`,
      tone: 'default',
    })
  }

  const interviewRows = [...interviews].sort((a, b) => {
    const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : new Date(a.updated_at ?? 0).getTime()
    const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : new Date(b.updated_at ?? 0).getTime()
    return tb - ta
  })
  for (const row of interviewRows.slice(0, 8)) {
    const when = row.scheduled_at || row.updated_at
    if (!when) continue
    const cand = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`
    items.push({
      id: `int-${row.id}`,
      at: when,
      title: 'Interview activity',
      subtitle: `${cand} · ${jobTitle} · ${row.status.replace(/_/g, ' ')}`,
      tone: 'accent',
    })
  }

  const offerHires = [...applications]
    .filter(a => a.status === 'offer' || a.status === 'hired')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  for (const a of offerHires.slice(0, 6)) {
    const name = a.candidate_name || a.candidate_email
    items.push({
      id: `stage-${a.id}-${a.status}`,
      at: a.updated_at,
      title: a.status === 'hired' ? 'Candidate hired' : 'Offer stage',
      subtitle: `${name} · Job #${a.job_id}`,
      tone: a.status === 'hired' ? 'success' : 'default',
    })
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const seen = new Set<string>()
  const deduped: ActivityFeedItem[] = []
  for (const it of items) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    deduped.push(it)
    if (deduped.length >= limit) break
  }
  return deduped
}

export function DashboardActivityFeed({
  applications,
  interviews,
}: {
  applications: Application[]
  interviews: InterviewAssignmentRow[]
}) {
  const feed = buildFeed(applications, interviews)

  if (feed.length === 0) {
    return <div className="dashboard-empty">Activity will appear as your team adds candidates and schedules interviews.</div>
  }

  return (
    <ul className="dashboard-activity-feed">
      {feed.map(item => (
        <li key={item.id} className={`dashboard-activity-item dashboard-activity-item--${item.tone}`}>
          <div className="dashboard-activity-dot" aria-hidden />
          <div className="dashboard-activity-body">
            <div className="dashboard-activity-title">{item.title}</div>
            <div className="dashboard-activity-sub">{item.subtitle}</div>
          </div>
          <time className="dashboard-activity-time" dateTime={item.at}>
            {formatWhen(item.at)}
          </time>
        </li>
      ))}
    </ul>
  )
}
