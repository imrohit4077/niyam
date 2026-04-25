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
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { DashboardDoughnutChart } from '../components/dashboard/DashboardDoughnutChart'
import { DashboardPanel } from '../components/dashboard/DashboardPanel'
import {
  DashboardSummaryCard,
  SummaryIconBriefcase,
  SummaryIconCalendar,
  SummaryIconCandidates,
  SummaryIconGift,
} from '../components/dashboard/DashboardSummaryCard'
import { FUNNEL_STAGES } from '../components/dashboard/dashboardConstants'
import { formatDashboardLabel, makeDashboardSlices, pctChangeVsPrior } from '../components/dashboard/dashboardUtils'

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

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler)

function LoadingRow() {
  return (
    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      <div className="spinner" style={{ margin: '0 auto 8px', width: 24, height: 24 }} />
      Loading...
    </div>
  )
}

function PanelSkeleton({ chart }: { chart?: boolean }) {
  return (
    <div className="dashboard-panel-skeleton" aria-hidden>
      <div className="dashboard-panel-skeleton-line dashboard-panel-skeleton-line--short" />
      {chart ? <div className="dashboard-panel-skeleton-chart" /> : null}
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
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function monthRange(year: number, month: number) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 1)
  return { start, end }
}

function dominantApplicationStage(apps: Application[]): string {
  if (apps.length === 0) return '—'
  const counts: Record<string, number> = {}
  apps.forEach(a => {
    counts[a.status] = (counts[a.status] ?? 0) + 1
  })
  let best = ''
  let max = 0
  for (const [k, v] of Object.entries(counts)) {
    if (v > max) {
      max = v
      best = k
    }
  }
  return formatDashboardLabel(best)
}

type ActivityItem = {
  id: string
  at: string
  title: string
  subtitle: string
  kind: 'application' | 'interview'
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
    queueMicrotask(() => {
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
  const offerRows = jobApplications.filter(application => application.status === 'offer')
  const hiredRows = jobApplications.filter(application => application.status === 'hired')
  const openJobs = jobs.filter(job => job.status === 'open').length
  const scheduledInterviews = interviewPanelRows.length
  const totalHiredCandidates = allApplications.filter(application => application.status === 'hired').length
  const totalApplicantsAcrossJobs = allApplications.length
  const totalOpenings = jobs.reduce((sum, job) => sum + (job.open_positions ?? 0), 0)
  const openingFillRate = totalOpenings > 0 ? Math.round((totalHiredCandidates / totalOpenings) * 100) : 0
  const avgApplicantsPerJob = jobs.length > 0 ? (totalApplicantsAcrossJobs / jobs.length).toFixed(1) : '0.0'
  const workspaceSourceSlices = makeDashboardSlices(
    Object.entries(
      allApplications.reduce<Record<string, number>>((acc, application) => {
        const source = application.source_type || 'unknown'
        acc[source] = (acc[source] ?? 0) + 1
        return acc
      }, {}),
    ),
  )
  const jobSourceSlices = makeDashboardSlices(
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
  const currentMonthApplications = monthlyTrend[monthlyTrend.length - 1]?.value ?? 0
  const previousMonthApplications = monthlyTrend[monthlyTrend.length - 2]?.value ?? 0
  const monthlyDelta = currentMonthApplications - previousMonthApplications
  const monthlyDeltaLabel = `${monthlyDelta > 0 ? '+' : ''}${monthlyDelta}`
  const maxSourceValue = Math.max(...workspaceSourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = workspaceSourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'

  const now = new Date()
  const thisMonth = monthRange(now.getFullYear(), now.getMonth())
  const lastMonth = monthRange(now.getFullYear(), now.getMonth() - 1)

  const jobsPostedThisMonth = jobs.filter(j => {
    const t = new Date(j.created_at).getTime()
    return t >= thisMonth.start.getTime() && t < thisMonth.end.getTime()
  }).length
  const jobsPostedLastMonth = jobs.filter(j => {
    const t = new Date(j.created_at).getTime()
    return t >= lastMonth.start.getTime() && t < lastMonth.end.getTime()
  }).length

  const offersReleasedThisMonth = allApplications.filter(a => {
    if (a.status !== 'offer') return false
    const t = new Date(a.updated_at).getTime()
    return t >= thisMonth.start.getTime() && t < thisMonth.end.getTime()
  }).length
  const offersReleasedLastMonth = allApplications.filter(a => {
    if (a.status !== 'offer') return false
    const t = new Date(a.updated_at).getTime()
    return t >= lastMonth.start.getTime() && t < lastMonth.end.getTime()
  }).length

  const interviewsBookedThisMonth = interviews.filter(row => {
    const raw = row.scheduled_at ?? row.created_at
    if (!raw) return false
    const t = new Date(raw).getTime()
    return t >= thisMonth.start.getTime() && t < thisMonth.end.getTime()
  }).length
  const interviewsBookedLastMonth = interviews.filter(row => {
    const raw = row.scheduled_at ?? row.created_at
    if (!raw) return false
    const t = new Date(raw).getTime()
    return t >= lastMonth.start.getTime() && t < lastMonth.end.getTime()
  }).length

  const totalOffers = allApplications.filter(a => a.status === 'offer').length

  const candidatesTrend = pctChangeVsPrior(currentMonthApplications, previousMonthApplications)
  const jobsTrend = pctChangeVsPrior(jobsPostedThisMonth, jobsPostedLastMonth)
  const interviewsTrend = pctChangeVsPrior(interviewsBookedThisMonth, interviewsBookedLastMonth)
  const offersTrend = pctChangeVsPrior(offersReleasedThisMonth, offersReleasedLastMonth)

  const applicationsByJobId = useMemo(() => {
    const m = new Map<number, Application[]>()
    allApplications.forEach(app => {
      const list = m.get(app.job_id) ?? []
      list.push(app)
      m.set(app.job_id, list)
    })
    return m
  }, [allApplications])

  const jobTitleById = useMemo(() => {
    const m = new Map<number, string>()
    jobs.forEach(j => m.set(j.id, j.title))
    return m
  }, [jobs])

  const funnelCounts = useMemo(() => {
    return FUNNEL_STAGES.map(stage => ({
      ...stage,
      value: allApplications.filter(a => a.status === stage.key).length,
    }))
  }, [allApplications])

  const funnelMax = Math.max(...funnelCounts.map(f => f.value), 1)

  const jobDistribution = useMemo(() => {
    const counts = jobs.map(job => ({
      job,
      count: applicationsByJobId.get(job.id)?.length ?? 0,
    }))
    counts.sort((a, b) => b.count - a.count)
    return counts.slice(0, 12)
  }, [jobs, applicationsByJobId])

  const activityItems = useMemo((): ActivityItem[] => {
    const jobName = (jobId: number) => jobTitleById.get(jobId) ?? `Job #${jobId}`

    const fromApps: ActivityItem[] = allApplications.slice(0, 80).map(app => ({
      id: `app-${app.id}`,
      at: app.created_at,
      title: `${app.candidate_name || app.candidate_email} applied`,
      subtitle: jobName(app.job_id),
      kind: 'application' as const,
    }))

    const fromInterviews: ActivityItem[] = interviews.map(row => ({
      id: `int-${row.id}`,
      at: row.scheduled_at ?? row.created_at,
      title:
        row.scheduled_at != null
          ? `Interview scheduled — ${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}`
          : `Interview updated — ${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}`,
      subtitle: row.job?.title ?? jobName(row.application?.job_id ?? 0),
      kind: 'interview' as const,
    }))

    return [...fromApps, ...fromInterviews].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 14)
  }, [allApplications, interviews, jobTitleById])

  const funnelBarOptions: ChartOptions<'bar'> = useMemo(
    () => ({
      indexAxis: 'y' as const,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          beginAtZero: true,
          max: funnelMax,
          ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
          grid: { color: 'rgba(148,163,184,0.22)' },
        },
        y: {
          ticks: { color: '#64748b', font: { size: 12 } },
          grid: { display: false },
        },
      },
    }),
    [funnelMax],
  )

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

  const jobBarLabels = useMemo(
    () =>
      jobDistribution.map(j =>
        j.job.title.length > 20 ? `${j.job.title.slice(0, 18)}…` : j.job.title,
      ),
    [jobDistribution],
  )

  const jobBarVerticalOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: {
          color: '#6b7280',
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 35,
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
    },
  }

  const sourceBarOptions: ChartOptions<'bar'> = {
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

  const chartsBooting = jobsLoading || applicationsLoading

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
            Pipeline velocity, candidate volume, and hiring outcomes at a glance. Tune a role below to drill into job-level analytics.
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

      <div className="dashboard-summary-row">
        <DashboardSummaryCard
          label="Total Candidates"
          value={totalApplicantsAcrossJobs.toLocaleString()}
          trend={candidatesTrend}
          trendCaption="applications vs last month"
          icon={<SummaryIconCandidates />}
          loading={applicationsLoading}
        />
        <DashboardSummaryCard
          label="Active Jobs"
          value={openJobs.toLocaleString()}
          trend={jobsTrend}
          trendCaption="new postings vs last month"
          icon={<SummaryIconBriefcase />}
          highlight
          loading={jobsLoading}
        />
        <DashboardSummaryCard
          label="Interviews Scheduled"
          value={workspaceUpcomingInterviews.toLocaleString()}
          trend={interviewsTrend}
          trendCaption="booked vs last month"
          icon={<SummaryIconCalendar />}
          loading={interviewsLoading}
        />
        <DashboardSummaryCard
          label="Offers Released"
          value={totalOffers.toLocaleString()}
          trend={offersTrend}
          trendCaption="in offer stage vs last month"
          icon={<SummaryIconGift />}
          loading={applicationsLoading}
        />
      </div>

      <p className="dashboard-section-eyebrow">Workspace charts</p>
      <div className="dashboard-grid dashboard-charts-grid">
        <section className="panel dashboard-panel dashboard-modern-panel dashboard-panel-span-6">
          <div className="panel-header dashboard-modern-panel-header">
            <span className="panel-header-title">Candidates pipeline funnel</span>
          </div>
          <div className="panel-body dashboard-modern-panel-body">
            <div className="dashboard-panel-content">
              {chartsBooting ? (
                <PanelSkeleton chart />
              ) : funnelCounts.every(f => f.value === 0) ? (
                <div className="dashboard-empty">No applications yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                  <Bar
                    data={{
                      labels: funnelCounts.map(f => f.label),
                      datasets: [
                        {
                          data: funnelCounts.map(f => f.value),
                          backgroundColor: funnelCounts.map((_, i) => `rgba(14, 165, 233, ${0.35 + i * 0.12})`),
                          borderColor: funnelCounts.map(() => '#0ea5e9'),
                          borderWidth: 1,
                          borderRadius: 6,
                          barThickness: 22,
                        },
                      ],
                    }}
                    options={funnelBarOptions}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="panel dashboard-panel dashboard-modern-panel dashboard-panel-span-6">
          <div className="panel-header dashboard-modern-panel-header">
            <span className="panel-header-title">Applications over time</span>
          </div>
          <div className="panel-body dashboard-modern-panel-body">
            <div className="dashboard-panel-content">
              {chartsBooting ? (
                <PanelSkeleton chart />
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
                          borderColor: '#3b82f6',
                          backgroundColor: 'rgba(59,130,246,0.18)',
                          borderWidth: 2,
                          pointRadius: 4,
                          pointHoverRadius: 5,
                          pointBackgroundColor: '#ffffff',
                          pointBorderColor: '#3b82f6',
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
              {!chartsBooting && !monthlyTrend.every(item => item.value === 0) ? (
                <p className="dashboard-chart-footnote">Last 6 months · Net new applications: {monthlyDeltaLabel} vs prior month</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="panel dashboard-panel dashboard-modern-panel dashboard-panel-span-6">
          <div className="panel-header dashboard-modern-panel-header">
            <span className="panel-header-title">Job-wise candidate distribution</span>
          </div>
          <div className="panel-body dashboard-modern-panel-body">
            <div className="dashboard-panel-content">
              {chartsBooting ? (
                <PanelSkeleton chart />
              ) : jobDistribution.length === 0 ? (
                <div className="dashboard-empty">No jobs to chart.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-short">
                  <Bar
                    data={{
                      labels: jobBarLabels,
                      datasets: [
                        {
                          data: jobDistribution.map(j => j.count),
                          backgroundColor: 'rgba(37, 99, 235, 0.55)',
                          borderRadius: 8,
                          maxBarThickness: 40,
                        },
                      ],
                    }}
                    options={jobBarVerticalOptions}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="panel dashboard-panel dashboard-modern-panel dashboard-panel-span-6">
          <div className="panel-header dashboard-modern-panel-header">
            <span className="panel-header-title">Source of candidates</span>
          </div>
          <div className="panel-body dashboard-modern-panel-body">
            <div className="dashboard-panel-content">
              {chartsBooting ? (
                <PanelSkeleton chart />
              ) : workspaceSourceSlices.length === 0 ? (
                <div className="dashboard-empty">No source data yet.</div>
              ) : (
                <>
                  <div className="dashboard-chart-shell dashboard-chart-shell-short">
                    <Pie
                      data={{
                        labels: workspaceSourceSlices.map(s => s.label),
                        datasets: [
                          {
                            data: workspaceSourceSlices.map(s => s.value),
                            backgroundColor: workspaceSourceSlices.map(s => s.color),
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
                      <strong>{sourceTopLabel}</strong>
                      <span>Top source</span>
                    </div>
                    <div className="dashboard-insight-card">
                      <strong>{workspaceSourceSlices.length}</strong>
                      <span>Channels</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      <p className="dashboard-section-eyebrow">Role focus</p>
      <div className="dashboard-grid">
        <DashboardPanel title="Jobs By Status">
          <div className="dashboard-panel-content">
            {jobsLoading ? (
              <PanelSkeleton />
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
                              <span>{job.department ?? 'General'} • {job.location ?? 'Remote / TBD'}</span>
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
                <div className="dashboard-footnote">Select a role to update pipeline analytics and the jobs table context.</div>
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
                      {selectedJob ? `${selectedJob.department ?? 'General'} • ${selectedJob.location ?? 'Location not set'}` : 'Pick a job to view analytics'}
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
                <div className="dashboard-footnote">Click a metric card to inspect candidate-level records in detail.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applicant Sources (Selected Job)">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <LoadingRow />
            ) : jobSourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data is available for this job.</div>
            ) : (
              <>
                <div className="dashboard-chart-shell dashboard-chart-shell-short">
                  <Bar
                    data={{
                      labels: jobSourceSlices.map(slice => slice.label),
                      datasets: [
                        {
                          data: jobSourceSlices.map(slice => slice.value),
                          backgroundColor: jobSourceSlices.map(slice => slice.color),
                          borderRadius: 8,
                          maxBarThickness: 36,
                        },
                      ],
                    }}
                    options={sourceBarOptions}
                  />
                </div>
                <div className="dashboard-insight-row">
                  <div className="dashboard-insight-card">
                    <strong>{jobSourceSlices.reduce((a, b) => (b.value > a.value ? b : a), jobSourceSlices[0]).label}</strong>
                    <span>Top source for role</span>
                  </div>
                  <div className="dashboard-insight-card">
                    <strong>{jobSourceSlices.length}</strong>
                    <span>Channels</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </DashboardPanel>

        <section className="panel dashboard-panel dashboard-modern-panel dashboard-panel-span-6">
          <div className="panel-header dashboard-modern-panel-header">
            <span className="panel-header-title">Activity feed</span>
          </div>
          <div className="panel-body dashboard-modern-panel-body">
            <div className="dashboard-panel-content">
              {applicationsLoading && interviewsLoading ? (
                <PanelSkeleton />
              ) : activityItems.length === 0 ? (
                <div className="dashboard-empty">No recent activity.</div>
              ) : (
                <ul className="dashboard-activity-list">
                  {activityItems.map(item => (
                    <li key={item.id} className="dashboard-activity-item">
                      <span className={`dashboard-activity-dot dashboard-activity-dot--${item.kind}`} aria-hidden />
                      <div className="dashboard-activity-body">
                        <p className="dashboard-activity-title">{item.title}</p>
                        <p className="dashboard-activity-sub">{item.subtitle}</p>
                      </div>
                      <time className="dashboard-activity-time" dateTime={item.at}>
                        {formatRelativeTime(item.at)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

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

        <section className="panel dashboard-panel dashboard-modern-panel dashboard-panel-span-12">
          <div className="panel-header dashboard-modern-panel-header">
            <span className="panel-header-title">Jobs overview</span>
          </div>
          <div className="panel-body dashboard-modern-panel-body">
            <div className="dashboard-panel-content dashboard-panel-content--flush">
              {jobsLoading ? (
                <div className="dashboard-table-skeleton" aria-hidden>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="dashboard-table-skeleton-row" />
                  ))}
                </div>
              ) : jobs.length === 0 ? (
                <div className="dashboard-empty">No jobs yet.</div>
              ) : (
                <div className="dashboard-table-wrap">
                  <table className="dashboard-jobs-table">
                    <thead>
                      <tr>
                        <th>Job title</th>
                        <th>Status</th>
                        <th>Applicants</th>
                        <th>Top stage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map(job => {
                        const apps = applicationsByJobId.get(job.id) ?? []
                        return (
                          <tr key={job.id}>
                            <td>
                              <Link to={`/account/${accountId}/jobs/${job.id}/edit`} className="dashboard-table-job-link">
                                {job.title}
                              </Link>
                            </td>
                            <td>
                              <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                            </td>
                            <td>{apps.length}</td>
                            <td>{dominantApplicationStage(apps)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
