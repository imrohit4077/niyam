import { type ReactNode, useEffect, useMemo, useState } from 'react'
/* eslint-disable react-hooks/set-state-in-effect -- data-fetch effects reset loading/error before async; standard pattern in this app */
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
import { DashboardKpiCard } from '../components/dashboard/DashboardKpiCard'
import { IconBriefcase, IconCalendar, IconGift, IconUsers } from '../components/dashboard/DashboardKpiIcons'
import {
  interviewScheduleTwoWeekTrend,
  offerStageTwoWeekTrend,
  trendMeta,
  twoWeekBlockCreatedTrend,
} from '../components/dashboard/dashboardKpiUtils'

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

const FUNNEL_STAGES: Array<'applied' | 'screening' | 'interview' | 'offer' | 'hired'> = [
  'applied',
  'screening',
  'interview',
  'offer',
  'hired',
]

const FUNNEL_LABELS: Record<string, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
}

type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

type PipelineModalKind = 'applicants' | 'interviews' | 'offers' | 'hired'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler)

function PanelSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="dashboard-skeleton" aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="dashboard-skeleton-line" style={{ width: i === lines - 1 ? '66%' : '100%' }} />
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="dashboard-skeleton-table" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="dashboard-skeleton-table-row">
          <div className="dashboard-skeleton-pill" />
          <div className="dashboard-skeleton-pill dashboard-skeleton-pill--sm" />
          <div className="dashboard-skeleton-pill" />
        </div>
      ))}
    </div>
  )
}

function KpiRowSkeleton() {
  return (
    <div className="dashboard-kpi-skeleton-row" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="dashboard-kpi-card dashboard-kpi-skeleton-card" />
      ))}
    </div>
  )
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

function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
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

function jobTitleById(jobs: Job[], jobId: number) {
  return jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`
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

const chartAxisMuted = {
  x: {
    ticks: { color: '#6b7280', font: { size: 11 } },
    grid: { display: false },
  },
  y: {
    beginAtZero: true,
    ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
    grid: { color: 'rgba(148,163,184,0.22)' },
  },
} as const

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
      const k = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (k in counters) counters[k] += 1
    })
    return keys.map(item => ({ label: item.label, value: counters[item.key] ?? 0 }))
  }, [allApplications])
  const currentMonthApplications = monthlyTrend[monthlyTrend.length - 1]?.value ?? 0
  const previousMonthApplications = monthlyTrend[monthlyTrend.length - 2]?.value ?? 0
  const monthlyDelta = currentMonthApplications - previousMonthApplications
  const maxSourceValue = Math.max(...sourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'

  const openJobs = jobs.filter(job => job.status === 'open').length
  const workspacePipelineCounts = useMemo(() => {
    const acc: Record<string, number> = { applied: 0, screening: 0, interview: 0, offer: 0, hired: 0 }
    for (const a of allApplications) {
      const s = a.status
      if (s in acc) acc[s] = (acc[s] ?? 0) + 1
    }
    return acc
  }, [allApplications])

  const applicationsTrend = useMemo(
    () => twoWeekBlockCreatedTrend(allApplications),
    [allApplications],
  )
  const openJobsTrend = useMemo(
    () => twoWeekBlockCreatedTrend(jobs.filter(j => j.status === 'open')),
    [jobs],
  )
  const offersTrend = useMemo(() => offerStageTwoWeekTrend(allApplications), [allApplications])
  const interviewRowsForTrend = useMemo(
    () => interviews.filter(r => r.status === 'scheduled' || r.status === 'pending' || !!r.scheduled_at),
    [interviews],
  )
  const interviewsScheduledTrend = useMemo(
    () => interviewScheduleTwoWeekTrend(interviewRowsForTrend),
    [interviewRowsForTrend],
  )

  const kpiTotalCandidates = { meta: trendMeta(applicationsTrend.last, applicationsTrend.prev, 'no new apps') }
  const kpiActiveJobs = { meta: trendMeta(openJobsTrend.last, openJobsTrend.prev, 'no new roles') }
  const kpiInterviews = {
    meta: trendMeta(
      interviewsScheduledTrend.last,
      interviewsScheduledTrend.prev,
      'no interviews',
    ),
  }
  const kpiOffers = { meta: trendMeta(offersTrend.last, offersTrend.prev, 'no offers') }

  const topJobsByApplicants = useMemo(() => {
    const map = allApplications.reduce<Record<number, number>>((m, a) => {
      m[a.job_id] = (m[a.job_id] ?? 0) + 1
      return m
    }, {})
    return Object.entries(map)
      .map(([id, c]) => ({ jobId: Number(id), count: c }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [allApplications])

  const jobBarData = {
    labels: topJobsByApplicants.map(({ jobId }) => {
      const t = jobTitleById(jobs, jobId)
      return t.length > 32 ? `${t.slice(0, 30)}…` : t
    }),
    datasets: [
      {
        label: 'Applicants',
        data: topJobsByApplicants.map(t => t.count),
        backgroundColor: '#3b82f6',
        borderRadius: 6,
        maxBarThickness: 22,
      },
    ],
  }

  const jobBarOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#6b7280', font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { display: false },
      },
    },
  }

  const funnelData = {
    labels: FUNNEL_STAGES.map(s => FUNNEL_LABELS[s] ?? s),
    datasets: [
      {
        label: 'Candidates',
        data: FUNNEL_STAGES.map(s => workspacePipelineCounts[s] ?? 0),
        backgroundColor: ['#0ea5e9', '#38bdf8', '#3b82f6', '#22c55e', '#059669'],
        borderRadius: 8,
        maxBarThickness: 48,
      },
    ],
  }

  const funnelOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { ...chartAxisMuted },
  }

  const offerRows = jobApplications.filter(application => application.status === 'offer')
  const hiredRows = jobApplications.filter(application => application.status === 'hired')

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { ...chartAxisMuted },
  }
  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { ...chartAxisMuted },
  }

  const sourcePieData = {
    labels: sourceSlices.map(s => s.label),
    datasets: [
      {
        data: sourceSlices.map(s => s.value),
        backgroundColor: sourceSlices.map(s => s.color),
        borderColor: '#fff',
        borderWidth: 2,
      },
    ],
  }
  const sourcePieOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '52%',
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 } } },
    },
  }

  const activityItems = useMemo(() => {
    const fromApps = allApplications
      .map(a => {
        const created = new Date(a.created_at).getTime()
        const updated = new Date(a.updated_at).getTime()
        const at = Math.max(created, updated)
        return {
          id: `a-${a.id}`,
          at,
          statusKey: a.status,
          title:
            created >= updated - 2000
              ? `New application: ${a.candidate_name || a.candidate_email}`
              : `Application updated: ${a.candidate_name || a.candidate_email}`,
          sub: jobTitleById(jobs, a.job_id),
        }
      })
      .sort((x, y) => y.at - x.at)
      .slice(0, 8)

    const fromInterviews = interviews
      .map(r => {
        const at = new Date(r.scheduled_at || r.updated_at).getTime()
        const name = r.application?.candidate_name || r.application?.candidate_email || 'Candidate'
        return {
          id: `i-${r.id}`,
          at,
          statusKey: r.status,
          title:
            r.status === 'completed'
              ? `Interview completed: ${name}`
              : `Interview scheduled: ${name}`,
          sub: r.job?.title ?? (r.application ? jobTitleById(jobs, r.application.job_id) : '—'),
        }
      })
      .sort((x, y) => y.at - x.at)
      .slice(0, 6)

    return [...fromApps, ...fromInterviews]
      .sort((a, b) => b.at - a.at)
      .slice(0, 10)
  }, [allApplications, interviews, jobs])

  const jobsTableRows = useMemo(() => {
    return jobs
      .map(job => {
        const perJob = allApplications.filter(a => a.job_id === job.id)
        const applicants = perJob.length
        const latest = perJob.reduce<Application | null>((best, a) => {
          if (!best) return a
          return new Date(a.updated_at) > new Date(best.updated_at) ? a : best
        }, null)
        const stage = latest ? formatDashboardLabel(latest.status) : '—'
        return { job, applicants, stage }
      })
      .sort((a, b) => b.applicants - a.applicants)
  }, [jobs, allApplications])

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

  const showJobsTableSkeleton = jobsLoading || applicationsLoading
  const showActivitySkeleton = applicationsLoading && interviewsLoading

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
            Real-time pipeline visibility, source mix, and hiring activity across your workspace.
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

      {jobsLoading ? (
        <KpiRowSkeleton />
      ) : (
        <div className="dashboard-kpi-grid dashboard-kpi-grid--four">
          <DashboardKpiCard
            label="Total Candidates"
            value={totalApplicantsAcrossJobs}
            icon={<IconUsers />}
            direction={kpiTotalCandidates.meta.direction}
            pct={kpiTotalCandidates.meta.pct}
            sublabel={kpiTotalCandidates.meta.sublabel}
            primary
          />
          <DashboardKpiCard
            label="Active Jobs"
            value={openJobs}
            icon={<IconBriefcase />}
            direction={kpiActiveJobs.meta.direction}
            pct={kpiActiveJobs.meta.pct}
            sublabel={kpiActiveJobs.meta.sublabel}
          />
          <DashboardKpiCard
            label="Interviews Scheduled"
            value={interviewRowsForTrend.length}
            icon={<IconCalendar />}
            direction={kpiInterviews.meta.direction}
            pct={kpiInterviews.meta.pct}
            sublabel={kpiInterviews.meta.sublabel}
          />
          <DashboardKpiCard
            label="Offers Released"
            value={allApplications.filter(a => a.status === 'offer').length}
            icon={<IconGift />}
            direction={kpiOffers.meta.direction}
            pct={kpiOffers.meta.pct}
            sublabel={kpiOffers.meta.sublabel}
          />
        </div>
      )}

      {monthlyDelta !== 0 && !jobsLoading && (
        <p className="dashboard-hero-metric-note">
          <strong>{monthlyDelta > 0 ? '+' : ''}{monthlyDelta}</strong> applications this month vs last
          <span> · {currentMonthApplications} this month, {previousMonthApplications} prior</span>
        </p>
      )}

      <div className="dashboard-charts-top">
        <DashboardPanel className="dashboard-panel--wide" title="Candidate Pipeline (Workspace)">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <PanelSkeleton />
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-medium">
                <Bar data={funnelData} options={funnelOptions} />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel className="dashboard-panel--wide" title="Applications Over Time">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <PanelSkeleton />
            ) : monthlyTrend.every(item => item.value === 0) ? (
              <div className="dashboard-empty">No application activity in the last six months.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-medium">
                <Line
                  data={{
                    labels: monthlyTrend.map(item => item.label),
                    datasets: [
                      {
                        data: monthlyTrend.map(item => item.value),
                        borderColor: '#0ea5e9',
                        backgroundColor: 'rgba(14, 165, 233, 0.12)',
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
      </div>

      <div className="dashboard-charts-mid">
        <DashboardPanel title="Applicants by Job">
          <div className="dashboard-panel-content">
            {applicationsLoading && jobsLoading ? (
              <PanelSkeleton lines={4} />
            ) : topJobsByApplicants.length === 0 ? (
              <div className="dashboard-empty">No applicants yet. Post a job to start tracking.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-tall">
                <Bar data={jobBarData} options={jobBarOptions} />
              </div>
            )}
          </div>
        </DashboardPanel>
      </div>

      <div className="dashboard-secondary-grid">
        {showActivitySkeleton ? (
          <div className="panel dashboard-panel dashboard-modern-panel dashboard-activity-card">
            <div className="panel-header dashboard-modern-panel-header">
              <span className="panel-header-title">Recent activity</span>
            </div>
            <div className="panel-body dashboard-modern-panel-body">
              <div className="dashboard-panel-content">
                <PanelSkeleton lines={5} />
              </div>
            </div>
          </div>
        ) : (
          <div className="panel dashboard-panel dashboard-modern-panel dashboard-activity-card">
            <div className="panel-header dashboard-modern-panel-header">
              <span className="panel-header-title">Recent activity</span>
            </div>
            <div className="panel-body dashboard-modern-panel-body">
              <div className="dashboard-panel-content">
                <ul className="dashboard-activity-list">
                {activityItems.length === 0 ? (
                  <li className="dashboard-activity-empty">No recent activity yet.</li>
                ) : (
                  activityItems.map(item => (
                    <li key={item.id} className="dashboard-activity-item">
                      <div>
                        <span className="dashboard-activity-title">{item.title}</span>
                        <span className="dashboard-activity-sub">{item.sub}</span>
                      </div>
                      <span className={`tag ${STAGE_COLORS[item.statusKey] ?? 'tag-gray'}`}>
                        {formatDashboardLabel(item.statusKey)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
              </div>
            </div>
          </div>
        )}

        {showJobsTableSkeleton ? (
          <div className="panel dashboard-panel dashboard-modern-panel dashboard-jobs-table-card">
            <div className="panel-header dashboard-modern-panel-header">
              <span className="panel-header-title">Jobs overview</span>
            </div>
            <div className="panel-body dashboard-modern-panel-body">
              <div className="dashboard-panel-content">
                <TableSkeleton />
              </div>
            </div>
          </div>
        ) : (
          <div className="panel dashboard-panel dashboard-modern-panel dashboard-jobs-table-card">
            <div className="panel-header dashboard-modern-panel-header">
              <span className="panel-header-title">Jobs overview</span>
            </div>
            <div className="panel-body dashboard-modern-panel-body">
              <div className="dashboard-jobs-table-wrap">
                {jobsTableRows.length === 0 ? (
                  <div className="dashboard-empty">No jobs yet. Create a job to get started.</div>
                ) : (
                  <table className="dashboard-jobs-table">
                    <thead>
                      <tr>
                        <th>Job title</th>
                        <th>Status</th>
                        <th>Applicants</th>
                        <th>Latest stage (sample)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobsTableRows.map(({ job, applicants, stage }) => (
                        <tr key={job.id}>
                          <td>
                            <Link to={`/account/${accountId}/jobs/${job.id}/edit`} className="dashboard-jobs-table-link">
                              {job.title}
                            </Link>
                            <div className="dashboard-jobs-table-sub">{job.department ?? '—'} · {job.location ?? 'TBD'}</div>
                          </td>
                          <td>
                            <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-gray'}`}>
                              {formatDashboardLabel(job.status)}
                            </span>
                          </td>
                          <td>
                            <strong>{applicants}</strong>
                          </td>
                          <td>
                            {applicants === 0 ? (
                              <span className="dashboard-jobs-table-muted">—</span>
                            ) : (
                              <span className="dashboard-jobs-table-stage">{stage}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

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
                <div className="dashboard-footnote">Select a role to update pipeline, sources, and trend panels below.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Selected Job Pipeline">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <PanelSkeleton lines={2} />
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
                <div className="dashboard-footnote">Click a metric to inspect records for the selected job.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Source of Candidates (Selected Job)">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <PanelSkeleton />
            ) : sourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data is available for this job.</div>
            ) : (
              <>
                <div className="dashboard-chart-shell dashboard-source-pie">
                  <Doughnut data={sourcePieData} options={sourcePieOptions} />
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
                <div className="dashboard-chart-shell dashboard-chart-shell-short dashboard-source-bar">
                  <Bar
                    data={{
                      labels: sourceSlices.map(s => s.label),
                      datasets: [
                        {
                          data: sourceSlices.map(s => s.value),
                          backgroundColor: sourceSlices.map(s => s.color),
                          borderRadius: 8,
                          maxBarThickness: 36,
                        },
                      ],
                    }}
                    options={barOptions}
                  />
                </div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Upcoming Interviews (Selected Scope)">
          <div className="dashboard-panel-content">
            {interviewsLoading ? (
              <PanelSkeleton lines={2} />
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
