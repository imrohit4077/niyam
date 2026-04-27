import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'

export type ActivityItem = {
  id: string
  at: number
  title: string
  subtitle: string
  tone: 'apply' | 'interview' | 'offer' | 'hire' | 'other'
  href?: string
}

export function buildActivityItems(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  accountId: string | number,
  limit = 14,
): ActivityItem[] {
  const items: ActivityItem[] = []

  applications.forEach(app => {
    items.push({
      id: `app-${app.id}`,
      at: new Date(app.created_at).getTime(),
      title: 'New application',
      subtitle: `${app.candidate_name || app.candidate_email} · Job #${app.job_id}`,
      tone: 'apply',
      href: `/account/${accountId}/job-applications/${app.id}`,
    })
    if (app.status === 'offer') {
      items.push({
        id: `offer-${app.id}`,
        at: new Date(app.updated_at).getTime(),
        title: 'Candidate in offer stage',
        subtitle: `${app.candidate_name || app.candidate_email}`,
        tone: 'offer',
        href: `/account/${accountId}/job-applications/${app.id}`,
      })
    }
    if (app.status === 'hired') {
      items.push({
        id: `hire-${app.id}`,
        at: new Date(app.updated_at).getTime(),
        title: 'Candidate hired',
        subtitle: `${app.candidate_name || app.candidate_email}`,
        tone: 'hire',
        href: `/account/${accountId}/job-applications/${app.id}`,
      })
    }
  })

  interviews.forEach(row => {
    if (!row.scheduled_at) return
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? `Job #${row.application?.job_id ?? ''}`
    items.push({
      id: `int-${row.id}`,
      at: new Date(row.scheduled_at).getTime(),
      title: 'Interview scheduled',
      subtitle: `${name} · ${jobTitle}`,
      tone: 'interview',
      href: row.application?.id != null ? `/account/${accountId}/job-applications/${row.application.id}` : undefined,
    })
  })

  items.sort((a, b) => b.at - a.at)
  const seen = new Set<string>()
  const deduped: ActivityItem[] = []
  for (const it of items) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    deduped.push(it)
    if (deduped.length >= limit) break
  }
  return deduped
}
