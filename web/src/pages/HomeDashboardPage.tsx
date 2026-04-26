/* Data-fetch effects intentionally set loading/error synchronously before awaiting the network. */
/* eslint-disable react-hooks/set-state-in-effect */
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
import { Bar, Line } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { DashboardDoughnutChart, type DashboardSlice } from '../components/dashboard/DashboardDoughnutChart'
import { DashboardPanel } from '../components/dashboard/DashboardPanel'
import {
  CandidatesIcon,
  DashboardSummaryCard,
  InterviewsIcon,
  JobsIcon,
  OffersIcon,
} from '../components/dashboard/DashboardSummaryCard'
import { DashboardActivityFeed, type ActivityFeedItem } from '../components/dashboard/DashboardActivityFeed'
import { DashboardJobsOverviewTable } from '../components/dashboard/DashboardJobsOverviewTable'
import {
  countBetween,
  formatDashboardLabel,
  formatDateTimeShort,
  periodTrend,
} from '../components/dashboard/dashboardHelpers'

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

const DASHBOARD_CHART_COLORS = ['#00b4d8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6']

const FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
const FUNNEL_LABELS = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired']

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

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-hidden>
      <div className="dashboard-skeleton-hero">
        <div className="dashboard-skeleton-line dashboard-skeleton-line--lg" />
        <div className="dashboard-skeleton-line dashboard-skeleton-line--md" />
      </div>
      <div className="dashboard-skeleton-kpis">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dashboard-skeleton-kpi" />
        ))}
      </div>
      <div className="dashboard-skeleton-panels">
        <div className="dashboard-skeleton-panel" />
        <div className="dashboard-skeleton-panel" />
      </div>
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

function rolling30DayWindows() {
  const end = new Date()
  const currentStart = new Date(end)
  currentStart.setDate(currentStart.getDate() - 30)
  const previousStart = new Date(currentStart)
  previousStart.setDate(previousStart.getDate() - 30)
  return { end, currentStart, previousStart, previousEnd: currentStart }
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
        per_page: 12,
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
  const workspaceUpcomingInterviews = interviews.filter(
    row => row.status === 'scheduled' || row.status === 'pending' || !!row.scheduled_at,
  ).length
  const offerRows = jobApplications.filter(application => application.status === 'offer')
  const hiredRows = jobApplications.filter(application => application.status === 'hired')
  const openJobs = jobs.filter(job => job.status === 'open').length
  const scheduledInterviews = interviewPanelRows.length
  const totalHiredCandidates = allApplications.filter(application => application.status === 'hired').length
  const totalApplicantsAcrossJobs = allApplications.length
  const workspaceOffersCount = allApplications.filter(a => a.status === 'offer').length
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
  const currentMonthApplications = monthlyTrend[monthlyTrend.length - 1]?.value ?? 0
  const previousMonthApplications = monthlyTrend[monthlyTrend.length - 2]?.value ?? 0
  const monthlyDelta = currentMonthApplications - previousMonthApplications
  const monthlyDeltaLabel = `${monthlyDelta > 0 ? '+' : ''}${monthlyDelta}`
  const maxSourceValue = Math.max(...sourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'

  const { end, currentStart, previousStart, previousEnd } = useMemo(() => rolling30DayWindows(), [])

  const applicationsTrend = useMemo(() => {
    const cur = countBetween(allApplications, a => a.created_at, currentStart, end)
    const prev = countBetween(allApplications, a => a.created_at, previousStart, previousEnd)
    return periodTrend(cur, prev)
  }, [allApplications, currentStart, end, previousStart, previousEnd])

  const jobsTrend = useMemo(() => {
    const cur = countBetween(jobs, j => j.created_at, currentStart, end)
    const prev = countBetween(jobs, j => j.created_at, previousStart, previousEnd)
    return periodTrend(cur, prev)
  }, [jobs, currentStart, end, previousStart, previousEnd])

  const interviewsTrend = useMemo(() => {
    const dated = interviews.filter(
      row =>
        (row.status === 'scheduled' || row.status === 'pending') &&
        row.scheduled_at &&
        new Date(row.scheduled_at).getTime() >= previousStart.getTime() &&
        new Date(row.scheduled_at).getTime() < end.getTime(),
    )
    const cur = dated.filter(row => countBetween([row], r => r.scheduled_at!, currentStart, end) === 1).length
    const prev = dated.filter(row => countBetween([row], r => r.scheduled_at!, previousStart, previousEnd) === 1).length
    return periodTrend(cur, prev)
  }, [interviews, currentStart, end, previousStart, previousEnd])

  const offersTrend = useMemo(() => {
    const offers = allApplications.filter(a => a.status === 'offer')
    const cur = offers.filter(a => countBetween([a], x => x.updated_at, currentStart, end) === 1).length
    const prev = offers.filter(a => countBetween([a], x => x.updated_at, previousStart, previousEnd) === 1).length
    return periodTrend(cur, prev)
  }, [allApplications, currentStart, end, previousStart, previousEnd])

  const funnelCounts = useMemo(() => {
    const acc: Record<string, number> = {}
    FUNNEL_STAGES.forEach(s => {
      acc[s] = 0
    })
    allApplications.forEach(a => {
      if (acc[a.status] !== undefined) acc[a.status] += 1
    })
    return FUNNEL_STAGES.map(s => acc[s] ?? 0)
  }, [allApplications])

  const workspaceSourceSlices: DashboardSlice[] = useMemo(
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

  const applicantsByJobId = useMemo(() => {
    const m: Record<number, number> = {}
    allApplications.forEach(a => {
      m[a.job_id] = (m[a.job_id] ?? 0) + 1
    })
    return m
  }, [allApplications])

  const dominantStatusByJobId = useMemo(() => {
    const m: Record<number, Record<string, number>> = {}
    allApplications.forEach(a => {
      if (!m[a.job_id]) m[a.job_id] = {}
      m[a.job_id][a.status] = (m[a.job_id][a.status] ?? 0) + 1
    })
    const out: Record<number, string | null> = {}
    Object.entries(m).forEach(([jobId, counts]) => {
      let best: string | null = null
      let bestN = 0
      Object.entries(counts).forEach(([st, n]) => {
        if (n > bestN) {
          bestN = n
          best = st
        }
      })
      out[Number(jobId)] = best
    })
    return out
  }, [allApplications])

  const jobDistribution = useMemo(() => {
    const rows = jobs
      .map(job => ({
        id: job.id,
        title: job.title.length > 28 ? `${job.title.slice(0, 26)}…` : job.title,
        count: applicantsByJobId[job.id] ?? 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
    return rows
  }, [jobs, applicantsByJobId])

  const activityItems: ActivityFeedItem[] = useMemo(() => {
    const applied = [...allApplications]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8)
      .map(
        (a): ActivityFeedItem => ({
          id: `app-${a.id}`,
          at: a.created_at,
          title: 'Candidate applied',
          meta: `${a.candidate_name || a.candidate_email}`,
        }),
      )
    const scheduled = interviews
      .filter(row => row.scheduled_at)
      .sort((a, b) => new Date(b.scheduled_at!).getTime() - new Date(a.scheduled_at!).getTime())
      .slice(0, 6)
      .map(
        (row): ActivityFeedItem => ({
          id: `int-${row.id}`,
          at: row.scheduled_at!,
          title: 'Interview scheduled',
          meta: row.application?.candidate_name || row.application?.candidate_email || 'Candidate',
        }),
      )
    const hires = [...allApplications]
      .filter(a => a.status === 'hired')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5)
      .map(
        (a): ActivityFeedItem => ({
          id: `hire-${a.id}`,
          at: a.updated_at,
          title: 'Candidate hired',
          meta: a.candidate_name || a.candidate_email,
        }),
      )
    return [...applied, ...scheduled, ...hires]
      .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
      .slice(0, 12)
  }, [allApplications, interviews])

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

  const funnelBarOptions: ChartOptions<'bar'> = {
    ...barOptions,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#475569', font: { size: 11 } },
        grid: { display: false },
      },
    },
  }

  const jobBarOptions: ChartOptions<'bar'> = {
    ...barOptions,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#475569', font: { size: 10 }, autoSkip: false },
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

  const initialDashboardLoading = jobsLoading && applicationsLoading

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

      {initialDashboardLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="dashboard-hero dashboard-hero-modern">
            <div className="dashboard-hero-main">
              <p className="dashboard-eyebrow">Talent intelligence</p>
              <h2 className="dashboard-title">{user.account?.name ?? 'Your Workspace'} Hiring Overview</h2>
              <p className="dashboard-subtitle">
                Pipeline velocity, candidate flow, and hiring outcomes across your open roles — updated from live workspace data.
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

          <div className="dashboard-kpi-grid dashboard-kpi-grid--summary">
            <DashboardSummaryCard
              label="Total candidates"
              value={totalApplicantsAcrossJobs}
              icon={<CandidatesIcon />}
              trend={applicationsTrend}
              trendCaption="Applications (last 30d vs prior)"
            />
            <DashboardSummaryCard
              label="Active jobs"
              value={openJobs}
              icon={<JobsIcon />}
              trend={jobsTrend}
              trendCaption="New roles created (30d vs prior)"
            />
            <DashboardSummaryCard
              label="Interviews scheduled"
              value={workspaceUpcomingInterviews}
              icon={<InterviewsIcon />}
              trend={interviewsTrend}
              trendCaption="Dated interviews (30d vs prior)"
            />
            <DashboardSummaryCard
              label="Offers released"
              value={workspaceOffersCount}
              icon={<OffersIcon />}
              trend={offersTrend}
              trendCaption="Moved to offer (30d vs prior)"
            />
          </div>

          <p className="dashboard-kpi-context" aria-live="polite">
            Selected job: <strong>{selectedJob?.title ?? 'None'}</strong>
            {' · '}
            MoM applications {monthlyDeltaLabel} ({currentMonthApplications} vs {previousMonthApplications})
          </p>

          <div className="dashboard-grid">
            <DashboardPanel title="Pipeline funnel (workspace)">
              <div className="dashboard-panel-content">
                {applicationsLoading ? (
                  <LoadingRow />
                ) : funnelCounts.every(n => n === 0) ? (
                  <div className="dashboard-empty">No candidates in funnel stages yet.</div>
                ) : (
                  <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                    <Bar
                      data={{
                        labels: FUNNEL_LABELS,
                        datasets: [
                          {
                            label: 'Candidates',
                            data: funnelCounts,
                            backgroundColor: FUNNEL_STAGES.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length]),
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

            <DashboardPanel title="Application trend (6 months)">
              <div className="dashboard-panel-content">
                {applicationsLoading ? (
                  <LoadingRow />
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
              </div>
            </DashboardPanel>

            <DashboardPanel title="Candidates by job">
              <div className="dashboard-panel-content">
                {applicationsLoading || jobsLoading ? (
                  <LoadingRow />
                ) : jobDistribution.length === 0 ? (
                  <div className="dashboard-empty">No applicant distribution yet.</div>
                ) : (
                  <div className="dashboard-chart-shell dashboard-chart-shell-jobs-bar">
                    <Bar
                      data={{
                        labels: jobDistribution.map(j => j.title),
                        datasets: [
                          {
                            data: jobDistribution.map(j => j.count),
                            backgroundColor: '#2563eb',
                            borderRadius: 6,
                            maxBarThickness: 22,
                          },
                        ],
                      }}
                      options={jobBarOptions}
                    />
                  </div>
                )}
              </div>
            </DashboardPanel>

            <DashboardPanel title="Source of candidates (workspace)">
              <div className="dashboard-panel-content">
                {applicationsLoading ? (
                  <LoadingRow />
                ) : (
                  <DashboardDoughnutChart
                    slices={workspaceSourceSlices}
                    emptyLabel="No applications with source data yet."
                    legendLabel="Source"
                  />
                )}
              </div>
            </DashboardPanel>

            <DashboardPanel title="Recent activity">
              <div className="dashboard-panel-content">
                {applicationsLoading && interviewsLoading ? (
                  <LoadingRow />
                ) : (
                  <DashboardActivityFeed items={activityItems} />
                )}
              </div>
            </DashboardPanel>

            <DashboardPanel title="Jobs overview">
              <div className="dashboard-panel-content dashboard-panel-content--flush">
                {jobsLoading ? (
                  <LoadingRow />
                ) : jobsError ? (
                  <ErrorRow msg={jobsError} />
                ) : (
                  <DashboardJobsOverviewTable
                    jobs={jobs}
                    applicantsByJobId={applicantsByJobId}
                    dominantStatusByJobId={dominantStatusByJobId}
                    accountId={accountId}
                    selectedJobId={selectedJobId}
                    onSelectJob={setSelectedJobId}
                  />
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
                    <div className="dashboard-footnote">Tip: select a role to update job-scoped analytics below.</div>
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
                    <div className="dashboard-footnote">Click a metric card to inspect candidate-level records in detail.</div>
                  </>
                )}
              </div>
            </DashboardPanel>

            <DashboardPanel title="Applicant Sources (Selected Job)">
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
        </>
      )}
    </>
  )
}
