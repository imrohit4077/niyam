/* eslint-disable react-hooks/set-state-in-effect -- dashboard loads remote data on mount / token change */
import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { ChartOptions } from 'chart.js'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import {
  DASHBOARD_CHART_COLORS,
  countInDateRange,
  formatDashboardLabel,
  lastTwoWindowsDays,
  makeDashboardSlices,
  trendFromCounts,
} from '../dashboard/dashboardUtils'
import { DashboardPanel } from '../dashboard/DashboardPanel'
import {
  DashboardApplicationsLineChart,
  DashboardDoughnutChart,
  DashboardFunnelChart,
  DashboardJobsDistributionChart,
  DashboardSourcePieChart,
} from '../dashboard/DashboardCharts'
import { Bar } from 'react-chartjs-2'
import { DashboardSummaryCards, DashboardSummaryCardsSkeleton } from '../dashboard/DashboardSummaryCards'

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

const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

type PipelineModalKind = 'applicants' | 'interviews' | 'offers' | 'hired'

type ActivityItem = {
  id: string
  title: string
  subtitle: string
  at: string
  href?: string
}

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

function formatDateTimeShort(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatRelativeTime(iso: string) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 14) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function primaryStageForJob(apps: Application[]): string {
  const active = apps.filter(a => !['rejected', 'withdrawn'].includes(a.status))
  if (active.length === 0) return '—'
  const counts: Record<string, number> = {}
  for (const a of active) {
    counts[a.status] = (counts[a.status] ?? 0) + 1
  }
  let best = ''
  let bestN = 0
  for (const [k, v] of Object.entries(counts)) {
    if (v > bestN) {
      best = k
      bestN = v
    }
  }
  return formatDashboardLabel(best)
}

function truncateLabel(s: string, max = 26) {
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconBriefcase() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconGift() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}

function ChartGridSkeleton() {
  return (
    <div className="dashboard-charts-grid" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-chart-skeleton-card">
          <span className="dashboard-summary-skel-line dashboard-summary-skel-line-short" />
          <div className="dashboard-chart-skeleton-chart" />
        </div>
      ))}
    </div>
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
  const [applicationsLoading, setApplicationsLoading] = useState(true)
  const [jobApplications, setJobApplications] = useState<Application[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const [activePipelineModal, setActivePipelineModal] = useState<PipelineModalKind | null>(null)

  useEffect(() => {
    let cancelled = false
    setJobsLoading(true)
    setJobsError('')

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
    setInterviewsLoading(true)
    setInterviewsError('')

    interviewsApi
      .myAssignments(token, {
        include_open: true,
        page: 1,
        per_page: 30,
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
    setApplicationsLoading(true)

    applicationsApi
      .list(token)
      .then(rows => {
        if (!cancelled) setAllApplications(rows)
      })
      .catch(() => {
        if (!cancelled) setAllApplications([])
      })
      .finally(() => {
        if (!cancelled) setApplicationsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!selectedJobId) {
      setJobApplications([])
      setAnalyticsError('')
      return
    }

    let cancelled = false
    setAnalyticsLoading(true)
    setAnalyticsError('')

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
  const filteredUpcomingInterviews = [...interviews]
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
  const offerRows = jobApplications.filter(application => application.status === 'offer')
  const hiredRows = jobApplications.filter(application => application.status === 'hired')
  const openJobs = jobs.filter(job => job.status === 'open').length
  const scheduledInterviews = interviewPanelRows.length
  const totalHiredCandidates = allApplications.filter(application => application.status === 'hired').length
  const totalApplicantsAcrossJobs = allApplications.length
  const totalOpenings = jobs.reduce((sum, job) => sum + (job.open_positions ?? 0), 0)
  const openingFillRate = totalOpenings > 0 ? Math.round((totalHiredCandidates / totalOpenings) * 100) : 0
  const avgApplicantsPerJob = jobs.length > 0 ? (totalApplicantsAcrossJobs / jobs.length).toFixed(1) : '0.0'
  const sourceSlices = makeDashboardSlices(
    Object.entries(
      jobApplications.reduce<Record<string, number>>((acc, application) => {
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

  const workspaceStatusCounts = useMemo(() => {
    return allApplications.reduce<Record<string, number>>((acc, application) => {
      acc[application.status] = (acc[application.status] ?? 0) + 1
      return acc
    }, {})
  }, [allApplications])

  const funnelLabels = PIPELINE_FUNNEL_STAGES.map(s => formatDashboardLabel(s))
  const funnelValues = PIPELINE_FUNNEL_STAGES.map(s => workspaceStatusCounts[s] ?? 0)
  const funnelColors = PIPELINE_FUNNEL_STAGES.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length])

  const workspaceSourceSlices = useMemo(
    () =>
      makeDashboardSlices(
        Object.entries(
          allApplications.reduce<Record<string, number>>((acc, application) => {
            const source = application.source_type || 'unknown'
            acc[source] = (acc[source] ?? 0) + 1
            return acc
          }, {}),
        ),
      ),
    [allApplications],
  )

  const jobDistribution = useMemo(() => {
    const counts = new Map<number, number>()
    for (const a of allApplications) {
      counts.set(a.job_id, (counts.get(a.job_id) ?? 0) + 1)
    }
    const rows = jobs
      .map(j => ({ id: j.id, title: j.title, count: counts.get(j.id) ?? 0 }))
      .sort((a, b) => b.count - a.count)
    const top = rows.slice(0, 8)
    const rest = rows.slice(8)
    const otherSum = rest.reduce((s, r) => s + r.count, 0)
    if (otherSum > 0) {
      return {
        labels: [...top.map(r => truncateLabel(r.title)), 'Other roles'],
        values: [...top.map(r => r.count), otherSum],
      }
    }
    return {
      labels: top.map(r => truncateLabel(r.title)),
      values: top.map(r => r.count),
    }
  }, [jobs, allApplications])

  const applicationsByJobId = useMemo(() => {
    const m = new Map<number, Application[]>()
    for (const a of allApplications) {
      const list = m.get(a.job_id) ?? []
      list.push(a)
      m.set(a.job_id, list)
    }
    return m
  }, [allApplications])

  const activityFeed = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = []
    const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`

    for (const app of allApplications) {
      items.push({
        id: `app-${app.id}-created`,
        title: 'Candidate applied',
        subtitle: `${app.candidate_name || app.candidate_email} · ${jobTitle(app.job_id)}`,
        at: app.created_at,
        href: `/account/${accountId}/job-applications/${app.id}`,
      })
      const history = [...(app.stage_history ?? [])].sort(
        (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
      )
      const latest = history.find(h => h.stage && h.stage !== 'applied')
      if (latest) {
        items.push({
          id: `app-${app.id}-stage-${latest.changed_at}`,
          title: `Moved to ${formatDashboardLabel(latest.stage)}`,
          subtitle: `${app.candidate_name || app.candidate_email} · ${jobTitle(app.job_id)}`,
          at: latest.changed_at,
          href: `/account/${accountId}/job-applications/${app.id}`,
        })
      }
    }

    for (const row of interviews) {
      const when = row.scheduled_at || row.created_at
      const cand =
        row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
      const jt = row.job?.title ?? jobTitle(row.application?.job_id ?? 0)
      items.push({
        id: `int-${row.id}`,
        title: row.scheduled_at ? 'Interview scheduled' : 'Interview activity',
        subtitle: `${cand} · ${jt}`,
        at: when,
      })
    }

    return items
      .filter(i => i.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 16)
  }, [allApplications, interviews, jobs, accountId])

  const summaryLoading = jobsLoading || applicationsLoading
  const chartsLoading = jobsLoading || applicationsLoading

  const trendWindowLabel = 'vs prior 30 days'
  const kpiWindows = lastTwoWindowsDays(new Date(), 30)
  const appDates = allApplications.map(a => a.created_at)
  const interviewDates = interviews.map(r => r.scheduled_at || r.created_at)
  const offerDates = allApplications.filter(a => a.status === 'offer').map(a => a.updated_at)
  const jobCreatedDates = jobs.map(j => j.created_at)

  const candCur = countInDateRange(appDates, kpiWindows.currentStart, kpiWindows.currentEnd)
  const candPrev = countInDateRange(appDates, kpiWindows.prevStart, kpiWindows.prevEnd)
  const jobsCur = countInDateRange(jobCreatedDates, kpiWindows.currentStart, kpiWindows.currentEnd)
  const jobsPrev = countInDateRange(jobCreatedDates, kpiWindows.prevStart, kpiWindows.prevEnd)
  const intCur = countInDateRange(interviewDates, kpiWindows.currentStart, kpiWindows.currentEnd)
  const intPrev = countInDateRange(interviewDates, kpiWindows.prevStart, kpiWindows.prevEnd)
  const offerCur = countInDateRange(offerDates, kpiWindows.currentStart, kpiWindows.currentEnd)
  const offerPrev = countInDateRange(offerDates, kpiWindows.prevStart, kpiWindows.prevEnd)

  const summaryKpis = [
    {
      id: 'candidates',
      label: 'Total candidates',
      value: totalApplicantsAcrossJobs,
      icon: <IconUsers />,
      trend: trendFromCounts(candCur, candPrev, trendWindowLabel),
      sublabel: `${avgApplicantsPerJob} avg per job`,
    },
    {
      id: 'jobs',
      label: 'Active jobs',
      value: openJobs,
      icon: <IconBriefcase />,
      trend: trendFromCounts(jobsCur, jobsPrev, trendWindowLabel),
      sublabel: `${jobs.length} total roles in workspace`,
    },
    {
      id: 'interviews',
      label: 'Interviews scheduled',
      value: workspaceUpcomingInterviews,
      icon: <IconCalendar />,
      trend: trendFromCounts(intCur, intPrev, trendWindowLabel),
      sublabel: `${scheduledInterviews} for selected job`,
    },
    {
      id: 'offers',
      label: 'Offers released',
      value: allApplications.filter(a => a.status === 'offer').length,
      icon: <IconGift />,
      trend: trendFromCounts(offerCur, offerPrev, trendWindowLabel),
      sublabel: 'Candidates currently in offer stage',
    },
  ]

  const maxSourceValue = Math.max(...sourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'
  const barOptions: ChartOptions<'bar'> = {
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
            Pipeline velocity, candidate flow, and hiring outcomes across your workspace — refined for day-to-day recruiting
            decisions.
          </p>
        </div>
        <div className="dashboard-hero-meta">
          <div className="dashboard-hero-meta-item">
            <span>Pipeline health</span>
            <strong>{conversionRate >= 25 ? 'Strong' : conversionRate >= 10 ? 'Stable' : 'Needs attention'}</strong>
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

      {summaryLoading ? <DashboardSummaryCardsSkeleton /> : <DashboardSummaryCards items={summaryKpis} />}

      <div className="dashboard-section-label">Workspace analytics</div>
      {chartsLoading ? (
        <ChartGridSkeleton />
      ) : (
        <div className="dashboard-charts-grid">
          <DashboardPanel title="Candidates pipeline (workspace)">
            <div className="dashboard-panel-content">
              {funnelValues.every(v => v === 0) ? (
                <div className="dashboard-empty">No candidates in pipeline stages yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                  <DashboardFunnelChart labels={funnelLabels} values={funnelValues} colors={funnelColors} />
                </div>
              )}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Applications over time">
            <div className="dashboard-panel-content">
              {monthlyTrend.every(item => item.value === 0) ? (
                <div className="dashboard-empty">No recent application activity yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-short">
                  <DashboardApplicationsLineChart labels={monthlyTrend.map(m => m.label)} values={monthlyTrend.map(m => m.value)} />
                </div>
              )}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Job-wise candidate distribution">
            <div className="dashboard-panel-content">
              {jobDistribution.values.every(v => v === 0) ? (
                <div className="dashboard-empty">No applications assigned to jobs yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-short">
                  <DashboardJobsDistributionChart
                    labels={jobDistribution.labels}
                    values={jobDistribution.values}
                    color="#3b82f6"
                  />
                </div>
              )}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Source of candidates (workspace)">
            <div className="dashboard-panel-content">
              {workspaceSourceSlices.length === 0 ? (
                <div className="dashboard-empty">No source data yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-pie">
                  <DashboardSourcePieChart
                    labels={workspaceSourceSlices.map(s => s.label)}
                    values={workspaceSourceSlices.map(s => s.value)}
                    colors={workspaceSourceSlices.map(s => s.color)}
                  />
                </div>
              )}
            </div>
          </DashboardPanel>
        </div>
      )}

      <div className="dashboard-section-label">Drill-in</div>
      <div className="dashboard-grid dashboard-grid-tight-top">
        <DashboardPanel title="Jobs by status">
          <div className="dashboard-panel-content">
            {jobsLoading ? (
              <LoadingRow />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : (
              <>
                <DashboardDoughnutChart slices={jobsByStatus} emptyLabel="No jobs yet." legendLabel="Jobs" />
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
                <div className="dashboard-footnote">Select a role to refresh pipeline and source panels for that job.</div>
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
                <DashboardDoughnutChart
                  slices={analyticsSlices}
                  emptyLabel="Choose a job to load analytics from the backend."
                  legendLabel="Applicants"
                />
                <div className="dashboard-microstats">
                  <button type="button" className="dashboard-microstat-button" onClick={() => setActivePipelineModal('applicants')}>
                    <strong>{totalApplicants}</strong>
                    <span>Applicants</span>
                  </button>
                  <button type="button" className="dashboard-microstat-button" onClick={() => setActivePipelineModal('interviews')}>
                    <strong>{scheduledInterviews}</strong>
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
                    <span>Rejected/withdrawn</span>
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
            ) : sourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data is available for this job.</div>
            ) : (
              <>
                <div className="dashboard-chart-shell dashboard-chart-shell-short">
                  <Bar
                    data={{
                      labels: sourceSlices.map(slice => slice.label),
                      datasets: [
                        {
                          data: sourceSlices.map(slice => slice.value),
                          backgroundColor: sourceSlices.map(slice => slice.color),
                          borderRadius: 8,
                          maxBarThickness: 36,
                        },
                      ],
                    }}
                    options={barOptions}
                  />
                </div>
                <div className="dashboard-insight-row">
                  <div className="dashboard-insight-card">
                    <strong>{sourceTopLabel}</strong>
                    <span>Top source channel</span>
                  </div>
                  <div className="dashboard-insight-card">
                    <strong>{sourceSlices.length}</strong>
                    <span>Distinct source channels</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Activity feed">
          <div className="dashboard-panel-content">
            {applicationsLoading && interviewsLoading ? (
              <div className="dashboard-activity-skeleton">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="dashboard-activity-skeleton-row">
                    <span className="dashboard-summary-skel-line dashboard-summary-skel-line-short" />
                    <span className="dashboard-summary-skel-line" />
                  </div>
                ))}
              </div>
            ) : activityFeed.length === 0 ? (
              <div className="dashboard-empty">No recent activity yet.</div>
            ) : (
              <ul className="dashboard-activity-list">
                {activityFeed.map(item => (
                  <li key={item.id} className="dashboard-activity-item">
                    {item.href ? (
                      <Link to={item.href} className="dashboard-activity-link">
                        <div className="dashboard-activity-dot" aria-hidden />
                        <div className="dashboard-activity-body">
                          <div className="dashboard-activity-title-row">
                            <span className="dashboard-activity-title">{item.title}</span>
                            <time className="dashboard-activity-time" dateTime={item.at}>
                              {formatRelativeTime(item.at)}
                            </time>
                          </div>
                          <span className="dashboard-activity-sub">{item.subtitle}</span>
                        </div>
                      </Link>
                    ) : (
                      <div className="dashboard-activity-static">
                        <div className="dashboard-activity-dot" aria-hidden />
                        <div className="dashboard-activity-body">
                          <div className="dashboard-activity-title-row">
                            <span className="dashboard-activity-title">{item.title}</span>
                            <time className="dashboard-activity-time" dateTime={item.at}>
                              {formatRelativeTime(item.at)}
                            </time>
                          </div>
                          <span className="dashboard-activity-sub">{item.subtitle}</span>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
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

      <DashboardPanel title="Jobs overview">
        <div className="dashboard-panel-content dashboard-panel-flush">
          {jobsLoading ? (
            <LoadingRow />
          ) : jobsError ? (
            <ErrorRow msg={jobsError} />
          ) : jobs.length === 0 ? (
            <div className="dashboard-empty">Create a job to see it listed here.</div>
          ) : (
            <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Job title</th>
                    <th>Status</th>
                    <th>Applicants</th>
                    <th>Stage</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => {
                    const apps = applicationsByJobId.get(job.id) ?? []
                    return (
                      <tr key={job.id}>
                        <td>
                          <button type="button" className="dashboard-table-job" onClick={() => setSelectedJobId(String(job.id))}>
                            {job.title}
                          </button>
                        </td>
                        <td>
                          <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                        </td>
                        <td>{apps.length}</td>
                        <td>{primaryStageForJob(apps)}</td>
                        <td className="dashboard-table-actions">
                          <Link className="dashboard-link dashboard-link-quiet" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                            Open
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DashboardPanel>
    </>
  )
}
