import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import { formatDashboardLabel, formatRelativeTime } from './formatters'

export type ActivityEvent = {
  id: string
  title: string
  subtitle: string
  timeLabel: string
  kind: 'application' | 'interview' | 'offer' | 'hired'
  sortAt: number
}

export function countInCalendarMonth(iso: string, ref: Date) {
  const d = new Date(iso)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  max = 14,
): ActivityEvent[] {
  const events: ActivityEvent[] = []

  for (const app of applications) {
    events.push({
      id: `app-${app.id}`,
      title: `Application: ${app.candidate_name || app.candidate_email}`,
      subtitle: `Added to pipeline · ${formatDashboardLabel(app.status)}`,
      timeLabel: formatRelativeTime(app.created_at),
      kind: 'application',
      sortAt: new Date(app.created_at).getTime(),
    })
    if (app.status === 'offer') {
      events.push({
        id: `offer-${app.id}`,
        title: `Offer stage: ${app.candidate_name || app.candidate_email}`,
        subtitle: 'Candidate in offer stage',
        timeLabel: formatRelativeTime(app.updated_at),
        kind: 'offer',
        sortAt: new Date(app.updated_at).getTime(),
      })
    }
    if (app.status === 'hired') {
      events.push({
        id: `hired-${app.id}`,
        title: `Hired: ${app.candidate_name || app.candidate_email}`,
        subtitle: 'Marked as hired',
        timeLabel: formatRelativeTime(app.updated_at),
        kind: 'hired',
        sortAt: new Date(app.updated_at).getTime(),
      })
    }
  }

  for (const row of interviews) {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? 'Role'
    const t = row.scheduled_at || row.updated_at
    events.push({
      id: `int-${row.id}`,
      title: row.scheduled_at ? `Interview scheduled · ${name}` : `Interview · ${name}`,
      subtitle: `${jobTitle} · ${formatDashboardLabel(row.status)}`,
      timeLabel: formatRelativeTime(t),
      kind: 'interview',
      sortAt: new Date(t).getTime(),
    })
  }

  events.sort((a, b) => b.sortAt - a.sortAt)
  return events.slice(0, max)
}

export function countScheduledInterviewsInMonth(rows: InterviewAssignmentRow[], ref: Date) {
  return rows.filter(row => {
    if (!row.scheduled_at) return false
    return countInCalendarMonth(row.scheduled_at, ref)
  }).length
}

export function countOffersInMonth(apps: Application[], ref: Date) {
  return apps.filter(app => app.status === 'offer' && countInCalendarMonth(app.updated_at, ref)).length
}
