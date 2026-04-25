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
  type ChartOptions,
} from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import {
  DashboardDoughnutChart,
  DashboardPanel,
  DashboardSummaryCard,
  IconBriefcase,
  IconCalendar,
  IconGift,
  IconUsers,
  PIPELINE_FUNNEL_ORDER,
  STAGE_COLORS,
  countInCalendarMonth,
  formatDashboardLabel,
  formatDateTimeShort,
  formatRelativeTime,
  makeDashboardSlices,
  monthOverMonthPct,
} from '../components/dashboard'

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

type PipelineModalKind = 'applicants' | 'interviews' | 'offers' | 'hired'

function LoadingRow() {
  return (
    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      <div className="spinner" style={{ margin: '0 auto 8px', width: 24, height: 24 }} />
      Loading...
    </div>
  )
}

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return <div className="dashboard-chart-skeleton" style={{ height }} aria-hidden />
}

function SummaryCardsSkeleton() {
  return (
    <div className="dashboard-summary-skeleton-row" aria-busy="true" aria-label="Loading summary">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="dashboard-summary-card-skeleton" />
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

type ActivityItem = {
  id: string
  at: string
  title: string
  subtitle: string
  href?: string
}

function buildActivityFeed(
  applications: Application[],
  interviewRows: InterviewAssignmentRow[],
  accountId: string,
): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const app of applications) {
    const name = app.candidate_name || app.candidate_email || 'Candidate'
    const hist = app.stage_history
    if (hist && hist.length > 0) {
      const last = hist[hist.length - 1]
      items.push({
        id: `app-${app.id}-stage-${last.changed_at}`,
        at: last.changed_at,
        title: `${name} moved to ${formatDashboardLabel(last.stage)}`,
        subtitle: `Application #${app.id}`,
        href: `/account/${accountId}/job-applications/${app.id}`,
      })
    } else {
      items.push({
        id: `app-${app.id}-created`,
        at: app.created_at,
        title: `${name} applied`,
        subtitle: `Application #${app.id}`,
        href: `/account/${accountId}/job-applications/${app.id}`,
      })
    }
  }

  for (const row of interviewRows) {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const when = row.scheduled_at || row.updated_at
    items.push({
      id: `int-${row.id}`,
      at: when,
      title: row.scheduled_at ? `Interview scheduled for ${name}` : `Interview updated for ${name}`,
      subtitle: row.job?.title ? row.job.title : `Job #${row.application?.job_id ?? '—'}`,
    })
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 14)
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

  const funnelStageCounts = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const s of PIPELINE_FUNNEL_ORDER) acc[s] = 0
    for (const app of allApplications) {
      if (acc[app.status] !== undefined) acc[app.status] += 1
    }
    return PIPELINE_FUNNEL_ORDER.map(stage => ({
      stage,
      label: formatDashboardLabel(stage),
      count: acc[stage] ?? 0,
    }))
  }, [allApplications])

  const applicantsByJobId = useMemo(() => {
    const m = new Map<number, number>()
    for (const app of allApplications) {
      m.set(app.job_id, (m.get(app.job_id) ?? 0) + 1)
    }
    return m
  }, [allApplications])

  const jobDistributionBars = useMemo(() => {
    const truncate = (t: string, max = 28) => (t.length > max ? `${t.slice(0, max - 1)}…` : t)
    return jobs
      .map(job => ({ job, count: applicantsByJobId.get(job.id) ?? 0, shortTitle: truncate(job.title) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [jobs, applicantsByJobId])

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
  const maxSourceValue = Math.max(...sourceSlicesJob.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlicesJob.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'

  const candThisMonth = countInCalendarMonth(allApplications, a => a.created_at, 0)
  const candLastMonth = countInCalendarMonth(allApplications, a => a.created_at, 1)
  const candMom = monthOverMonthPct(candThisMonth, candLastMonth)

  const jobsThisMonth = countInCalendarMonth(jobs, j => j.created_at, 0)
  const jobsLastMonth = countInCalendarMonth(jobs, j => j.created_at, 1)
  const jobsMom = monthOverMonthPct(jobsThisMonth, jobsLastMonth)

  const intThisMonth = countInCalendarMonth(interviews, r => r.scheduled_at || r.created_at, 0)
  const intLastMonth = countInCalendarMonth(interviews, r => r.scheduled_at || r.created_at, 1)
  const intMom = monthOverMonthPct(intThisMonth, intLastMonth)

  const offersWorkspace = allApplications.filter(a => a.status === 'offer').length
  const offersThisMonth = countInCalendarMonth(
    allApplications.filter(a => a.status === 'offer'),
    a => a.updated_at,
    0,
  )
  const offersLastMonth = countInCalendarMonth(
    allApplications.filter(a => a.status === 'offer'),
    a => a.updated_at,
    1,
  )
  const offersMom = monthOverMonthPct(offersThisMonth, offersLastMonth)

  const activityItems = useMemo(
    () => buildActivityFeed(allApplications, interviews, accountId),
    [allApplications, interviews, accountId],
  )

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
        ticks: { color: '#475569', font: { size: 12, weight: 600 } },
        grid: { display: false },
      },
    },
  }

  const jobDistOptions: ChartOptions<'bar'> = {
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

  const summaryReady = !jobsLoading && !applicationsLoading

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
            Pipeline velocity, candidate volume, and hiring outcomes across your workspace — refined in real time.
          </p>
        </div>
        <div className="dashboard-hero-meta">
          <div className="dashboard-hero-meta-item">
            <span>Pipeline Health</span>
            <strong>{conversionRate >= 25 ? 'Strong' : conversionRate >= 10 ? 'Stable' : 'Needs Attention'}</strong>
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

      {summaryReady ? (
        <div className="dashboard-summary-grid">
          <DashboardSummaryCard
            label="Total candidates"
            value={totalApplicantsAcrossJobs.toLocaleString()}
            icon={<IconUsers />}
            trend={{
              direction: candMom.direction,
              pct: candMom.pct,
              caption: `${candThisMonth} new this month vs ${candLastMonth} last month`,
            }}
            highlight
          />
          <DashboardSummaryCard
            label="Active jobs"
            value={openJobs.toLocaleString()}
            icon={<IconBriefcase />}
            trend={{
              direction: jobsMom.direction,
              pct: jobsMom.pct,
              caption: `${jobsThisMonth} jobs created this month vs ${jobsLastMonth} last month`,
            }}
          />
          <DashboardSummaryCard
            label="Interviews scheduled"
            value={workspaceUpcomingInterviews.toLocaleString()}
            icon={<IconCalendar />}
            trend={{
              direction: intMom.direction,
              pct: intMom.pct,
              caption: 'Scheduled or pending slots in your calendar',
            }}
          />
          <DashboardSummaryCard
            label="Offers released"
            value={offersWorkspace.toLocaleString()}
            icon={<IconGift />}
            trend={{
              direction: offersMom.direction,
              pct: offersMom.pct,
              caption: `${offersThisMonth} in offer stage updated this month`,
            }}
          />
        </div>
      ) : (
        <SummaryCardsSkeleton />
      )}

      <div className="dashboard-kpi-strip" aria-label="Secondary metrics">
        <span>
          <strong>{jobs.length}</strong> total jobs
        </span>
        <span>
          <strong>{monthlyDeltaLabel}</strong> application delta (last 2 months)
        </span>
        <span>
          <strong>{currentMonthApplications}</strong> applications this month vs {previousMonthApplications} prior
        </span>
        <span>
          <strong>{totalHiredCandidates}</strong> hired all-time
        </span>
      </div>

      <div className="dashboard-grid">
        <DashboardPanel title="Pipeline funnel (workspace)" wide>
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <ChartSkeleton height={220} />
            ) : funnelStageCounts.every(r => r.count === 0) ? (
              <div className="dashboard-empty">No applications in pipeline stages yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                <Bar
                  data={{
                    labels: funnelStageCounts.map(r => r.label),
                    datasets: [
                      {
                        label: 'Candidates',
                        data: funnelStageCounts.map(r => r.count),
                        backgroundColor: funnelStageCounts.map(
                          (_, i) => ['#38bdf8', '#3b82f6', '#6366f1', '#22c55e', '#0d9488'][i] ?? '#94a3b8',
                        ),
                        borderRadius: 8,
                        maxBarThickness: 36,
                      },
                    ],
                  }}
                  options={funnelBarOptions}
                />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applications over time">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <ChartSkeleton />
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
                  options={lineOptions}
                />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Candidate sources (workspace)">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <ChartSkeleton />
            ) : sourceSlicesWorkspace.length === 0 ? (
              <div className="dashboard-empty">No source data yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
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
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applicants by job">
          <div className="dashboard-panel-content">
            {applicationsLoading || jobsLoading ? (
              <ChartSkeleton height={280} />
            ) : jobDistributionBars.length === 0 ? (
              <div className="dashboard-empty">No jobs or applicants to chart.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-tall">
                <Bar
                  data={{
                    labels: jobDistributionBars.map(({ shortTitle }) => shortTitle),
                    datasets: [
                      {
                        label: 'Applicants',
                        data: jobDistributionBars.map(({ count }) => count),
                        backgroundColor: 'rgba(14,165,233,0.55)',
                        borderColor: '#0ea5e9',
                        borderWidth: 1,
                        borderRadius: 6,
                        maxBarThickness: 22,
                      },
                    ],
                  }}
                  options={jobDistOptions}
                />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Recent activity">
          <div className="dashboard-panel-content">
            {applicationsLoading && interviewsLoading ? (
              <div className="dashboard-activity-skeleton" aria-hidden>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="dashboard-activity-skeleton-row" />
                ))}
              </div>
            ) : activityItems.length === 0 ? (
              <div className="dashboard-empty">No recent candidate or interview activity.</div>
            ) : (
              <ul className="dashboard-activity-list">
                {activityItems.map(item => (
                  <li key={item.id} className="dashboard-activity-item">
                    {item.href ? (
                      <Link to={item.href} className="dashboard-activity-link">
                        <span className="dashboard-activity-title">{item.title}</span>
                        <span className="dashboard-activity-meta">
                          <span className="dashboard-activity-sub">{item.subtitle}</span>
                          <time dateTime={item.at}>{formatRelativeTime(item.at)}</time>
                        </span>
                      </Link>
                    ) : (
                      <div className="dashboard-activity-static">
                        <span className="dashboard-activity-title">{item.title}</span>
                        <span className="dashboard-activity-meta">
                          <span className="dashboard-activity-sub">{item.subtitle}</span>
                          <time dateTime={item.at}>{formatRelativeTime(item.at)}</time>
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs overview" wide>
          <div className="dashboard-panel-content dashboard-panel-content--flush">
            {jobsLoading ? (
              <div className="dashboard-table-skeleton-wrap" aria-hidden>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="dashboard-table-skeleton-row" />
                ))}
              </div>
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">No jobs yet. Create a job to start hiring.</div>
            ) : (
              <div className="dashboard-table-wrap">
                <table className="dashboard-jobs-table">
                  <thead>
                    <tr>
                      <th scope="col">Job title</th>
                      <th scope="col">Status</th>
                      <th scope="col">Applicants</th>
                      <th scope="col">Stage focus</th>
                      <th scope="col" className="dashboard-jobs-table-actions">
                        {' '}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(job => {
                      const count = applicantsByJobId.get(job.id) ?? 0
                      const jobApps = allApplications.filter(a => a.job_id === job.id)
                      const bySt = jobApps.reduce<Record<string, number>>((acc, a) => {
                        acc[a.status] = (acc[a.status] ?? 0) + 1
                        return acc
                      }, {})
                      const topStage =
                        Object.entries(bySt).sort((a, b) => b[1] - a[1])[0]?.[0] ?? (count ? 'applied' : '—')
                      return (
                        <tr key={job.id}>
                          <td>
                            <button
                              type="button"
                              className={`dashboard-table-job-link${selectedJobId === String(job.id) ? ' dashboard-table-job-link--active' : ''}`}
                              onClick={() => setSelectedJobId(String(job.id))}
                            >
                              {job.title}
                            </button>
                            <div className="dashboard-table-job-sub">{job.department ?? 'General'} · {job.location ?? 'Location TBD'}</div>
                          </td>
                          <td>
                            <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-blue'}`}>{formatDashboardLabel(job.status)}</span>
                          </td>
                          <td>
                            <span className="dashboard-table-num">{count}</span>
                          </td>
                          <td>
                            {topStage === '—' ? (
                              <span className="dashboard-table-muted">—</span>
                            ) : (
                              <span className={`tag ${STAGE_COLORS[topStage] ?? 'tag-blue'}`}>{formatDashboardLabel(topStage)}</span>
                            )}
                          </td>
                          <td className="dashboard-jobs-table-actions">
                            <Link className="dashboard-link dashboard-link--compact" to={`/account/${accountId}/jobs/${job.id}/edit`}>
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
                <div className="dashboard-footnote">Select a role to update pipeline analytics and the interviews scope.</div>
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

        <DashboardPanel title="Sources (selected job)">
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
                      labels: sourceSlicesJob.map(s => s.label),
                      datasets: [
                        {
                          data: sourceSlicesJob.map(s => s.value),
                          backgroundColor: sourceSlicesJob.map(s => s.color),
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
