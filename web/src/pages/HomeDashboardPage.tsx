import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import {
  DashboardSummaryCard,
  DashboardSummaryCardSkeleton,
  type SummaryTrend,
} from '../components/dashboard/DashboardSummaryCard'

const STAGE_COLORS: Record<string, string> = {
  applied: 'tag-blue',
  screening: 'tag-orange',
  interview: 'tag-blue',
  offer: 'tag-green',
  hired: 'tag-green',
  rejected: 'tag-red',
  withdrawn: 'tag-gray',
  draft: 'tag-gray',
  open: 'tag-green',
  closed: 'tag-gray',
  paused: 'tag-orange',
  pending: 'tag-orange',
  scheduled: 'tag-blue',
  completed: 'tag-green',
  cancelled: 'tag-gray',
}

const DASHBOARD_CHART_COLORS = ['#0ea5e9', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6']

const FUNNEL_STAGE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
const FUNNEL_LABELS: Record<(typeof FUNNEL_STAGE_ORDER)[number], string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
}

const MS_DAY = 86_400_000

type PipelineModalKind = 'applicants' | 'interviews' | 'offers' | 'hired'

type ActivityKind = 'application' | 'interview' | 'stage'

type ActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
}

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler)

function LoadingRow() {
  return (
    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      <div className="spinner" style={{ margin: '0 auto 8px', width: 24, height: 24 }} />
      Loading...
    </div>
  )
}

function ErrorRow({ msg }: { msg: string }) {
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

function formatDashboardLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase())
}

function formatDateTimeShort(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatRelativeDay(value: string) {
  const d = new Date(value)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / MS_DAY)
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function makeDashboardSlices(entries: Array<[string, number]>) {
  return entries
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({
      key: label,
      label: formatDashboardLabel(label),
      value,
      color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
    }))
}

function countInDateRange<T extends { created_at?: string; updated_at?: string }>(
  rows: T[],
  start: Date,
  end: Date,
  field: 'created_at' | 'updated_at',
) {
  const a = start.getTime()
  const b = end.getTime()
  return rows.filter(row => {
    const raw = row[field]
    if (!raw) return false
    const t = new Date(raw).getTime()
    return t >= a && t < b
  }).length
}

function buildTrend(current: number, previous: number, periodLabel: string): SummaryTrend | null {
  if (previous === 0 && current === 0) return { direction: 'flat', percent: 0, periodLabel }
  if (previous === 0) return { direction: 'up', percent: 100, periodLabel }
  const raw = Math.round(((current - previous) / previous) * 100)
  const pct = Math.min(999, Math.abs(raw))
  if (raw > 0) return { direction: 'up', percent: pct, periodLabel }
  if (raw < 0) return { direction: 'down', percent: pct, periodLabel }
  return { direction: 'flat', percent: 0, periodLabel }
}

function countWorkspaceFunnel(apps: Application[]) {
  const counts: Record<(typeof FUNNEL_STAGE_ORDER)[number], number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const app of apps) {
    const s = app.status as keyof typeof counts
    if (s in counts) counts[s] += 1
  }
  return counts
}

function buildActivityFeed(
  apps: Application[],
  interviewRows: InterviewAssignmentRow[],
  jobById: Map<number, Job>,
): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const app of apps) {
    const jobTitle = jobById.get(app.job_id)?.title ?? `Job #${app.job_id}`
    items.push({
      id: `app-${app.id}`,
      kind: 'application',
      title: 'New application',
      subtitle: `${app.candidate_name || app.candidate_email} · ${jobTitle}`,
      at: app.created_at,
    })
    const history = app.stage_history ?? []
    const last = history[history.length - 1]
    if (last?.changed_at && last.stage) {
      items.push({
        id: `stage-${app.id}-${last.changed_at}`,
        kind: 'stage',
        title: `Moved to ${formatDashboardLabel(last.stage)}`,
        subtitle: `${app.candidate_name || app.candidate_email} · ${jobTitle}`,
        at: last.changed_at,
      })
    }
  }

  for (const row of interviewRows) {
    const when = row.scheduled_at ?? row.updated_at
    if (!when) continue
    const jobTitle = row.job?.title ?? (row.application?.job_id != null ? jobById.get(row.application.job_id)?.title : undefined) ?? 'Interview'
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    items.push({
      id: `int-${row.id}-${when}`,
      kind: 'interview',
      title: row.scheduled_at ? 'Interview scheduled' : 'Interview updated',
      subtitle: `${name} · ${jobTitle}`,
      at: when,
    })
  }

  return items
    .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
    .filter((item, idx, arr) => arr.findIndex(o => o.id === item.id) === idx)
    .slice(0, 14)
}

function dominantPipelineStage(job: Job, apps: Application[]) {
  const forJob = apps.filter(a => a.job_id === job.id)
  if (forJob.length === 0) return '—'
  const tally: Record<string, number> = {}
  for (const a of forJob) {
    tally[a.status] = (tally[a.status] ?? 0) + 1
  }
  let best = ''
  let bestN = 0
  for (const [k, v] of Object.entries(tally)) {
    if (v > bestN) {
      best = k
      bestN = v
    }
  }
  return formatDashboardLabel(best || 'applied')
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconBriefcase() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconGift() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" rx="1" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}

function DashboardPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel dashboard-panel dashboard-modern-panel">
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}

export default function HomeDashboardPage() {
  const { user, token, accountId } = useOutletContext<DashboardOutletContext>()
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [jobsError, setJobsError] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [interviews, setInterviews] = useState<InterviewAssignmentRow[]>([])
  const [interviewsLoading, setInterviewsLoading] = useState(true)
  const [interviewsError, setInterviewsError] = useState('')
  const [allApplications, setAllApplications] = useState<Application[]>([])
  const [jobApplications, setJobApplications] = useState<Application[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const [activePipelineModal, setActivePipelineModal] = useState<PipelineModalKind | null>(null)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setJobsLoading(true)
      setJobsError('')
    })

    jobsApi
      .list(token)
      .then(rows => {
        if (cancelled) return
        setJobs(rows)
        setSelectedJobId(current => {
          if (current && rows.some(job => String(job.id) === current)) return current
          const preferred = rows.find(job => job.status === 'open') ?? rows[0]
          return preferred ? String(preferred.id) : ''
        })
      })
      .catch(e => {
        if (!cancelled) setJobsError(e instanceof Error ? e.message : 'Failed to load jobs')
      })
      .finally(() => {
        if (!cancelled) setJobsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setInterviewsLoading(true)
      setInterviewsError('')
    })

    interviewsApi
      .myAssignments(token, {
        include_open: true,
        page: 1,
        per_page: 40,
      })
      .then(res => {
        if (!cancelled) setInterviews(res.entries)
      })
      .catch(e => {
        if (!cancelled) setInterviewsError(e instanceof Error ? e.message : 'Failed to load interviews')
      })
      .finally(() => {
        if (!cancelled) setInterviewsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false

    applicationsApi
      .list(token)
      .then(rows => {
        if (!cancelled) setAllApplications(rows)
      })
      .catch(() => {
        if (!cancelled) setAllApplications([])
      })

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!selectedJobId) {
      queueMicrotask(() => {
        setJobApplications([])
        setAnalyticsError('')
      })
      return
    }

    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setAnalyticsLoading(true)
      setAnalyticsError('')
    })

    applicationsApi
      .list(token, { jobId: Number(selectedJobId) })
      .then(rows => {
        if (!cancelled) setJobApplications(rows)
      })
      .catch(e => {
        if (!cancelled) {
          setJobApplications([])
          setAnalyticsError(e instanceof Error ? e.message : 'Failed to load job applications')
        }
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, selectedJobId])

  const jobById = useMemo(() => new Map(jobs.map(j => [j.id, j])), [jobs])

  const selectedJob = jobs.find(job => String(job.id) === selectedJobId) ?? null
  const jobsByStatus = makeDashboardSlices(
    Object.entries(
      jobs.reduce<Record<string, number>>((acc, job) => {
        acc[job.status] = (acc[job.status] ?? 0) + 1
        return acc
      }, {}),
    ),
  )
  const jobApplicationsByStatus = jobApplications.reduce<Record<string, number>>((acc, application) => {
    acc[application.status] = (acc[application.status] ?? 0) + 1
    return acc
  }, {})
  const analyticsSlices = makeDashboardSlices(Object.entries(jobApplicationsByStatus))
  const totalApplicants = jobApplications.length
  const hiredCount = jobApplicationsByStatus.hired ?? 0
  const offerStageCount = jobApplicationsByStatus.offer ?? 0
  const rejectedCount = (jobApplicationsByStatus.rejected ?? 0) + (jobApplicationsByStatus.withdrawn ?? 0)
  const conversionRate = totalApplicants > 0 ? Math.round((hiredCount / totalApplicants) * 100) : 0
  const jobStatusGroups = jobsByStatus.map(slice => ({
    ...slice,
    jobs: jobs.filter(job => job.status === slice.key),
  }))
  const filteredUpcomingInterviews = interviews
    .filter(row => {
      if (!selectedJobId) return true
      const jobId = row.job?.id ?? row.application?.job_id
      return String(jobId ?? '') === selectedJobId
    })
    .sort((a, b) => {
      const aTime = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER
      const bTime = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER
      return aTime - bTime
    })
  const interviewPanelRows = filteredUpcomingInterviews.filter(
    row => row.status === 'scheduled' || row.status === 'pending' || !!row.scheduled_at,
  )
  const workspaceUpcomingInterviews = interviews.filter(
    row => row.status === 'scheduled' || row.status === 'pending' || !!row.scheduled_at,
  ).length
  const scheduledInterviewsScoped = interviewPanelRows.length
  const offerRows = jobApplications.filter(application => application.status === 'offer')
  const hiredRows = jobApplications.filter(application => application.status === 'hired')
  const openJobs = jobs.filter(job => job.status === 'open').length
  const totalHiredCandidates = allApplications.filter(application => application.status === 'hired').length
  const totalApplicantsAcrossJobs = allApplications.length
  const totalOpenings = jobs.reduce((sum, job) => sum + (job.open_positions ?? 0), 0)
  const openingFillRate = totalOpenings > 0 ? Math.round((totalHiredCandidates / totalOpenings) * 100) : 0
  const avgApplicantsPerJob = jobs.length > 0 ? (totalApplicantsAcrossJobs / jobs.length).toFixed(1) : '0.0'
  const sourceSlicesJob = makeDashboardSlices(
    Object.entries(
      jobApplications.reduce<Record<string, number>>((acc, application) => {
        const source = application.source_type || 'unknown'
        acc[source] = (acc[source] ?? 0) + 1
        return acc
      }, {}),
    ),
  )
  const sourceSlicesWorkspace = makeDashboardSlices(
    Object.entries(
      allApplications.reduce<Record<string, number>>((acc, application) => {
        const source = application.source_type || 'unknown'
        acc[source] = (acc[source] ?? 0) + 1
        return acc
      }, {}),
    ),
  )
  const monthlyTrend = useMemo(() => {
    const now = new Date()
    const keys = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('en-US', { month: 'short' })
      return { key, label }
    })
    const counters = keys.reduce<Record<string, number>>((acc, item) => {
      acc[item.key] = 0
      return acc
    }, {})
    allApplications.forEach(application => {
      const date = new Date(application.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (key in counters) counters[key] += 1
    })
    return keys.map(item => ({ label: item.label, value: counters[item.key] ?? 0 }))
  }, [allApplications])
  const conversionRateWorkspace = totalApplicantsAcrossJobs > 0 ? Math.round((totalHiredCandidates / totalApplicantsAcrossJobs) * 100) : 0
  const maxSourceValueJob = Math.max(...sourceSlicesJob.map(slice => slice.value), 0)
  const sourceTopLabelJob = sourceSlicesJob.find(slice => slice.value === maxSourceValueJob)?.label ?? 'No data'

  const now = useMemo(() => new Date(), [])
  const periodTrend = useMemo(() => {
    const end = now.getTime()
    const curStart = new Date(end - 30 * MS_DAY)
    const prevStart = new Date(end - 60 * MS_DAY)
    const prevEnd = curStart

    const appsCurr = countInDateRange(allApplications, curStart, new Date(end), 'created_at')
    const appsPrev = countInDateRange(allApplications, prevStart, prevEnd, 'created_at')

    const openJobsCurr = jobs.filter(
      j => j.status === 'open' && new Date(j.created_at).getTime() >= curStart.getTime() && new Date(j.created_at).getTime() < end,
    ).length
    const openJobsPrev = jobs.filter(
      j => j.status === 'open' && new Date(j.created_at).getTime() >= prevStart.getTime() && new Date(j.created_at).getTime() < prevEnd.getTime(),
    ).length

    const intCurr = interviews.filter(r => {
      if (!r.scheduled_at) return false
      const t = new Date(r.scheduled_at).getTime()
      return t >= curStart.getTime() && t < end
    }).length
    const intPrev = interviews.filter(r => {
      if (!r.scheduled_at) return false
      const t = new Date(r.scheduled_at).getTime()
      return t >= prevStart.getTime() && t < prevEnd.getTime()
    }).length

    const offersCurr = allApplications.filter(a => {
      if (a.status !== 'offer') return false
      const t = new Date(a.updated_at).getTime()
      return t >= curStart.getTime() && t < end
    }).length
    const offersPrev = allApplications.filter(a => {
      if (a.status !== 'offer') return false
      const t = new Date(a.updated_at).getTime()
      return t >= prevStart.getTime() && t < prevEnd.getTime()
    }).length

    const label = 'vs prior 30 days'
    return {
      candidates: buildTrend(appsCurr, appsPrev, label),
      jobs: buildTrend(openJobsCurr, openJobsPrev, label),
      interviews: buildTrend(intCurr, intPrev, label),
      offers: buildTrend(offersCurr, offersPrev, label),
    }
  }, [allApplications, interviews, jobs, now])

  const funnelCounts = useMemo(() => countWorkspaceFunnel(allApplications), [allApplications])
  const funnelLabelsList = FUNNEL_STAGE_ORDER.map(k => FUNNEL_LABELS[k])
  const funnelValuesList = FUNNEL_STAGE_ORDER.map(k => funnelCounts[k])

  const applicantsPerJob = useMemo(() => {
    const tally: Record<number, number> = {}
    for (const a of allApplications) {
      tally[a.job_id] = (tally[a.job_id] ?? 0) + 1
    }
    return jobs
      .map(job => ({ job, n: tally[job.id] ?? 0 }))
      .filter(x => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 12)
  }, [allApplications, jobs])

  const activityItems = useMemo(
    () => buildActivityFeed(allApplications, interviews, jobById),
    [allApplications, interviews, jobById],
  )

  const barOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#6b7280', font: { size: 11 } },
        grid: { display: false },
      },
    },
  }

  const funnelBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#475569', font: { size: 12 } },
        grid: { display: false },
      },
    },
  }

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: '#6b7280', font: { size: 11 } },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
    },
  }

  const pieOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' } },
    },
  }

  const modalTitle =
    activePipelineModal === 'applicants'
      ? 'Applicants'
      : activePipelineModal === 'interviews'
        ? 'Interviews'
        : activePipelineModal === 'offers'
          ? 'Offers'
          : activePipelineModal === 'hired'
            ? 'Hired candidates'
            : ''

  const summaryStripLoading = jobsLoading && interviewsLoading

  return (
    <>
      {activePipelineModal && (
        <div className="modal-overlay" onClick={() => setActivePipelineModal(null)}>
          <div className="modal dashboard-interviews-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modalTitle}</span>
              <button className="modal-close" onClick={() => setActivePipelineModal(null)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="modal-body dashboard-interviews-modal-body">
              <p className="dashboard-modal-lead">{selectedJob ? `${modalTitle} for ${selectedJob.title}` : modalTitle}</p>
              {activePipelineModal === 'interviews' ? (
                interviewsLoading ? (
                  <LoadingRow />
                ) : interviewsError ? (
                  <ErrorRow msg={interviewsError} />
                ) : interviewPanelRows.length === 0 ? (
                  <div className="dashboard-empty">No interview records for this job.</div>
                ) : (
                  <div className="dashboard-schedule">
                    {interviewPanelRows.map(row => (
                      <div key={row.id} className="dashboard-schedule-item">
                        <div>
                          <strong>{row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}</strong>
                          <span>{row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`}</span>
                        </div>
                        <div className="dashboard-schedule-meta">
                          <span className={`tag ${STAGE_COLORS[row.status] ?? 'tag-blue'}`}>{formatDashboardLabel(row.status)}</span>
                          <span>{formatDateTimeShort(row.scheduled_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : activePipelineModal === 'applicants' ? (
                jobApplications.length === 0 ? (
                  <div className="dashboard-empty">No applicants for this job.</div>
                ) : (
                  <div className="dashboard-schedule">
                    {jobApplications.map(application => (
                      <div key={application.id} className="dashboard-schedule-item">
                        <div>
                          <strong>{application.candidate_name || application.candidate_email}</strong>
                          <span>{application.candidate_email}</span>
                        </div>
                        <div className="dashboard-schedule-meta">
                          <span className={`tag ${STAGE_COLORS[application.status] ?? 'tag-blue'}`}>{formatDashboardLabel(application.status)}</span>
                          <span>{new Date(application.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : activePipelineModal === 'offers' ? (
                offerRows.length === 0 ? (
                  <div className="dashboard-empty">No candidates in offer stage for this job.</div>
                ) : (
                  <div className="dashboard-schedule">
                    {offerRows.map(application => (
                      <div key={application.id} className="dashboard-schedule-item">
                        <div>
                          <strong>{application.candidate_name || application.candidate_email}</strong>
                          <span>{application.candidate_email}</span>
                        </div>
                        <div className="dashboard-schedule-meta">
                          <span className={`tag ${STAGE_COLORS[application.status] ?? 'tag-blue'}`}>{formatDashboardLabel(application.status)}</span>
                          <span>{new Date(application.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : hiredRows.length === 0 ? (
                <div className="dashboard-empty">No hired candidates for this job.</div>
              ) : (
                <div className="dashboard-schedule">
                  {hiredRows.map(application => (
                    <div key={application.id} className="dashboard-schedule-item">
                      <div>
                        <strong>{application.candidate_name || application.candidate_email}</strong>
                        <span>{application.candidate_email}</span>
                      </div>
                      <div className="dashboard-schedule-meta">
                        <span className={`tag ${STAGE_COLORS[application.status] ?? 'tag-blue'}`}>{formatDashboardLabel(application.status)}</span>
                        <span>{new Date(application.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-hero dashboard-hero-modern">
        <div className="dashboard-hero-main">
          <p className="dashboard-eyebrow">Talent intelligence</p>
          <h2 className="dashboard-title">{user.account?.name ?? 'Your Workspace'} Hiring Overview</h2>
          <p className="dashboard-subtitle">
            Pipeline velocity, candidate volume, and hiring outcomes at a glance — drill into any role to go deeper.
          </p>
        </div>
        <div className="dashboard-hero-meta">
          <div className="dashboard-hero-meta-item">
            <span>Workspace hire rate</span>
            <strong>{conversionRateWorkspace}%</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Openings fill rate</span>
            <strong>{openingFillRate}%</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Avg applicants / job</span>
            <strong>{avgApplicantsPerJob}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-summary-grid" aria-busy={summaryStripLoading}>
        {summaryStripLoading ? (
          <>
            <DashboardSummaryCardSkeleton />
            <DashboardSummaryCardSkeleton />
            <DashboardSummaryCardSkeleton />
            <DashboardSummaryCardSkeleton />
          </>
        ) : (
          <>
            <DashboardSummaryCard
              className="dashboard-summary-card--primary"
              label="Total candidates"
              value={totalApplicantsAcrossJobs}
              icon={<IconUsers />}
              trend={periodTrend.candidates}
            />
            <DashboardSummaryCard label="Active jobs" value={openJobs} icon={<IconBriefcase />} trend={periodTrend.jobs} />
            <DashboardSummaryCard
              label="Interviews scheduled"
              value={workspaceUpcomingInterviews}
              icon={<IconCalendar />}
              trend={periodTrend.interviews}
            />
            <DashboardSummaryCard
              label="Offers released"
              value={allApplications.filter(a => a.status === 'offer').length}
              icon={<IconGift />}
              trend={periodTrend.offers}
            />
          </>
        )}
      </div>

      <section className="dashboard-charts-section" aria-label="Workspace analytics charts">
        <div className="dashboard-charts-grid">
          <div className="dashboard-chart-tile dashboard-chart-tile--funnel">
            <DashboardPanel title="Candidates pipeline (workspace)">
              <div className="dashboard-panel-content">
                {funnelValuesList.every(v => v === 0) ? (
                  <div className="dashboard-empty">No candidates in funnel stages yet.</div>
                ) : (
                  <div className="dashboard-chart-shell">
                    <Bar
                      data={{
                        labels: funnelLabelsList,
                        datasets: [
                          {
                            data: funnelValuesList,
                            backgroundColor: FUNNEL_STAGE_ORDER.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length]),
                            borderRadius: 8,
                            maxBarThickness: 28,
                          },
                        ],
                      }}
                      options={funnelBarOptions}
                    />
                  </div>
                )}
              </div>
            </DashboardPanel>
          </div>
          <div className="dashboard-chart-tile dashboard-chart-tile--line">
            <DashboardPanel title="Applications over time (6 months)">
              <div className="dashboard-panel-content">
                {monthlyTrend.every(item => item.value === 0) ? (
                  <div className="dashboard-empty">No recent application activity yet.</div>
                ) : (
                  <div className="dashboard-chart-shell">
                    <Line
                      data={{
                        labels: monthlyTrend.map(item => item.label),
                        datasets: [
                          {
                            data: monthlyTrend.map(item => item.value),
                            borderColor: '#2563eb',
                            backgroundColor: 'rgba(37,99,235,0.12)',
                            borderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 5,
                            pointBackgroundColor: '#ffffff',
                            pointBorderColor: '#2563eb',
                            pointBorderWidth: 2,
                            fill: true,
                            tension: 0.32,
                          },
                        ],
                      }}
                      options={lineOptions}
                    />
                  </div>
                )}
              </div>
            </DashboardPanel>
          </div>
          <div className="dashboard-chart-tile dashboard-chart-tile--half">
            <DashboardPanel title="Job-wise applicants (top roles)">
              <div className="dashboard-panel-content">
                {applicantsPerJob.length === 0 ? (
                  <div className="dashboard-empty">No applications yet.</div>
                ) : (
                  <div className="dashboard-chart-shell">
                    <Bar
                      data={{
                        labels: applicantsPerJob.map(({ job }) => (job.title.length > 28 ? `${job.title.slice(0, 26)}…` : job.title)),
                        datasets: [
                          {
                            data: applicantsPerJob.map(({ n }) => n),
                            backgroundColor: 'rgba(14, 165, 233, 0.55)',
                            borderColor: '#0ea5e9',
                            borderWidth: 1,
                            borderRadius: 6,
                          },
                        ],
                      }}
                      options={barOptions}
                    />
                  </div>
                )}
              </div>
            </DashboardPanel>
          </div>
          <div className="dashboard-chart-tile dashboard-chart-tile--half">
            <DashboardPanel title="Source of candidates (workspace)">
              <div className="dashboard-panel-content">
                {sourceSlicesWorkspace.length === 0 ? (
                  <div className="dashboard-empty">No source data yet.</div>
                ) : (
                  <>
                    <div className="dashboard-chart-shell">
                      <Pie
                        data={{
                          labels: sourceSlicesWorkspace.map(s => s.label),
                          datasets: [
                            {
                              data: sourceSlicesWorkspace.map(s => s.value),
                              backgroundColor: sourceSlicesWorkspace.map(s => s.color),
                              borderColor: '#ffffff',
                              borderWidth: 2,
                            },
                          ],
                        }}
                        options={pieOptions}
                      />
                    </div>
                    <div className="dashboard-insight-row">
                      <div className="dashboard-insight-card">
                        <strong>{sourceSlicesWorkspace.reduce((m, s) => (s.value > m.value ? s : m), sourceSlicesWorkspace[0]).label}</strong>
                        <span>Top channel</span>
                      </div>
                      <div className="dashboard-insight-card">
                        <strong>{sourceSlicesWorkspace.length}</strong>
                        <span>Distinct sources</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </DashboardPanel>
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        <DashboardPanel title="Jobs by status">
          <div className="dashboard-panel-content">
            {jobsLoading ? (
              <LoadingRow />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : (
              <>
                {jobsByStatus.length === 0 ? (
                  <div className="dashboard-empty">No jobs yet.</div>
                ) : (
                  <div className="dashboard-chart-shell dashboard-chart-shell-short">
                    {/* Doughnut: stage mix for jobs */}
                    <Pie
                      data={{
                        labels: jobsByStatus.map(s => s.label),
                        datasets: [
                          {
                            data: jobsByStatus.map(s => s.value),
                            backgroundColor: jobsByStatus.map(s => s.color),
                            borderColor: '#ffffff',
                            borderWidth: 2,
                          },
                        ],
                      }}
                      options={pieOptions}
                    />
                  </div>
                )}
                <div className="dashboard-status-groups">
                  {jobStatusGroups.map(group => (
                    <details key={group.key} className="dashboard-status-group">
                      <summary className="dashboard-status-summary">
                        <div className="dashboard-status-summary-left">
                          <span className="dashboard-legend-dot" style={{ backgroundColor: group.color }} />
                          <span>{group.label}</span>
                        </div>
                        <span className="dashboard-status-count">{group.jobs.length} jobs</span>
                      </summary>
                      <div className="dashboard-status-jobs">
                        {group.jobs.map(job => (
                          <div key={job.id} className="dashboard-job-item">
                            <button
                              type="button"
                              className={`dashboard-job-select ${selectedJobId === String(job.id) ? 'dashboard-job-select-active' : ''}`}
                              onClick={() => setSelectedJobId(String(job.id))}
                            >
                              <strong>{job.title}</strong>
                              <span>
                                {job.department ?? 'General'} • {job.location ?? 'Remote / TBD'}
                              </span>
                            </button>
                            <div className="dashboard-job-meta">
                              <span>{job.open_positions ?? 0} openings</span>
                              <Link className="dashboard-link" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                                Open job
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
                <div className="dashboard-footnote">Select a role to refresh pipeline analytics and the jobs table context.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Selected job pipeline">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <LoadingRow />
            ) : analyticsError ? (
              <ErrorRow msg={analyticsError} />
            ) : (
              <>
                <div className="dashboard-panel-headline">
                  <div>
                    <div className="field dashboard-filter-field dashboard-filter-field-inline">
                      <label htmlFor="dashboard-job-filter">Job</label>
                      <select
                        id="dashboard-job-filter"
                        value={selectedJobId}
                        onChange={e => setSelectedJobId(e.target.value)}
                        disabled={jobsLoading || jobs.length === 0}
                      >
                        {jobs.length === 0 && <option value="">No jobs yet</option>}
                        {jobs.map(job => (
                          <option key={job.id} value={String(job.id)}>
                            {job.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <strong>{selectedJob?.title ?? 'No job selected'}</strong>
                    <span>
                      {selectedJob
                        ? `${selectedJob.department ?? 'General'} • ${selectedJob.location ?? 'Location not set'}`
                        : 'Pick a job to view analytics'}
                    </span>
                  </div>
                  {selectedJob && (
                    <Link className="dashboard-link" to={`/account/${accountId}/jobs/${selectedJob.id}/edit`}>
                      Open job
                    </Link>
                  )}
                </div>
                {analyticsSlices.length === 0 ? (
                  <div className="dashboard-empty">Choose a job to load pipeline stages.</div>
                ) : (
                  <div className="dashboard-chart-shell dashboard-chart-shell-short">
                    <Pie
                      data={{
                        labels: analyticsSlices.map(s => s.label),
                        datasets: [
                          {
                            data: analyticsSlices.map(s => s.value),
                            backgroundColor: analyticsSlices.map(s => s.color),
                            borderColor: '#ffffff',
                            borderWidth: 2,
                          },
                        ],
                      }}
                      options={pieOptions}
                    />
                  </div>
                )}
                <div className="dashboard-microstats">
                  <button type="button" className="dashboard-microstat-button" onClick={() => setActivePipelineModal('applicants')}>
                    <strong>{totalApplicants}</strong>
                    <span>Applicants</span>
                  </button>
                  <button type="button" className="dashboard-microstat-button" onClick={() => setActivePipelineModal('interviews')}>
                    <strong>{scheduledInterviewsScoped}</strong>
                    <span>Interview</span>
                  </button>
                  <button type="button" className="dashboard-microstat-button" onClick={() => setActivePipelineModal('offers')}>
                    <strong>{offerStageCount}</strong>
                    <span>Offers</span>
                  </button>
                  <button type="button" className="dashboard-microstat-button" onClick={() => setActivePipelineModal('hired')}>
                    <strong>{hiredCount}</strong>
                    <span>Hired</span>
                  </button>
                  <div className="dashboard-microstat-card">
                    <strong>{conversionRate}%</strong>
                    <span>Hire conversion</span>
                  </div>
                  <div className="dashboard-microstat-card">
                    <strong>{rejectedCount}</strong>
                    <span>Rejected / withdrawn</span>
                  </div>
                </div>
                <div className="dashboard-footnote">Click a metric card to inspect candidate-level records.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applicant sources (selected job)">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <LoadingRow />
            ) : sourceSlicesJob.length === 0 ? (
              <div className="dashboard-empty">No source data is available for this job.</div>
            ) : (
              <>
                <div className="dashboard-chart-shell dashboard-chart-shell-short">
                  <Pie
                    data={{
                      labels: sourceSlicesJob.map(slice => slice.label),
                      datasets: [
                        {
                          data: sourceSlicesJob.map(slice => slice.value),
                          backgroundColor: sourceSlicesJob.map(slice => slice.color),
                          borderColor: '#ffffff',
                          borderWidth: 2,
                        },
                      ],
                    }}
                    options={pieOptions}
                  />
                </div>
                <div className="dashboard-insight-row">
                  <div className="dashboard-insight-card">
                    <strong>{sourceTopLabelJob}</strong>
                    <span>Top source channel</span>
                  </div>
                  <div className="dashboard-insight-card">
                    <strong>{sourceSlicesJob.length}</strong>
                    <span>Distinct source channels</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Recent activity">
          <div className="dashboard-panel-content">
            {jobsLoading || interviewsLoading ? (
              <LoadingRow />
            ) : activityItems.length === 0 ? (
              <div className="dashboard-empty">No recent activity yet.</div>
            ) : (
              <div className="dashboard-activity-list">
                {activityItems.map(item => (
                  <div key={item.id} className="dashboard-activity-item">
                    <span className="dashboard-activity-dot" aria-hidden />
                    <div className="dashboard-activity-body">
                      <strong>{item.title}</strong>
                      <div className="dashboard-activity-meta">
                        <span>{item.subtitle}</span>
                        <span>{formatRelativeDay(item.at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs overview">
          <div className="dashboard-panel-content">
            {jobsLoading ? (
              <LoadingRow />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">Create a job to see it listed here.</div>
            ) : (
              <div className="dashboard-jobs-table-wrap">
                <table className="dashboard-jobs-table">
                  <thead>
                    <tr>
                      <th>Job title</th>
                      <th>Status</th>
                      <th>Applicants</th>
                      <th>Stage focus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(job => {
                      const n = allApplications.filter(a => a.job_id === job.id).length
                      return (
                        <tr key={job.id}>
                          <td>
                            <Link to={`/account/${accountId}/jobs/${job.id}/edit`}>{job.title}</Link>
                          </td>
                          <td>
                            <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-gray'}`}>{formatDashboardLabel(job.status)}</span>
                          </td>
                          <td>{n}</td>
                          <td>{dominantPipelineStage(job, allApplications)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Upcoming interviews (selected scope)">
          <div className="dashboard-panel-content">
            {interviewsLoading ? (
              <LoadingRow />
            ) : interviewsError ? (
              <ErrorRow msg={interviewsError} />
            ) : filteredUpcomingInterviews.length === 0 ? (
              <div className="dashboard-empty">No interviews match the current job scope.</div>
            ) : (
              <div className="dashboard-schedule">
                {filteredUpcomingInterviews.slice(0, 6).map(row => (
                  <div key={row.id} className="dashboard-schedule-item">
                    <div>
                      <strong>{row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}</strong>
                      <span>{row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`}</span>
                    </div>
                    <div className="dashboard-schedule-meta">
                      <span className={`tag ${STAGE_COLORS[row.status] ?? 'tag-blue'}`}>{formatDashboardLabel(row.status)}</span>
                      <span>{formatDateTimeShort(row.scheduled_at)}</span>
                    </div>
                  </div>
                ))}
                <div className="dashboard-panel-footer">
                  <Link className="dashboard-link" to={`/account/${accountId}/interviews`}>
                    Open interviews board
                  </Link>
                </div>
              </div>
            )}
          </div>
        </DashboardPanel>
      </div>
    </>
  )
}
