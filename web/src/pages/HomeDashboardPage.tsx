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
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { DashboardPanel } from './dashboard/DashboardPanel'
import { DashboardKpiCard } from './dashboard/DashboardKpiCard'
import {
  FUNNEL_STATUSES,
  applicationWindows,
  formatDashboardLabel,
  formatDateTimeShort,
  formatRelativeTime,
  makeDashboardSlices,
  offersInWindow,
  trendParts,
  uniqueCandidateCount,
  type DashboardSlice,
} from './dashboard/dashboardUtils'
import { IconBriefcase, IconCalendar, IconGift, IconUsers } from './dashboard/dashboardIcons'

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

function ChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-skeleton ${short ? 'dashboard-chart-skeleton-short' : ''}`}>
      <div className="dashboard-chart-skeleton-inner" />
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

function countCreatedInRange<T extends { created_at: string }>(rows: T[], startMs: number, endMs: number) {
  return rows.filter(r => {
    const t = new Date(r.created_at).getTime()
    return t >= startMs && t < endMs
  }).length
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
    let cancelled = false

    if (!selectedJobId) {
      queueMicrotask(() => {
        if (cancelled) return
        setJobApplications([])
        setAnalyticsError('')
      })
      return () => {
        cancelled = true
      }
    }

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
  const sourceSlicesJob = makeDashboardSlices(
    Object.entries(
      jobApplications.reduce<Record<string, number>>((acc, application) => {
        const source = application.source_type || 'unknown'
        acc[source] = (acc[source] ?? 0) + 1
        return acc
      }, {}),
    ),
  )
  const sourceSlicesWorkspace = useMemo(
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

  const funnelCounts = useMemo(() => {
    const acc: Record<string, number> = {}
    FUNNEL_STATUSES.forEach(s => {
      acc[s] = 0
    })
    allApplications.forEach(a => {
      if (acc[a.status] !== undefined) acc[a.status] += 1
    })
    return FUNNEL_STATUSES.map(s => ({ key: s, label: formatDashboardLabel(s), value: acc[s] ?? 0 }))
  }, [allApplications])

  const funnelMax = Math.max(...funnelCounts.map(f => f.value), 1)

  const applicantsByJob = useMemo(() => {
    const m = new Map<number, number>()
    allApplications.forEach(a => {
      m.set(a.job_id, (m.get(a.job_id) ?? 0) + 1)
    })
    return jobs
      .map(job => ({
        id: job.id,
        title: job.title,
        count: m.get(job.id) ?? 0,
      }))
      .filter(j => j.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [allApplications, jobs])

  const [trendAnchorMs] = useState(() => Date.now())

  const activityItems = useMemo(() => {
    type Item = { id: string; at: string; text: string; meta: string }
    const items: Item[] = []

    allApplications
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 12)
      .forEach(a => {
        const jobTitle = jobs.find(j => j.id === a.job_id)?.title ?? `Job #${a.job_id}`
        const name = a.candidate_name || a.candidate_email
        items.push({
          id: `app-${a.id}`,
          at: a.created_at,
          text: `Application received from ${name}`,
          meta: `${jobTitle} · ${formatDashboardLabel(a.status)}`,
        })
      })

    interviews.forEach(row => {
      if (row.scheduled_at) {
        items.push({
          id: `int-${row.id}`,
          at: row.scheduled_at,
          text: `Interview scheduled`,
          meta: `${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'} · ${row.job?.title ?? 'Role'}`,
        })
      }
    })

    return items
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 14)
  }, [allApplications, interviews, jobs])

  const d30 = 30 * 24 * 60 * 60 * 1000
  const curStart = trendAnchorMs - d30
  const prevStart = trendAnchorMs - 2 * d30
  const prevEnd = trendAnchorMs - d30

  const { last30unique, prev30unique, last30apps } = useMemo(
    () => applicationWindows(allApplications, trendAnchorMs),
    [allApplications, trendAnchorMs],
  )
  const totalCandidates = uniqueCandidateCount(allApplications)

  const { jobsTrend, interviewsTrend, offersTrend, jobsOpenedLast30, interviewsBookedLast30, offersLast30 } = useMemo(() => {
    const jobsOpenedLast30N = countCreatedInRange(jobs, curStart, trendAnchorMs)
    const jobsOpenedPrev30N = countCreatedInRange(jobs, prevStart, prevEnd)
    const interviewsBookedLast30N = countCreatedInRange(interviews, curStart, trendAnchorMs)
    const interviewsBookedPrev30N = countCreatedInRange(interviews, prevStart, prevEnd)
    const offersLast30N = offersInWindow(allApplications, curStart, trendAnchorMs)
    const offersPrev30N = offersInWindow(allApplications, prevStart, prevEnd)
    return {
      jobsTrend: trendParts(jobsOpenedLast30N, jobsOpenedPrev30N, true),
      interviewsTrend: trendParts(interviewsBookedLast30N, interviewsBookedPrev30N, true),
      offersTrend: trendParts(offersLast30N, offersPrev30N, true),
      jobsOpenedLast30: jobsOpenedLast30N,
      interviewsBookedLast30: interviewsBookedLast30N,
      offersLast30: offersLast30N,
    }
  }, [allApplications, interviews, jobs, curStart, prevEnd, prevStart, trendAnchorMs])
  const workspaceOffersInPipeline = allApplications.filter(a => a.status === 'offer').length

  const candidatesTrend = trendParts(last30unique, prev30unique, true)

  const maxSourceValue = Math.max(...sourceSlicesJob.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlicesJob.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'

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

  const barHorizontalOptions: ChartOptions<'bar'> = {
    ...barOptions,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#6b7280', font: { size: 11 }, autoSkip: false },
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
      legend: { position: 'right', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' } },
    },
  }

  const funnelOverlayData = {
    labels: funnelCounts.map(f => f.label),
    datasets: [
      {
        label: 'Scale',
        data: funnelCounts.map(f => Math.max(funnelMax - f.value, 0)),
        backgroundColor: 'rgba(241,245,249,0.95)',
        borderRadius: 6,
        barThickness: 22,
      },
      {
        label: 'Count',
        data: funnelCounts.map(f => f.value),
        backgroundColor: funnelCounts.map(
          (_, i) => ['#0ea5e9', '#f97316', '#3b82f6', '#10b981', '#059669'][i] ?? '#64748b',
        ),
        borderRadius: 6,
        barThickness: 22,
      },
    ],
  }

  const funnelOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        filter: item => item.datasetIndex === 1,
      },
    },
    scales: {
      x: {
        stacked: true,
        max: funnelMax,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.15)' },
      },
      y: {
        stacked: true,
        ticks: { color: '#475569', font: { size: 12 } },
        grid: { display: false },
      },
    },
  }

  const jobBarLabels = applicantsByJob.map(j =>
    j.title.length > 28 ? `${j.title.slice(0, 26)}…` : j.title,
  )

  const workspacePieData = {
    labels: sourceSlicesWorkspace.map(s => s.label),
    datasets: [
      {
        data: sourceSlicesWorkspace.map(s => s.value),
        backgroundColor: sourceSlicesWorkspace.map(s => s.color),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
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

  const kpiLoading = jobsLoading || applicationsLoading || interviewsLoading

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
            Pipeline velocity, candidate volume, and hiring outcomes across your workspace.
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

      <div className="dashboard-kpi-grid dashboard-kpi-grid-four">
        <DashboardKpiCard
          label="Total candidates"
          value={totalCandidates.toLocaleString()}
          icon={<IconUsers />}
          trend={candidatesTrend}
          subtitle={`${last30apps.toLocaleString()} applications in last 30d`}
          primary
          loading={kpiLoading}
        />
        <DashboardKpiCard
          label="Active jobs"
          value={openJobs.toLocaleString()}
          icon={<IconBriefcase />}
          trend={jobsTrend}
          subtitle={`${jobs.length} total roles · ${jobsOpenedLast30} new in 30d`}
          loading={kpiLoading}
        />
        <DashboardKpiCard
          label="Interviews scheduled"
          value={workspaceUpcomingInterviews.toLocaleString()}
          icon={<IconCalendar />}
          trend={interviewsTrend}
          subtitle={`${interviewsBookedLast30} assignments created in 30d`}
          loading={kpiLoading}
        />
        <DashboardKpiCard
          label="Offers released"
          value={workspaceOffersInPipeline.toLocaleString()}
          icon={<IconGift />}
          trend={offersTrend}
          subtitle={`${offersLast30} offers updated in last 30d`}
          loading={kpiLoading}
        />
      </div>

      <div className="dashboard-grid">
        <DashboardPanel title="Pipeline funnel">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <ChartSkeleton />
            ) : funnelCounts.every(f => f.value === 0) ? (
              <div className="dashboard-empty">No candidates in funnel stages yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                <Bar data={funnelOverlayData} options={funnelOptions} />
              </div>
            )}
            <p className="dashboard-footnote dashboard-footnote-tight">Workspace-wide counts by application stage.</p>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applications over time">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <ChartSkeleton short />
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
              <ChartSkeleton short />
            ) : applicantsByJob.length === 0 ? (
              <div className="dashboard-empty">No applications yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-tall">
                <Bar
                  data={{
                    labels: jobBarLabels,
                    datasets: [
                      {
                        data: applicantsByJob.map(j => j.count),
                        backgroundColor: 'rgba(14, 165, 233, 0.55)',
                        borderColor: '#0ea5e9',
                        borderWidth: 1,
                        borderRadius: 6,
                        maxBarThickness: 28,
                      },
                    ],
                  }}
                  options={barHorizontalOptions}
                />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Source of candidates">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <ChartSkeleton />
            ) : sourceSlicesWorkspace.length === 0 ? (
              <div className="dashboard-empty">No source data yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-pie">
                <Pie data={workspacePieData} options={pieOptions} />
              </div>
            )}
            <p className="dashboard-footnote dashboard-footnote-tight">All applications by source type.</p>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Recent activity">
          <div className="dashboard-panel-content">
            {applicationsLoading && interviewsLoading ? (
              <div className="dashboard-activity-skeleton-wrap">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="dashboard-activity-skeleton-row" />
                ))}
              </div>
            ) : activityItems.length === 0 ? (
              <div className="dashboard-empty">No recent activity yet.</div>
            ) : (
              <ul className="dashboard-activity-feed">
                {activityItems.map(item => (
                  <li key={item.id} className="dashboard-activity-item">
                    <div className="dashboard-activity-dot" aria-hidden />
                    <div className="dashboard-activity-body">
                      <p className="dashboard-activity-text">{item.text}</p>
                      <span className="dashboard-activity-meta">{item.meta}</span>
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

        <DashboardPanel title="Jobs overview">
          <div className="dashboard-panel-content dashboard-table-wrap">
            {jobsLoading ? (
              <div className="dashboard-table-skeleton">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="dashboard-table-skeleton-row" />
                ))}
              </div>
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">No jobs yet.</div>
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
                    const count = allApplications.filter(a => a.job_id === job.id).length
                    const stages = [...new Set(allApplications.filter(a => a.job_id === job.id).map(a => a.status))]
                    const focus =
                      stages.includes('interview') || stages.includes('offer')
                        ? 'Late pipeline'
                        : stages.includes('screening')
                          ? 'Screening'
                          : count > 0
                            ? 'Early pipeline'
                            : '—'
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
                        </td>
                        <td>
                          <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-gray'}`}>{formatDashboardLabel(job.status)}</span>
                        </td>
                        <td className="dashboard-jobs-table-num">{count}</td>
                        <td className="dashboard-jobs-table-muted">{focus}</td>
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
              <ChartSkeleton />
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

        <DashboardPanel title="Selected job pipeline">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <>
                <ChartSkeleton />
                <div className="dashboard-microstats dashboard-microstats-skeleton">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="dashboard-microstat-skel" />
                  ))}
                </div>
              </>
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
                <div className="dashboard-footnote">Click a metric card to inspect candidate-level records in detail.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applicant sources (selected job)">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <ChartSkeleton short />
            ) : sourceSlicesJob.length === 0 ? (
              <div className="dashboard-empty">No source data is available for this job.</div>
            ) : (
              <>
                <div className="dashboard-chart-shell dashboard-chart-shell-short">
                  <Bar
                    data={{
                      labels: sourceSlicesJob.map(slice => slice.label),
                      datasets: [
                        {
                          data: sourceSlicesJob.map(slice => slice.value),
                          backgroundColor: sourceSlicesJob.map(slice => slice.color),
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
