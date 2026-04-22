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
  PieController,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { DashboardStatCard } from '../components/dashboard/DashboardStatCard'
import { IconBriefcase, IconCalendar, IconOffer, IconUsers } from '../components/dashboard/DashboardIcons'
import {
  dominantStage,
  funnelCountsFromApplications,
  inOpenRange,
  trendPercent,
  windowBounds,
} from '../components/dashboard/dashboardMetrics'

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

type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

type PipelineModalKind = 'applicants' | 'interviews' | 'offers' | 'hired'

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  PieController,
)

function LoadingRow() {
  return (
    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      <div className="spinner" style={{ margin: '0 auto 8px', width: 24, height: 24 }} />
      Loading...
    </div>
  )
}

function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-stat-skeleton-grid" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-stat-skeleton-card">
          <div className="dashboard-stat-skeleton-line dashboard-stat-skeleton-line--short" />
          <div className="dashboard-stat-skeleton-line dashboard-stat-skeleton-line--lg" />
          <div className="dashboard-stat-skeleton-line dashboard-stat-skeleton-line--med" />
        </div>
      ))}
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

function DashboardDoughnutChart({
  slices,
  emptyLabel,
  legendLabel,
}: {
  slices: DashboardSlice[]
  emptyLabel: string
  legendLabel: string
}) {
  if (slices.length === 0) return <div className="dashboard-empty">{emptyLabel}</div>

  const chartData = {
    labels: slices.map(slice => slice.label),
    datasets: [
      {
        label: legendLabel,
        data: slices.map(slice => slice.value),
        backgroundColor: slices.map(slice => slice.color),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  }

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' } },
    },
  }

  return (
    <div className="dashboard-chart-shell">
      <Doughnut data={chartData} options={options} />
    </div>
  )
}

function DashboardPanel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`panel dashboard-panel dashboard-modern-panel${className ? ` ${className}` : ''}`}>
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title">{title}</span>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}

function countStageHistoryEvents(applications: Application[], stage: string, from: Date, to: Date) {
  let n = 0
  for (const app of applications) {
    for (const h of app.stage_history ?? []) {
      if (h.stage === stage && inOpenRange(h.changed_at, from, to)) n += 1
    }
  }
  return n
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
  const [applicationsError, setApplicationsError] = useState('')
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
    setApplicationsError('')

    applicationsApi
      .list(token)
      .then(rows => {
        if (!cancelled) setAllApplications(rows)
      })
      .catch(e => {
        if (!cancelled) {
          setAllApplications([])
          setApplicationsError(e instanceof Error ? e.message : 'Failed to load applications')
        }
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
  const maxSourceValue = Math.max(...sourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'

  const { recentStart, recentEnd, priorStart, priorEnd } = windowBounds()
  const activeJobsCount = jobs.filter(j => j.status === 'open').length
  const newOpenJobsRecent = jobs.filter(j => j.status === 'open' && inOpenRange(j.created_at, recentStart, recentEnd)).length
  const newOpenJobsPrior = jobs.filter(j => j.status === 'open' && inOpenRange(j.created_at, priorStart, priorEnd)).length
  const jobsActiveTrend = trendPercent(newOpenJobsRecent, newOpenJobsPrior)

  const candidatesRecent = allApplications.filter(a => inOpenRange(a.created_at, recentStart, recentEnd)).length
  const candidatesPrior = allApplications.filter(a => inOpenRange(a.created_at, priorStart, priorEnd)).length
  const candidatesTrend = trendPercent(candidatesRecent, candidatesPrior)

  const interviewsScheduledRecent = interviews.filter(
    row => (row.scheduled_at && inOpenRange(row.scheduled_at, recentStart, recentEnd)) || inOpenRange(row.created_at, recentStart, recentEnd),
  ).length
  const interviewsScheduledPrior = interviews.filter(
    row => (row.scheduled_at && inOpenRange(row.scheduled_at, priorStart, priorEnd)) || inOpenRange(row.created_at, priorStart, priorEnd),
  ).length
  const interviewsTrend = trendPercent(interviewsScheduledRecent, interviewsScheduledPrior)

  const offersRecent = countStageHistoryEvents(allApplications, 'offer', recentStart, recentEnd)
  const offersPrior = countStageHistoryEvents(allApplications, 'offer', priorStart, priorEnd)
  const offersTrend = trendPercent(offersRecent, offersPrior)

  const workspaceConversionRate =
    totalApplicantsAcrossJobs > 0 ? Math.round((totalHiredCandidates / totalApplicantsAcrossJobs) * 100) : 0

  const funnelWorkspace = funnelCountsFromApplications(allApplications)
  const workspaceSourceSlices = makeDashboardSlices(
    Object.entries(
      allApplications.reduce<Record<string, number>>((acc, application) => {
        const source = application.source_type || 'unknown'
        acc[source] = (acc[source] ?? 0) + 1
        return acc
      }, {}),
    ),
  )

  const applicantsByJobId = allApplications.reduce<Record<number, number>>((acc, a) => {
    acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
    return acc
  }, {})
  const jobBarRows = jobs
    .map(job => ({ job, count: applicantsByJobId[job.id] ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)

  const jobTitleById = useMemo(() => Object.fromEntries(jobs.map(j => [j.id, j.title])), [jobs])

  const activityFeed = useMemo(() => {
    type Row = { id: string; at: number; title: string; detail: string; href?: string }
    const rows: Row[] = []
    for (const app of allApplications) {
      const jt = jobTitleById[app.job_id] ?? `Job #${app.job_id}`
      const who = app.candidate_name || app.candidate_email || 'Candidate'
      rows.push({
        id: `app-created-${app.id}`,
        at: new Date(app.created_at).getTime(),
        title: 'Candidate applied',
        detail: `${who} · ${jt}`,
        href: `/account/${accountId}/job-applications/${app.id}`,
      })
      for (const h of app.stage_history ?? []) {
        rows.push({
          id: `stage-${app.id}-${h.changed_at}-${h.stage}`,
          at: new Date(h.changed_at).getTime(),
          title: `Stage → ${formatDashboardLabel(h.stage)}`,
          detail: `${who} · ${jt}`,
          href: `/account/${accountId}/job-applications/${app.id}`,
        })
      }
    }
    for (const row of interviews) {
      const who = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
      const jt = row.job?.title ?? (row.application?.job_id != null ? jobTitleById[row.application.job_id] ?? `Job #${row.application.job_id}` : 'Interview')
      if (row.scheduled_at) {
        rows.push({
          id: `int-sched-${row.id}-${row.scheduled_at}`,
          at: new Date(row.scheduled_at).getTime(),
          title: 'Interview scheduled',
          detail: `${who} · ${jt}`,
          href: `/account/${accountId}/interviews`,
        })
      } else {
        rows.push({
          id: `int-created-${row.id}`,
          at: new Date(row.created_at).getTime(),
          title: 'Interview activity',
          detail: `${who} · ${formatDashboardLabel(row.status)}`,
          href: `/account/${accountId}/interviews`,
        })
      }
    }
    rows.sort((a, b) => b.at - a.at)
    return rows.slice(0, 20)
  }, [allApplications, interviews, accountId, jobTitleById])

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
        ticks: { color: '#6b7280', font: { size: 11 } },
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
      legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
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
            Beautiful, real-time visibility into pipeline velocity, candidate quality, source performance, and hiring outcomes.
          </p>
        </div>
        <div className="dashboard-hero-meta">
          <div className="dashboard-hero-meta-item">
            <span>Pipeline Health</span>
            <strong>
              {workspaceConversionRate >= 25 ? 'Strong' : workspaceConversionRate >= 10 ? 'Stable' : 'Needs Attention'}
            </strong>
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

      {applicationsError ? <ErrorRow msg={applicationsError} /> : null}

      {jobsLoading || applicationsLoading ? (
        <DashboardKpiSkeleton />
      ) : (
        <div className="dashboard-stat-cards">
          <DashboardStatCard
            label="Total candidates"
            value={totalApplicantsAcrossJobs}
            icon={<IconUsers />}
            trendLabel={candidatesTrend.label}
            trendDirection={candidatesTrend.direction}
            subtle={`${avgApplicantsPerJob} avg per job · ${openJobs} open roles`}
            primary
          />
          <DashboardStatCard
            label="Active jobs"
            value={activeJobsCount}
            icon={<IconBriefcase />}
            trendLabel={jobsActiveTrend.label}
            trendDirection={jobsActiveTrend.direction}
            subtle={`${jobs.length} total listings`}
          />
          <DashboardStatCard
            label="Interviews scheduled"
            value={workspaceUpcomingInterviews}
            icon={<IconCalendar />}
            trendLabel={interviewsTrend.label}
            trendDirection={interviewsTrend.direction}
            subtle={selectedJobId ? `${scheduledInterviews} in selected job scope` : 'Across your workspace'}
          />
          <DashboardStatCard
            label="Offers released"
            value={allApplications.filter(a => a.status === 'offer').length}
            icon={<IconOffer />}
            trendLabel={offersTrend.label}
            trendDirection={offersTrend.direction}
            subtle="Stage moves to offer (30d vs prior 30d)"
          />
        </div>
      )}

      <div className="dashboard-grid">
        <DashboardPanel title="Pipeline funnel (workspace)" className="dashboard-panel--half">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <LoadingRow />
            ) : funnelWorkspace.every(f => f.value === 0) ? (
              <div className="dashboard-empty">No pipeline data yet. Applications will appear here by stage.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                <Bar
                  data={{
                    labels: funnelWorkspace.map(f => f.label),
                    datasets: [
                      {
                        label: 'Candidates',
                        data: funnelWorkspace.map(f => f.value),
                        backgroundColor: funnelWorkspace.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length]),
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

        <DashboardPanel title="Candidate sources (workspace)" className="dashboard-panel--half">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <LoadingRow />
            ) : workspaceSourceSlices.length === 0 ? (
              <div className="dashboard-empty">No applications yet to chart sources.</div>
            ) : (
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
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applications by job" className="dashboard-panel--wide">
          <div className="dashboard-panel-content">
            {jobsLoading || applicationsLoading ? (
              <LoadingRow />
            ) : jobBarRows.length === 0 ? (
              <div className="dashboard-empty">Add jobs and applicants to see distribution.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Bar
                  data={{
                    labels: jobBarRows.map(r => (r.job.title.length > 28 ? `${r.job.title.slice(0, 26)}…` : r.job.title)),
                    datasets: [
                      {
                        label: 'Applicants',
                        data: jobBarRows.map(r => r.count),
                        backgroundColor: '#3b82f6',
                        borderRadius: 6,
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

        <DashboardPanel title="Recent activity">
          <div className="dashboard-panel-content">
            {applicationsLoading && interviewsLoading ? (
              <LoadingRow />
            ) : activityFeed.length === 0 ? (
              <div className="dashboard-empty">Activity from applications and interviews will show here.</div>
            ) : (
              <ul className="dashboard-activity-feed">
                {activityFeed.map(item => (
                  <li key={item.id} className="dashboard-activity-feed__item">
                    <div className="dashboard-activity-feed__dot" aria-hidden />
                    <div className="dashboard-activity-feed__body">
                      {item.href ? (
                        <Link className="dashboard-activity-feed__title" to={item.href}>
                          {item.title}
                        </Link>
                      ) : (
                        <span className="dashboard-activity-feed__title">{item.title}</span>
                      )}
                      <span className="dashboard-activity-feed__detail">{item.detail}</span>
                      <time className="dashboard-activity-feed__time" dateTime={new Date(item.at).toISOString()}>
                        {new Date(item.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs overview" className="dashboard-panel--full">
          <div className="dashboard-panel-content dashboard-panel-content--flush">
            {jobsLoading ? (
              <LoadingRow />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">No jobs yet. Create a role to start hiring.</div>
            ) : (
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Job title</th>
                      <th>Status</th>
                      <th>Applicants</th>
                      <th>Leading stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(job => {
                      const jobApps = allApplications.filter(a => a.job_id === job.id)
                      const stage = dominantStage(jobApps.map(a => a.status))
                      return (
                        <tr key={job.id}>
                          <td>
                            <Link className="dashboard-table__job-link" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                              {job.title}
                            </Link>
                            <div className="dashboard-table__sub">{job.department ?? '—'} · {job.location ?? '—'}</div>
                          </td>
                          <td>
                            <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                          </td>
                          <td>{jobApps.length}</td>
                          <td>
                            {jobApps.length === 0 ? (
                              <span className="dashboard-table__muted">—</span>
                            ) : (
                              <span className={`tag ${STAGE_COLORS[stage] ?? 'tag-blue'}`}>{formatDashboardLabel(stage)}</span>
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
                <div className="dashboard-footnote">Tip: select a role to instantly update pipeline and source analytics.</div>
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
                  <button
                    type="button"
                    className="dashboard-microstat-button"
                    onClick={() => setActivePipelineModal('applicants')}
                  >
                    <strong>{totalApplicants}</strong>
                    <span>Applicants</span>
                  </button>
                  <button
                    type="button"
                    className="dashboard-microstat-button"
                    onClick={() => setActivePipelineModal('interviews')}
                  >
                    <strong>{scheduledInterviews}</strong>
                    <span>Interview</span>
                  </button>
                  <button
                    type="button"
                    className="dashboard-microstat-button"
                    onClick={() => setActivePipelineModal('offers')}
                  >
                    <strong>{offerStageCount}</strong>
                    <span>Offers</span>
                  </button>
                  <button
                    type="button"
                    className="dashboard-microstat-button"
                    onClick={() => setActivePipelineModal('hired')}
                  >
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

        <DashboardPanel title="Application Trend (Last 6 Months)">
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
  )
}
