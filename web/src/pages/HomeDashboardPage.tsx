/* eslint-disable react-hooks/set-state-in-effect -- loading/error resets before async API calls */
import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { type ChartOptions } from 'chart.js'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import {
  DashboardKpiSkeleton,
  DashboardPanel,
  DashboardPanelSkeleton,
  DashboardSummaryCard,
  formatDashboardLabel,
  formatDateTimeShort,
  formatTrendPercent,
  makeDashboardSlices,
  percentChange,
  registerDashboardCharts,
} from '../components/dashboard'

registerDashboardCharts()

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

const FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
const FUNNEL_LABELS = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired']

type PipelineModalKind = 'applicants' | 'interviews' | 'offers' | 'hired'

type ActivityItem = {
  id: string
  at: number
  title: string
  detail: string
  tag: string
  tagClass: string
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

function DashboardDoughnutChart({
  slices,
  emptyLabel,
  legendLabel,
}: {
  slices: ReturnType<typeof makeDashboardSlices>
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

function daysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

function inRange(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

function trendDirection(pct: number | null, current: number, previous: number): 'up' | 'down' | 'flat' {
  if (pct === null) {
    if (previous === 0 && current > 0) return 'up'
    if (previous === 0 && current === 0) return 'flat'
    return 'flat'
  }
  if (pct > 0) return 'up'
  if (pct < 0) return 'down'
  return 'flat'
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
  const totalOpenings = jobs.reduce((sum, job) => sum + (job.open_positions ?? 0), 0)
  const openingFillRate = totalOpenings > 0 ? Math.round((totalHiredCandidates / totalOpenings) * 100) : 0
  const avgApplicantsPerJob = jobs.length > 0 ? (totalApplicantsAcrossJobs / jobs.length).toFixed(1) : '0.0'
  const offersReleasedWorkspace = allApplications.filter(a => a.status === 'offer').length

  const now = new Date()
  const start30 = daysAgo(30)
  const start60 = daysAgo(60)
  const candRecent = allApplications.filter(a => inRange(a.created_at, start30, now)).length
  const candPrev = allApplications.filter(a => inRange(a.created_at, start60, start30)).length
  const candPct = percentChange(candRecent, candPrev)

  const jobsRecent = jobs.filter(j => inRange(j.created_at, start30, now)).length
  const jobsPrev = jobs.filter(j => inRange(j.created_at, start60, start30)).length
  const jobsPct = percentChange(jobsRecent, jobsPrev)

  const intRecent = interviews.filter(
    i => (i.status === 'scheduled' || i.status === 'pending') && inRange(i.created_at, start30, now),
  ).length
  const intPrev = interviews.filter(
    i => (i.status === 'scheduled' || i.status === 'pending') && inRange(i.created_at, start60, start30),
  ).length
  const intPct = percentChange(intRecent, intPrev)

  const offRecent = allApplications.filter(a => a.status === 'offer' && inRange(a.updated_at, start30, now)).length
  const offPrev = allApplications.filter(a => a.status === 'offer' && inRange(a.updated_at, start60, start30)).length
  const offPct = percentChange(offRecent, offPrev)

  const workspacePipelineCounts = allApplications.reduce<Record<string, number>>((acc, application) => {
    acc[application.status] = (acc[application.status] ?? 0) + 1
    return acc
  }, {})
  const funnelValues = FUNNEL_STAGES.map(stage => workspacePipelineCounts[stage] ?? 0)

  const jobApplicantCounts = useMemo(() => {
    const m = new Map<number, number>()
    for (const a of allApplications) {
      m.set(a.job_id, (m.get(a.job_id) ?? 0) + 1)
    }
    return m
  }, [allApplications])

  const jobBarRows = useMemo(() => {
    return [...jobs]
      .map(job => ({ job, n: jobApplicantCounts.get(job.id) ?? 0 }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 10)
  }, [jobs, jobApplicantCounts])

  const sourceSlicesWorkspace = makeDashboardSlices(
    Object.entries(
      allApplications.reduce<Record<string, number>>((acc, application) => {
        const source = application.source_type || 'unknown'
        acc[source] = (acc[source] ?? 0) + 1
        return acc
      }, {}),
    ),
  )

  const activityItems = useMemo(() => {
    const items: ActivityItem[] = []
    const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`

    for (const app of allApplications) {
      const name = app.candidate_name || app.candidate_email
      items.push({
        id: `c-${app.id}`,
        at: new Date(app.created_at).getTime(),
        title: 'Candidate applied',
        detail: `${name} · ${jobTitle(app.job_id)}`,
        tag: 'Applied',
        tagClass: STAGE_COLORS.applied,
      })
      const history = app.stage_history ?? []
      for (let i = 0; i < history.length; i++) {
        const h = history[i]
        const stage = h.stage
        const at = new Date(h.changed_at).getTime()
        let title = 'Stage updated'
        if (stage === 'interview') title = 'Moved to interview'
        else if (stage === 'offer') title = 'Offer released'
        else if (stage === 'hired') title = 'Candidate hired'
        else if (stage === 'screening') title = 'Moved to screening'
        else if (stage === 'rejected' || stage === 'withdrawn') title = 'Application closed'
        items.push({
          id: `h-${app.id}-${i}-${at}`,
          at,
          title,
          detail: `${name} · ${jobTitle(app.job_id)}`,
          tag: formatDashboardLabel(stage),
          tagClass: STAGE_COLORS[stage] ?? 'tag-gray',
        })
      }
    }

    for (const row of interviews) {
      const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
      const jt = row.job?.title ?? jobTitle(row.application?.job_id ?? 0)
      if (row.scheduled_at) {
        items.push({
          id: `i-${row.id}-sched`,
          at: new Date(row.scheduled_at).getTime(),
          title: 'Interview scheduled',
          detail: `${name} · ${jt}`,
          tag: formatDashboardLabel(row.status),
          tagClass: STAGE_COLORS[row.status] ?? 'tag-blue',
        })
      }
    }

    return items.sort((a, b) => b.at - a.at).slice(0, 18)
  }, [allApplications, interviews, jobs])

  const monthlyTrend = useMemo(() => {
    const anchor = new Date()
    const keys = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date(anchor.getFullYear(), anchor.getMonth() - (5 - idx), 1)
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

  const selectedJobSourceSlices = useMemo(
    () =>
      makeDashboardSlices(
        Object.entries(
          jobApplications.reduce<Record<string, number>>((acc, application) => {
            const source = application.source_type || 'unknown'
            acc[source] = (acc[source] ?? 0) + 1
            return acc
          }, {}),
        ),
      ),
    [jobApplications],
  )
  const selectedJobSourceTop =
    selectedJobSourceSlices.length === 0
      ? 'No data'
      : selectedJobSourceSlices.reduce((a, b) => (a.value >= b.value ? a : b)).label

  const funnelOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.dataset.label ?? 'Candidates'}: ${ctx.raw}`,
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
      legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
    },
  }

  const jobBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: '#6b7280', font: { size: 11 }, maxRotation: 45, minRotation: 0 },
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

  const summaryLoading = jobsLoading || applicationsLoading

  const funnelColors = ['#38bdf8', '#3b82f6', '#6366f1', '#10b981', '#059669']

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
            Pipeline health, sourcing, and hiring activity across your open roles — updated from live application data.
          </p>
        </div>
        <div className="dashboard-hero-meta">
          <div className="dashboard-hero-meta-item">
            <span>Hire rate (selected job)</span>
            <strong>{conversionRate}%</strong>
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

      {summaryLoading ? (
        <DashboardKpiSkeleton />
      ) : (
        <div className="dashboard-summary-grid">
          <DashboardSummaryCard
            primary
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            label="Total candidates"
            value={totalApplicantsAcrossJobs}
            trendLabel={formatTrendPercent(candPct, candRecent, candPrev)}
            trendDirection={trendDirection(candPct, candRecent, candPrev)}
            sublabel="vs prior 30 days"
          />
          <DashboardSummaryCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            }
            label="Active jobs"
            value={openJobs}
            trendLabel={formatTrendPercent(jobsPct, jobsRecent, jobsPrev)}
            trendDirection={trendDirection(jobsPct, jobsRecent, jobsPrev)}
            sublabel={`${jobs.length} total roles · new listings vs prior 30d`}
          />
          <DashboardSummaryCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            }
            label="Interviews scheduled"
            value={workspaceUpcomingInterviews}
            trendLabel={formatTrendPercent(intPct, intRecent, intPrev)}
            trendDirection={trendDirection(intPct, intRecent, intPrev)}
            sublabel="Upcoming & pending · assignments vs prior 30d"
          />
          <DashboardSummaryCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M12 18v-6M9 15h6" />
              </svg>
            }
            label="Offers released"
            value={offersReleasedWorkspace}
            trendLabel={formatTrendPercent(offPct, offRecent, offPrev)}
            trendDirection={trendDirection(offPct, offRecent, offPrev)}
            sublabel="In offer stage · updates vs prior 30d"
          />
        </div>
      )}

      <div className="dashboard-charts-row">
        <DashboardPanel title="Pipeline funnel (workspace)">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <DashboardPanelSkeleton rows={5} />
            ) : funnelValues.every(v => v === 0) ? (
              <div className="dashboard-empty">No applications yet. Funnel appears when candidates enter the pipeline.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                <Bar
                  data={{
                    labels: FUNNEL_LABELS,
                    datasets: [
                      {
                        label: 'Candidates',
                        data: funnelValues,
                        backgroundColor: funnelColors,
                        borderRadius: 8,
                        barThickness: 28,
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
                        backgroundColor: 'rgba(14,165,233,0.15)',
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

        <DashboardPanel title="Candidates by job">
          <div className="dashboard-panel-content">
            {applicationsLoading || jobsLoading ? (
              <DashboardPanelSkeleton rows={4} />
            ) : jobBarRows.length === 0 ? (
              <div className="dashboard-empty">Add jobs and applications to see distribution.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Bar
                  data={{
                    labels: jobBarRows.map(({ job }) => (job.title.length > 22 ? `${job.title.slice(0, 20)}…` : job.title)),
                    datasets: [
                      {
                        data: jobBarRows.map(({ n }) => n),
                        backgroundColor: 'rgba(14, 165, 233, 0.55)',
                        borderColor: '#0ea5e9',
                        borderWidth: 1,
                        borderRadius: 6,
                        maxBarThickness: 36,
                      },
                    ],
                  }}
                  options={jobBarOptions}
                />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Source of candidates">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <DashboardPanelSkeleton rows={3} />
            ) : sourceSlicesWorkspace.length === 0 ? (
              <div className="dashboard-empty">No source data yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-pie">
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
      </div>

      <div className="dashboard-grid dashboard-grid--lower">
        <DashboardPanel title="Recent activity">
          <div className="dashboard-panel-content">
            {applicationsLoading && interviewsLoading ? (
              <DashboardPanelSkeleton rows={6} />
            ) : activityItems.length === 0 ? (
              <div className="dashboard-empty">Activity will appear as you add candidates and schedule interviews.</div>
            ) : (
              <ul className="dashboard-activity-feed">
                {activityItems.map(item => (
                  <li key={item.id} className="dashboard-activity-item">
                    <div className="dashboard-activity-dot" />
                    <div className="dashboard-activity-body">
                      <div className="dashboard-activity-head">
                        <strong>{item.title}</strong>
                        <span className="dashboard-activity-time">
                          {new Date(item.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="dashboard-activity-detail">{item.detail}</p>
                      <span className={`tag ${item.tagClass}`}>{item.tag}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs overview">
          <div className="dashboard-panel-content dashboard-table-wrap">
            {jobsLoading ? (
              <DashboardPanelSkeleton rows={5} />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">No jobs yet. Create a role to start hiring.</div>
            ) : (
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
                    const n = jobApplicantCounts.get(job.id) ?? 0
                    const topStage = (() => {
                      const apps = allApplications.filter(a => a.job_id === job.id)
                      if (apps.length === 0) return '—'
                      const counts = apps.reduce<Record<string, number>>((acc, a) => {
                        acc[a.status] = (acc[a.status] ?? 0) + 1
                        return acc
                      }, {})
                      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
                      return formatDashboardLabel(top[0])
                    })()
                    return (
                      <tr key={job.id}>
                        <td>
                          <Link className="dashboard-table-link" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                            {job.title}
                          </Link>
                          <span className="dashboard-table-sub">{job.department ?? 'General'} · {job.location ?? 'Location TBD'}</span>
                        </td>
                        <td>
                          <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-gray'}`}>{formatDashboardLabel(job.status)}</span>
                        </td>
                        <td className="dashboard-table-num">{n}</td>
                        <td>{topStage}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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
                <div className="dashboard-footnote">Select a role to refresh pipeline analytics below.</div>
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
                <div className="dashboard-footnote">Click a metric card to inspect candidate-level records in detail.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applicant sources (selected job)">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <LoadingRow />
            ) : selectedJobSourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data is available for this job.</div>
            ) : (
              <>
                <div className="dashboard-chart-shell dashboard-chart-shell-short">
                  <Bar
                    data={{
                      labels: selectedJobSourceSlices.map(slice => slice.label),
                      datasets: [
                        {
                          data: selectedJobSourceSlices.map(slice => slice.value),
                          backgroundColor: selectedJobSourceSlices.map(slice => slice.color),
                          borderRadius: 8,
                          maxBarThickness: 36,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
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
                    }}
                  />
                </div>
                <div className="dashboard-insight-row">
                  <div className="dashboard-insight-card">
                    <strong>{selectedJobSourceTop}</strong>
                    <span>Top source channel</span>
                  </div>
                  <div className="dashboard-insight-card">
                    <strong>{selectedJobSourceSlices.length}</strong>
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
