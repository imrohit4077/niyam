import { useEffect, useMemo, useState } from 'react'
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
  PieController,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { DashboardPanel } from '../components/dashboard/DashboardPanel'
import { DashboardBarChart, DashboardDoughnutChart, DashboardPieChart } from '../components/dashboard/DashboardCharts'
import { dashboardLineOptions, makeDashboardSlices } from '../components/dashboard/dashboardChartHelpers'
import { DASHBOARD_CHART_COLORS, FUNNEL_STAGE_KEYS } from '../components/dashboard/dashboardConstants'
import { formatDashboardLabel, formatDateTimeShort, formatRelativeTime } from '../components/dashboard/dashboardFormat'
import { DashboardSummaryCard } from '../components/dashboard/DashboardSummaryCard'
import { computePeriodTrend } from '../components/dashboard/dashboardSummaryUtils'
import { DashboardKpiSkeleton, DashboardPanelSkeleton } from '../components/dashboard/DashboardSkeleton'

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

type PipelineModalKind = 'applicants' | 'interviews' | 'offers' | 'hired'

ChartJS.register(
  ArcElement,
  PieController,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
)

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

function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconBriefcase() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconGift() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}

type ActivityItem = {
  id: string
  kind: 'application' | 'interview' | 'offer' | 'hire'
  title: string
  subtitle: string
  at: string
  href?: string
}

function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  accountId: string,
  limit = 12,
): ActivityItem[] {
  const items: ActivityItem[] = []

  applications.forEach(app => {
    const name = app.candidate_name || app.candidate_email
    items.push({
      id: `app-${app.id}`,
      kind: 'application',
      title: `Candidate added: ${name}`,
      subtitle: `Application • ${formatDashboardLabel(app.status)}`,
      at: app.created_at,
      href: `/account/${accountId}/job-applications/${app.id}`,
    })
  })

  interviews.forEach(row => {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? 'Role'
    const href = row.application ? `/account/${accountId}/job-applications/${row.application.id}` : undefined
    if (row.scheduled_at) {
      items.push({
        id: `int-${row.id}`,
        kind: 'interview',
        title: `Interview scheduled: ${name}`,
        subtitle: `${jobTitle} • ${formatDateTimeShort(row.scheduled_at)}`,
        at: row.scheduled_at,
        href,
      })
    } else {
      items.push({
        id: `int-${row.id}`,
        kind: 'interview',
        title: `Interview activity: ${name}`,
        subtitle: `${jobTitle} • ${formatDashboardLabel(row.status)}`,
        at: row.updated_at,
        href,
      })
    }
  })

  const offerHire = (app: Application, kind: 'offer' | 'hire') => ({
    id: `${kind}-${app.id}-${app.updated_at}`,
    kind: (kind === 'offer' ? 'offer' : 'hire') as 'offer' | 'hire',
    title:
      kind === 'offer'
        ? `Offer stage: ${app.candidate_name || app.candidate_email}`
        : `Hired: ${app.candidate_name || app.candidate_email}`,
    subtitle: formatDashboardLabel(app.status),
    at: app.updated_at,
    href: `/account/${accountId}/job-applications/${app.id}`,
  })

  applications
    .filter(a => a.status === 'offer' || a.status === 'hired')
    .forEach(app => items.push(offerHire(app, app.status === 'hired' ? 'hire' : 'offer')))

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return items.slice(0, limit)
}

function dominantApplicantStage(counts: Record<string, number>): string {
  const order = ['offer', 'interview', 'screening', 'applied', 'hired', 'rejected', 'withdrawn']
  let best = ''
  let bestN = -1
  for (const key of order) {
    const n = counts[key] ?? 0
    if (n > bestN) {
      bestN = n
      best = key
    }
  }
  if (bestN <= 0) {
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return entries[0]?.[0] ?? '—'
  }
  return best
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
    void queueMicrotask(() => {
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
    void queueMicrotask(() => {
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
    void queueMicrotask(() => {
      if (cancelled) return
      setApplicationsLoading(true)
    })

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
      void queueMicrotask(() => {
        setJobApplications([])
        setAnalyticsError('')
      })
      return
    }

    let cancelled = false
    void queueMicrotask(() => {
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
  )
  const workspaceScheduledCount = workspaceUpcomingInterviews.length
  const offerRows = jobApplications.filter(application => application.status === 'offer')
  const hiredRows = jobApplications.filter(application => application.status === 'hired')
  const openJobs = jobs.filter(job => job.status === 'open').length
  const scheduledInterviews = interviewPanelRows.length
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
  const workspaceApplicationsByStatus = allApplications.reduce<Record<string, number>>((acc, application) => {
    acc[application.status] = (acc[application.status] ?? 0) + 1
    return acc
  }, {})
  const workspaceSourceSlices = makeDashboardSlices(
    Object.entries(
      allApplications.reduce<Record<string, number>>((acc, application) => {
        const source = application.source_type || 'unknown'
        acc[source] = (acc[source] ?? 0) + 1
        return acc
      }, {}),
    ),
  )
  const offersReleasedWorkspace = allApplications.filter(a => a.status === 'offer').length

  const applicantsPerJob = useMemo(() => {
    const byJob = allApplications.reduce<Record<number, number>>((acc, app) => {
      acc[app.job_id] = (acc[app.job_id] ?? 0) + 1
      return acc
    }, {})
    const sorted = [...jobs].sort((a, b) => (byJob[b.id] ?? 0) - (byJob[a.id] ?? 0)).slice(0, 8)
    return sorted.map(job => ({
      job,
      count: byJob[job.id] ?? 0,
    }))
  }, [allApplications, jobs])

  const funnelWorkspace = useMemo(() => {
    return FUNNEL_STAGE_KEYS.map(key => ({
      key,
      label: formatDashboardLabel(key),
      value: workspaceApplicationsByStatus[key] ?? 0,
      color: DASHBOARD_CHART_COLORS[FUNNEL_STAGE_KEYS.indexOf(key) % DASHBOARD_CHART_COLORS.length],
    }))
  }, [workspaceApplicationsByStatus])

  const funnelHasData = funnelWorkspace.some(s => s.value > 0)

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
    return keys.map(item => ({ label: item.label, value: counters[item.key] ?? 0, key: item.key }))
  }, [allApplications])

  const prevMonthKey = monthlyTrend[monthlyTrend.length - 2]?.key
  const currMonthKey = monthlyTrend[monthlyTrend.length - 1]?.key

  const newAppsPrevMonth = useMemo(() => {
    if (!prevMonthKey) return 0
    return allApplications.filter(a => {
      const d = new Date(a.created_at)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return k === prevMonthKey
    }).length
  }, [allApplications, prevMonthKey])

  const newAppsCurrMonth = useMemo(() => {
    if (!currMonthKey) return 0
    return allApplications.filter(a => {
      const d = new Date(a.created_at)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return k === currMonthKey
    }).length
  }, [allApplications, currMonthKey])

  const jobsCreatedCurrMonth = useMemo(() => {
    if (!currMonthKey) return 0
    return jobs.filter(j => {
      const d = new Date(j.created_at)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return k === currMonthKey
    }).length
  }, [jobs, currMonthKey])

  const jobsCreatedPrevMonth = useMemo(() => {
    if (!prevMonthKey) return 0
    return jobs.filter(j => {
      const d = new Date(j.created_at)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return k === prevMonthKey
    }).length
  }, [jobs, prevMonthKey])

  const interviewsPrevMonth = useMemo(() => {
    if (!prevMonthKey) return 0
    return interviews.filter(row => {
      if (!row.scheduled_at) return false
      const d = new Date(row.scheduled_at)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return k === prevMonthKey
    }).length
  }, [interviews, prevMonthKey])

  const interviewsCurrMonth = useMemo(() => {
    if (!currMonthKey) return 0
    return interviews.filter(row => {
      if (!row.scheduled_at) return false
      const d = new Date(row.scheduled_at)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return k === currMonthKey
    }).length
  }, [interviews, currMonthKey])

  const offersPrevMonth = useMemo(() => {
    if (!prevMonthKey) return 0
    return allApplications.filter(a => {
      if (a.status !== 'offer') return false
      const d = new Date(a.updated_at)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return k === prevMonthKey
    }).length
  }, [allApplications, prevMonthKey])

  const offersCurrMonth = useMemo(() => {
    if (!currMonthKey) return 0
    return allApplications.filter(a => {
      if (a.status !== 'offer') return false
      const d = new Date(a.updated_at)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return k === currMonthKey
    }).length
  }, [allApplications, currMonthKey])

  const currentMonthApplications = monthlyTrend[monthlyTrend.length - 1]?.value ?? 0
  const previousMonthApplications = monthlyTrend[monthlyTrend.length - 2]?.value ?? 0
  const monthlyDelta = currentMonthApplications - previousMonthApplications
  const monthlyDeltaLabel = `${monthlyDelta > 0 ? '+' : ''}${monthlyDelta}`
  const maxSourceValue = Math.max(...sourceSlicesJob.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlicesJob.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'

  const activityItems = useMemo(
    () => buildActivityFeed(allApplications, interviews, accountId, 14),
    [allApplications, interviews, accountId],
  )

  const dominantStageLabel = formatDashboardLabel(dominantApplicantStage(workspaceApplicationsByStatus))
  const summaryDataReady = !jobsLoading && !applicationsLoading

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

  const activityIcon = (kind: ActivityItem['kind']) => {
    if (kind === 'application') return '●'
    if (kind === 'interview') return '◆'
    if (kind === 'offer') return '◇'
    return '★'
  }

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
            Pipeline velocity, candidate volume, and hiring outcomes across your workspace—refreshed from live data.
          </p>
        </div>
        <div className="dashboard-hero-meta">
          <div className="dashboard-hero-meta-item">
            <span>Pipeline Health</span>
            <strong>{conversionRate >= 25 ? 'Strong' : conversionRate >= 10 ? 'Stable' : 'Needs Attention'}</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Openings Fill Rate</span>
            <strong>{openingFillRate}%</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Avg Applicants / Job</span>
            <strong>{avgApplicantsPerJob}</strong>
          </div>
        </div>
      </div>

      {!summaryDataReady ? (
        <DashboardKpiSkeleton />
      ) : (
        <div className="dashboard-summary-grid">
          <DashboardSummaryCard
            label="Total Candidates"
            value={totalApplicantsAcrossJobs.toLocaleString()}
            icon={<IconUsers />}
            trend={computePeriodTrend(newAppsCurrMonth, newAppsPrevMonth)}
            subtitle={`${monthlyDeltaLabel} vs last month (new applications)`}
            primary
          />
          <DashboardSummaryCard
            label="Active Jobs"
            value={openJobs.toLocaleString()}
            icon={<IconBriefcase />}
            trend={computePeriodTrend(jobsCreatedCurrMonth, jobsCreatedPrevMonth)}
            subtitle={`${jobs.length} total listings • new roles MoM`}
          />
          <DashboardSummaryCard
            label="Interviews Scheduled"
            value={workspaceScheduledCount.toLocaleString()}
            icon={<IconCalendar />}
            trend={computePeriodTrend(interviewsCurrMonth, interviewsPrevMonth)}
            subtitle="Scheduled & pending slots in your queue"
          />
          <DashboardSummaryCard
            label="Offers Released"
            value={offersReleasedWorkspace.toLocaleString()}
            icon={<IconGift />}
            trend={computePeriodTrend(offersCurrMonth, offersPrevMonth)}
            subtitle="Candidates currently in offer stage"
          />
        </div>
      )}

      <div className="dashboard-kpi-grid dashboard-kpi-grid-secondary">
        <article className="dashboard-kpi-card dashboard-kpi-primary">
          <span>Jobs Listed</span>
          <strong>{jobs.length}</strong>
          <p>{openJobs} currently open roles</p>
        </article>
        <article className="dashboard-kpi-card">
          <span>Upcoming Interviews</span>
          <strong>{workspaceScheduledCount}</strong>
          <p>{scheduledInterviews} for selected job scope</p>
        </article>
        <article className="dashboard-kpi-card">
          <span>Total Hired</span>
          <strong>{totalHiredCandidates}</strong>
          <p>{openingFillRate}% fill rate across openings</p>
        </article>
        <article className="dashboard-kpi-card">
          <span>Monthly Pipeline Delta</span>
          <strong>{monthlyDeltaLabel}</strong>
          <p>
            {currentMonthApplications} this month vs {previousMonthApplications} prior month
          </p>
        </article>
        <article className="dashboard-kpi-card">
          <span>Total Applicants</span>
          <strong>{totalApplicantsAcrossJobs}</strong>
          <p>{avgApplicantsPerJob} average per job</p>
        </article>
      </div>

      <div className="dashboard-grid">
        <DashboardPanel title="Pipeline Funnel (Workspace)">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <DashboardPanelSkeleton rows={3} />
            ) : !funnelHasData ? (
              <div className="dashboard-empty">No pipeline data yet. Applications will appear here by stage.</div>
            ) : (
              <DashboardBarChart
                labels={funnelWorkspace.map(s => s.label)}
                data={funnelWorkspace.map(s => s.value)}
                colors={funnelWorkspace.map(s => s.color)}
                short
              />
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applications Over Time">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <DashboardPanelSkeleton rows={3} />
            ) : monthlyTrend.every(item => item.value === 0) ? (
              <div className="dashboard-empty">No recent application activity yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Line
                  data={{
                    labels: monthlyTrend.map(item => item.label),
                    datasets: [
                      {
                        data: monthlyTrend.map(item => item.value),
                        borderColor: '#0ea5e9',
                        backgroundColor: 'rgba(14,165,233,0.12)',
                        borderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: '#0ea5e9',
                        pointBorderWidth: 2,
                        fill: true,
                        tension: 0.32,
                      },
                    ],
                  }}
                  options={dashboardLineOptions}
                />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Candidates by Job">
          <div className="dashboard-panel-content">
            {applicationsLoading || jobsLoading ? (
              <DashboardPanelSkeleton rows={3} />
            ) : applicantsPerJob.length === 0 ? (
              <div className="dashboard-empty">Add jobs to see applicant distribution.</div>
            ) : (
              <DashboardBarChart
                labels={applicantsPerJob.map(({ job }) => (job.title.length > 28 ? `${job.title.slice(0, 26)}…` : job.title))}
                data={applicantsPerJob.map(({ count }) => count)}
                colors={applicantsPerJob.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length])}
                horizontal
                short
              />
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Source of Candidates (Workspace)">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <DashboardPanelSkeleton rows={3} />
            ) : workspaceSourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data yet.</div>
            ) : (
              <DashboardPieChart slices={workspaceSourceSlices} emptyLabel="No source data." legendLabel="Sources" />
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Recent Activity">
          <div className="dashboard-panel-content">
            {applicationsLoading && interviewsLoading ? (
              <DashboardPanelSkeleton rows={5} />
            ) : activityItems.length === 0 ? (
              <div className="dashboard-empty">Activity will show as you add candidates and schedule interviews.</div>
            ) : (
              <ul className="dashboard-activity-list">
                {activityItems.map(item => (
                  <li key={item.id} className="dashboard-activity-item">
                    <span className={`dashboard-activity-icon dashboard-activity-${item.kind}`} aria-hidden>
                      {activityIcon(item.kind)}
                    </span>
                    <div className="dashboard-activity-body">
                      {item.href ? (
                        <Link to={item.href} className="dashboard-activity-title">
                          {item.title}
                        </Link>
                      ) : (
                        <span className="dashboard-activity-title">{item.title}</span>
                      )}
                      <span className="dashboard-activity-sub">{item.subtitle}</span>
                    </div>
                    <time className="dashboard-activity-time" dateTime={item.at}>
                      {formatRelativeTime(item.at)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs Overview">
          <div className="dashboard-panel-content dashboard-table-wrap">
            {jobsLoading ? (
              <DashboardPanelSkeleton rows={4} />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">No jobs yet. Create a role to start tracking applicants.</div>
            ) : (
              <table className="dashboard-jobs-table">
                <thead>
                  <tr>
                    <th>Job title</th>
                    <th>Status</th>
                    <th className="dashboard-jobs-table-num">Applicants</th>
                    <th>Stage focus</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => {
                    const jobApps = allApplications.filter(a => a.job_id === job.id)
                    const bySt = jobApps.reduce<Record<string, number>>((acc, a) => {
                      acc[a.status] = (acc[a.status] ?? 0) + 1
                      return acc
                    }, {})
                    const stage = formatDashboardLabel(dominantApplicantStage(bySt))
                    return (
                      <tr key={job.id}>
                        <td>
                          <Link to={`/account/${accountId}/jobs/${job.id}/edit`} className="dashboard-jobs-table-title">
                            {job.title}
                          </Link>
                          <div className="dashboard-jobs-table-meta">{job.department ?? 'General'}</div>
                        </td>
                        <td>
                          <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                        </td>
                        <td className="dashboard-jobs-table-num">{jobApps.length}</td>
                        <td>
                          <span className="dashboard-jobs-table-stage">{jobApps.length ? stage : '—'}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs By Status">
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
                <div className="dashboard-footnote">Select a role to update job-scoped analytics below.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Selected Job Pipeline">
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
                    <span>Hire Conversion</span>
                  </div>
                  <div className="dashboard-microstat-card">
                    <strong>{rejectedCount}</strong>
                    <span>Rejected/Withdrawn</span>
                  </div>
                </div>
                <div className="dashboard-footnote">Click a metric card to inspect candidate-level records.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applicant Sources (Selected Job)">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <LoadingRow />
            ) : sourceSlicesJob.length === 0 ? (
              <div className="dashboard-empty">No source data is available for this job.</div>
            ) : (
              <>
                <DashboardBarChart
                  labels={sourceSlicesJob.map(slice => slice.label)}
                  data={sourceSlicesJob.map(slice => slice.value)}
                  colors={sourceSlicesJob.map(slice => slice.color)}
                  short
                />
                <div className="dashboard-insight-row">
                  <div className="dashboard-insight-card">
                    <strong>{sourceTopLabel}</strong>
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

        <DashboardPanel title="Upcoming Interviews (Selected Scope)">
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

      <p className="dashboard-workspace-hint">
        Workspace snapshot: dominant applicant stage <strong>{dominantStageLabel}</strong> across all open pipelines.
      </p>
    </>
  )
}
