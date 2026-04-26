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
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { STAGE_COLORS, PIPELINE_FUNNEL_STAGES } from '../components/dashboard/dashboardConstants'
import {
  formatDashboardLabel,
  formatDateTimeShort,
  formatRelativeTime,
  makeDashboardSlices,
  trendFromDailyWindows,
  trendFromPreviousValue,
} from '../components/dashboard/dashboardFormat'
import { DashboardPanel } from '../components/dashboard/DashboardPanel'
import { DashboardDoughnutChart } from '../components/dashboard/DashboardDoughnutChart'
import { DashboardSummaryCard } from '../components/dashboard/DashboardSummaryCard'
import { DashboardPanelSkeleton, DashboardTableSkeleton } from '../components/dashboard/DashboardSkeletons'

/* Data fetches reset loading/error synchronously when deps change; same pattern as other pages. */
/* eslint-disable react-hooks/set-state-in-effect */

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
  at: string
  title: string
  detail: string
  tone: 'default' | 'success' | 'warning'
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
        per_page: 24,
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
  const offerRows = jobApplications.filter(application => application.status === 'offer')
  const hiredRows = jobApplications.filter(application => application.status === 'hired')
  const openJobs = jobs.filter(job => job.status === 'open').length

  const workspaceCountsByStatus = useMemo(() => {
    const acc: Record<string, number> = {}
    allApplications.forEach(app => {
      acc[app.status] = (acc[app.status] ?? 0) + 1
    })
    return acc
  }, [allApplications])

  const funnelStageValues = useMemo(() => {
    return PIPELINE_FUNNEL_STAGES.map(stage => workspaceCountsByStatus[stage] ?? 0)
  }, [workspaceCountsByStatus])

  const funnelHasData = funnelStageValues.some(v => v > 0)

  const applicantsPerJob = useMemo(() => {
    const byJob: Record<number, number> = {}
    allApplications.forEach(app => {
      byJob[app.job_id] = (byJob[app.job_id] ?? 0) + 1
    })
    return jobs
      .map(job => ({ job, count: byJob[job.id] ?? 0 }))
      .filter(row => row.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [allApplications, jobs])

  const applicationCountByJobId = useMemo(() => {
    const m = new Map<number, number>()
    for (const a of allApplications) {
      m.set(a.job_id, (m.get(a.job_id) ?? 0) + 1)
    }
    return m
  }, [allApplications])

  const latestApplicationByJobId = useMemo(() => {
    const m = new Map<number, Application>()
    for (const a of allApplications) {
      const prev = m.get(a.job_id)
      if (!prev || new Date(a.updated_at).getTime() > new Date(prev.updated_at).getTime()) {
        m.set(a.job_id, a)
      }
    }
    return m
  }, [allApplications])

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
  const maxSourceValue = Math.max(...sourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'

  const now = useMemo(() => new Date(), [])
  const ms30 = 30 * 86400000
  const openJobsPrevApprox = useMemo(() => {
    const curStart = new Date(now.getTime() - ms30)
    return jobs.filter(j => j.status === 'open' && new Date(j.created_at).getTime() < curStart.getTime()).length
  }, [jobs, now, ms30])

  const trendCandidates = useMemo(
    () => trendFromDailyWindows(allApplications.map(a => a.created_at), 30, now),
    [allApplications, now],
  )
  const trendActiveJobs = useMemo(
    () => trendFromPreviousValue(openJobs, openJobsPrevApprox),
    [openJobs, openJobsPrevApprox],
  )
  const trendInterviews = useMemo(
    () =>
      trendFromDailyWindows(
        interviews.map(r => r.scheduled_at || r.created_at).filter(Boolean) as string[],
        30,
        now,
      ),
    [interviews, now],
  )
  const trendOffers = useMemo(
    () =>
      trendFromDailyWindows(
        allApplications.filter(a => a.status === 'offer').map(a => a.updated_at),
        30,
        now,
      ),
    [allApplications, now],
  )

  const scheduledInterviewsWorkspace = useMemo(
    () =>
      interviews.filter(
        row => row.status === 'scheduled' || row.status === 'pending' || !!row.scheduled_at,
      ).length,
    [interviews],
  )

  const offersReleasedWorkspace = useMemo(
    () => allApplications.filter(a => a.status === 'offer' || a.status === 'hired').length,
    [allApplications],
  )

  const activityItems = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = []
    const recentApps = [...allApplications]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
    recentApps.forEach(app => {
      const jobTitle = jobs.find(j => j.id === app.job_id)?.title ?? `Job #${app.job_id}`
      items.push({
        id: `app-${app.id}`,
        at: app.created_at,
        title: 'Candidate applied',
        detail: `${app.candidate_name || app.candidate_email} · ${jobTitle}`,
        tone: 'default',
      })
    })
    const recentInterviews = [...interviews]
      .filter(r => r.scheduled_at)
      .sort((a, b) => new Date(b.scheduled_at!).getTime() - new Date(a.scheduled_at!).getTime())
      .slice(0, 5)
    recentInterviews.forEach(r => {
      const name = r.application?.candidate_name || r.application?.candidate_email || 'Candidate'
      const jt = r.job?.title ?? 'Interview'
      items.push({
        id: `int-${r.id}`,
        at: r.scheduled_at!,
        title: 'Interview scheduled',
        detail: `${name} · ${jt}`,
        tone: 'warning',
      })
    })
    const hiredRecent = [...allApplications]
      .filter(a => a.status === 'hired')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 4)
    hiredRecent.forEach(app => {
      const jobTitle = jobs.find(j => j.id === app.job_id)?.title ?? `Job #${app.job_id}`
      items.push({
        id: `hire-${app.id}`,
        at: app.updated_at,
        title: 'Candidate hired',
        detail: `${app.candidate_name || app.candidate_email} · ${jobTitle}`,
        tone: 'success',
      })
    })
    return items
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 12)
  }, [allApplications, interviews, jobs])

  const summaryLoading = jobsLoading || applicationsLoading

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
  const funnelOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.parsed.x} candidates`,
        },
      },
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
  const pieOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: 0,
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

  const funnelLabels = PIPELINE_FUNNEL_STAGES.map(s => formatDashboardLabel(s))
  const funnelColors = ['#38bdf8', '#6366f1', '#3b82f6', '#10b981', '#059669']

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
          <p className="dashboard-eyebrow">Overview</p>
          <h2 className="dashboard-title">{user.account?.name ?? 'Your workspace'}</h2>
          <p className="dashboard-subtitle">
            Pipeline health, hiring velocity, and team activity across all open roles — select a job below to drill into
            per-role analytics.
          </p>
        </div>
        <div className="dashboard-hero-meta">
          <div className="dashboard-hero-meta-item">
            <span>Hire rate</span>
            <strong>{conversionRate}%</strong>
            <span className="dashboard-hero-meta-hint">Selected job</span>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Openings fill</span>
            <strong>{openingFillRate}%</strong>
            <span className="dashboard-hero-meta-hint">Hires vs openings</span>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Avg applicants / job</span>
            <strong>{avgApplicantsPerJob}</strong>
            <span className="dashboard-hero-meta-hint">Workspace</span>
          </div>
        </div>
      </div>

      <div className="dashboard-summary-grid">
        <DashboardSummaryCard
          label="Total candidates"
          value={totalApplicantsAcrossJobs.toLocaleString()}
          icon={<IconUsers />}
          trend={trendCandidates}
          trendSentiment="positive_up"
          subtitle="Applications across all jobs"
          highlight
          loading={summaryLoading}
        />
        <DashboardSummaryCard
          label="Active jobs"
          value={openJobs.toLocaleString()}
          icon={<IconBriefcase />}
          trend={trendActiveJobs}
          trendSentiment="neutral"
          subtitle={`${jobs.length} total listings`}
          loading={summaryLoading}
        />
        <DashboardSummaryCard
          label="Interviews scheduled"
          value={scheduledInterviewsWorkspace.toLocaleString()}
          icon={<IconCalendar />}
          trend={trendInterviews}
          trendSentiment="positive_up"
          subtitle="Upcoming & pending on your calendar"
          loading={summaryLoading || interviewsLoading}
        />
        <DashboardSummaryCard
          label="Offers released"
          value={offersReleasedWorkspace.toLocaleString()}
          icon={<IconGift />}
          trend={trendOffers}
          trendSentiment="positive_up"
          subtitle="In offer stage or hired"
          loading={summaryLoading}
        />
      </div>

      <p className="dashboard-trend-note">Trend arrows compare the last 30 days to the prior 30 days.</p>

      <div className="dashboard-grid dashboard-grid-main">
        <div className="dashboard-span-8 dashboard-stack">
          <div className="dashboard-charts-row">
            <DashboardPanel title="Pipeline funnel">
              <div className="dashboard-panel-content">
                {!funnelHasData ? (
                  <div className="dashboard-empty">No candidates in pipeline stages yet.</div>
                ) : (
                  <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                    <Bar
                      data={{
                        labels: funnelLabels,
                        datasets: [
                          {
                            data: funnelStageValues,
                            backgroundColor: funnelColors,
                            borderRadius: 8,
                            maxBarThickness: 28,
                          },
                        ],
                      }}
                      options={funnelOptions}
                    />
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
                      options={lineOptions}
                    />
                  </div>
                )}
                <div className="dashboard-chart-caption">
                  Last 6 months · <strong>{monthlyDeltaLabel}</strong> vs last month ({currentMonthApplications} vs {previousMonthApplications})
                </div>
              </div>
            </DashboardPanel>
          </div>

          <div className="dashboard-charts-row">
            <DashboardPanel title="Candidates by job">
              <div className="dashboard-panel-content">
                {applicantsPerJob.length === 0 ? (
                  <div className="dashboard-empty">No applicant volume yet.</div>
                ) : (
                  <div className="dashboard-chart-shell dashboard-chart-shell-short">
                    <Bar
                      data={{
                        labels: applicantsPerJob.map(r => (r.job.title.length > 22 ? `${r.job.title.slice(0, 20)}…` : r.job.title)),
                        datasets: [
                          {
                            data: applicantsPerJob.map(r => r.count),
                            backgroundColor: '#3b82f6',
                            borderRadius: 8,
                            maxBarThickness: 32,
                          },
                        ],
                      }}
                      options={barOptions}
                    />
                  </div>
                )}
              </div>
            </DashboardPanel>

            <DashboardPanel title="Source of candidates">
              <div className="dashboard-panel-content">
                {workspaceSourceSlices.length === 0 ? (
                  <div className="dashboard-empty">No source data yet.</div>
                ) : (
                  <div className="dashboard-chart-shell dashboard-chart-shell-short">
                    <Doughnut
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
                )}
              </div>
            </DashboardPanel>
          </div>
        </div>

        <div className="dashboard-span-4 dashboard-stack">
          <DashboardPanel title="Recent activity">
            <div className="dashboard-panel-content dashboard-activity-panel">
              {summaryLoading ? (
                <DashboardPanelSkeleton rows={5} />
              ) : activityItems.length === 0 ? (
                <div className="dashboard-empty">No recent activity to show.</div>
              ) : (
                <ul className="dashboard-activity-list">
                  {activityItems.map(item => (
                    <li key={item.id} className={`dashboard-activity-item dashboard-activity-${item.tone}`}>
                      <div className="dashboard-activity-dot" aria-hidden />
                      <div className="dashboard-activity-body">
                        <div className="dashboard-activity-title">{item.title}</div>
                        <div className="dashboard-activity-detail">{item.detail}</div>
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

          <DashboardPanel title="Upcoming interviews">
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
                      Open interviews
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </DashboardPanel>
        </div>

        <div className="dashboard-span-12">
          <DashboardPanel title="Jobs overview">
            <div className="dashboard-panel-content dashboard-jobs-table-wrap">
              {jobsLoading ? (
                <DashboardTableSkeleton cols={4} rows={6} />
              ) : jobsError ? (
                <ErrorRow msg={jobsError} />
              ) : jobs.length === 0 ? (
                <div className="dashboard-empty">No jobs yet. Create a job to start hiring.</div>
              ) : (
                <div className="dashboard-table-scroll">
                  <table className="dashboard-jobs-table">
                    <thead>
                      <tr>
                        <th>Job title</th>
                        <th>Status</th>
                        <th>Applicants</th>
                        <th>Focus stage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map(job => {
                        const count = applicationCountByJobId.get(job.id) ?? 0
                        const topStage = latestApplicationByJobId.get(job.id)
                        return (
                          <tr key={job.id}>
                            <td>
                              <button
                                type="button"
                                className="dashboard-table-job-link"
                                onClick={() => setSelectedJobId(String(job.id))}
                              >
                                {job.title}
                              </button>
                              <div className="dashboard-table-job-sub">{job.department ?? '—'} · {job.location ?? 'Location TBD'}</div>
                            </td>
                            <td>
                              <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                            </td>
                            <td>{count}</td>
                            <td>
                              {topStage ? (
                                <span className={`tag ${STAGE_COLORS[topStage.status] ?? 'tag-blue'}`}>{formatDashboardLabel(topStage.status)}</span>
                              ) : (
                                <span className="dashboard-table-muted">—</span>
                              )}
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
        </div>

        <div className="dashboard-span-6">
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
                  <div className="dashboard-footnote">Select a role to update pipeline and source panels.</div>
                </>
              )}
            </div>
          </DashboardPanel>
        </div>

        <div className="dashboard-span-6">
          <DashboardPanel title="Selected job — pipeline">
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
                    emptyLabel="Choose a job to load pipeline breakdown."
                    legendLabel="Applicants"
                  />
                  <div className="dashboard-microstats">
                    <button type="button" className="dashboard-microstat-button" onClick={() => setActivePipelineModal('applicants')}>
                      <strong>{totalApplicants}</strong>
                      <span>Applicants</span>
                    </button>
                    <button type="button" className="dashboard-microstat-button" onClick={() => setActivePipelineModal('interviews')}>
                      <strong>{interviewPanelRows.length}</strong>
                      <span>Interviews</span>
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
                  <div className="dashboard-footnote">Click a metric to open details.</div>
                </>
              )}
            </div>
          </DashboardPanel>
        </div>

        <div className="dashboard-span-6">
          <DashboardPanel title="Applicant sources (selected job)">
            <div className="dashboard-panel-content">
              {analyticsLoading ? (
                <LoadingRow />
              ) : sourceSlices.length === 0 ? (
                <div className="dashboard-empty">No source data for this job.</div>
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
                      <span>Top source</span>
                    </div>
                    <div className="dashboard-insight-card">
                      <strong>{sourceSlices.length}</strong>
                      <span>Channels</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DashboardPanel>
        </div>
      </div>
    </>
  )
}
