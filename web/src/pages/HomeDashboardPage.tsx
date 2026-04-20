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
import { getAuditLog, type AuditLogEntry } from '../api/auditLog'
import DashboardKpiCard from '../components/dashboard/DashboardKpiCard'
import DashboardPanel from '../components/dashboard/DashboardPanel'
import {
  applicationVolumeTrend,
  interviewsScheduledTrend,
  newCandidatesTrend,
  offersReleasedTrend,
  openJobsTrend,
  pipelineFunnelChartData,
  topJobsByApplicants,
  uniqueCandidateCount,
  workspacePipelineCounts,
  workspaceSourceSlices,
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

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler)

function DashboardPanelSkeleton() {
  return (
    <div className="dashboard-skeleton-panel" aria-hidden>
      <div className="dashboard-skeleton-line dashboard-skeleton-line--title" />
      <div className="dashboard-skeleton-line" />
      <div className="dashboard-skeleton-line dashboard-skeleton-line--short" />
      <div className="dashboard-skeleton-chart" />
    </div>
  )
}

function LoadingRow() {
  return (
    <div className="dashboard-loading-inline">
      <div className="spinner dashboard-loading-spinner" />
      <span>Loading…</span>
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

function auditActivitySummary(row: AuditLogEntry): string {
  const m = row.metadata || {}
  const fromMeta = typeof m.summary === 'string' ? m.summary.trim() : ''
  if (fromMeta) return fromMeta
  if (row.action) return String(row.action)
  const method = (row.http_method || '').toUpperCase()
  const path = row.path || ''
  if (method && path) return `${method} ${path}`
  return 'Workspace activity'
}

function isWritableAudit(row: AuditLogEntry): boolean {
  const m = (row.http_method || '').toUpperCase()
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE'
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
  const [jobApplications, setJobApplications] = useState<Application[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const [activePipelineModal, setActivePipelineModal] = useState<PipelineModalKind | null>(null)
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(true)

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
        per_page: 80,
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

    applicationsApi
      .list(token)
      .then(rows => {
        if (!cancelled) setAllApplications(rows)
      })
      .catch(() => {
        if (!cancelled) setAllApplications([])
      })

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    setAuditLoading(true)
    getAuditLog(token, { page: 1, per_page: 30, log_category: 'audit' })
      .then(res => {
        if (!cancelled) setAuditEntries(res.entries)
      })
      .catch(() => {
        if (!cancelled) setAuditEntries([])
      })
      .finally(() => {
        if (!cancelled) setAuditLoading(false)
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
  const currentMonthApplications = monthlyTrend[monthlyTrend.length - 1]?.value ?? 0
  const previousMonthApplications = monthlyTrend[monthlyTrend.length - 2]?.value ?? 0
  const monthlyDelta = currentMonthApplications - previousMonthApplications
  const monthlyDeltaLabel = `${monthlyDelta > 0 ? '+' : ''}${monthlyDelta}`
  const maxSourceValue = Math.max(...sourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'

  const uniqueCandidates = useMemo(() => uniqueCandidateCount(allApplications), [allApplications])
  const workspacePipeline = useMemo(() => workspacePipelineCounts(allApplications), [allApplications])
  const funnelChart = useMemo(() => pipelineFunnelChartData(workspacePipeline), [workspacePipeline])
  const workspaceSourceEntries = useMemo(() => workspaceSourceSlices(allApplications), [allApplications])
  const workspaceSourceChartSlices = useMemo(
    () =>
      workspaceSourceEntries.map(([label, value], index) => ({
        key: label,
        label: formatDashboardLabel(label),
        value,
        color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
      })),
    [workspaceSourceEntries],
  )
  const jobsApplicantBar = useMemo(() => topJobsByApplicants(allApplications, jobs, 10), [allApplications, jobs])
  const jobTitleLookup = useMemo(() => new Map(jobs.map(j => [j.id, j.title])), [jobs])
  const offersReleasedCount = useMemo(
    () => allApplications.filter(a => a.status === 'offer').length,
    [allApplications],
  )

  const trendCandidates = useMemo(() => newCandidatesTrend(allApplications), [allApplications])
  const trendOpenJobs = useMemo(() => openJobsTrend(jobs), [jobs])
  const trendInterviews = useMemo(() => interviewsScheduledTrend(interviews), [interviews])
  const trendOffers = useMemo(() => offersReleasedTrend(allApplications), [allApplications])
  const trendApplications = useMemo(() => applicationVolumeTrend(allApplications), [allApplications])

  const applicantsByJobId = useMemo(() => {
    const m = new Map<number, Application[]>()
    for (const a of allApplications) {
      const list = m.get(a.job_id)
      if (list) list.push(a)
      else m.set(a.job_id, [a])
    }
    return m
  }, [allApplications])

  const activityRows = useMemo(() => {
    type Row = { id: string; at: string; title: string; meta: string }
    const rows: Row[] = []
    for (const e of auditEntries) {
      if (!isWritableAudit(e) || !e.created_at) continue
      rows.push({
        id: `audit-${e.id}`,
        at: e.created_at,
        title: auditActivitySummary(e),
        meta: e.actor_display?.trim() || 'Workspace',
      })
    }
    const hiredRecent = [...allApplications]
      .filter(a => a.status === 'hired')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 4)
    for (const a of hiredRecent) {
      rows.push({
        id: `hired-${a.id}`,
        at: a.updated_at,
        title: `Candidate hired`,
        meta: `${a.candidate_name || a.candidate_email} · ${jobTitleLookup.get(a.job_id) ?? `Job #${a.job_id}`}`,
      })
    }
    const offerRecent = [...allApplications]
      .filter(a => a.status === 'offer')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 4)
    for (const a of offerRecent) {
      rows.push({
        id: `offer-${a.id}`,
        at: a.updated_at,
        title: `Offer released`,
        meta: `${a.candidate_name || a.candidate_email} · ${jobTitleLookup.get(a.job_id) ?? `Job #${a.job_id}`}`,
      })
    }
    const interviewRecent = [...interviews]
      .filter(r => r.scheduled_at && (r.status === 'scheduled' || r.status === 'pending'))
      .sort((a, b) => new Date(b.scheduled_at!).getTime() - new Date(a.scheduled_at!).getTime())
      .slice(0, 5)
    for (const r of interviewRecent) {
      const jid = r.job?.id ?? r.application?.job_id
      rows.push({
        id: `int-${r.id}`,
        at: r.scheduled_at!,
        title: `Interview scheduled`,
        meta: `${r.application?.candidate_name || r.application?.candidate_email || 'Candidate'} · ${r.job?.title ?? (jid != null ? jobTitleLookup.get(jid) ?? `Job #${jid}` : 'Job')}`,
      })
    }
    const applyRecent = [...allApplications]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
    for (const a of applyRecent) {
      rows.push({
        id: `app-${a.id}`,
        at: a.created_at,
        title: `New application`,
        meta: `${a.candidate_name || a.candidate_email} · ${jobTitleLookup.get(a.job_id) ?? `Job #${a.job_id}`}`,
      })
    }
    rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    const seen = new Set<string>()
    const deduped: Row[] = []
    for (const r of rows) {
      if (seen.has(r.id)) continue
      seen.add(r.id)
      deduped.push(r)
      if (deduped.length >= 14) break
    }
    return deduped
  }, [auditEntries, allApplications, interviews, jobTitleLookup])

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
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#475569', font: { size: 12, weight: 500 } },
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
            Pipeline velocity, sourcing, and role health across your workspace — drill into any job from the overview below.
          </p>
        </div>
        <div className="dashboard-hero-meta">
          <div className="dashboard-hero-meta-item">
            <span>Unique candidates</span>
            <strong>{uniqueCandidates}</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Openings fill rate</span>
            <strong>{openingFillRate}%</strong>
          </div>
          <div className="dashboard-hero-meta-item">
            <span>Application momentum</span>
            <strong>{monthlyDeltaLabel}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-kpi-grid dashboard-kpi-grid--four">
        <DashboardKpiCard
          primary
          label="Total candidates"
          value={uniqueCandidates}
          hint={`${totalApplicantsAcrossJobs} applications · ${avgApplicantsPerJob} avg / job`}
          trend={trendCandidates}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <DashboardKpiCard
          label="Active jobs"
          value={openJobs}
          hint={`${jobs.length} total roles in workspace`}
          trend={trendOpenJobs}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
          }
        />
        <DashboardKpiCard
          label="Interviews scheduled"
          value={workspaceUpcomingInterviews}
          hint="Assignments with a scheduled time"
          trend={trendInterviews}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          }
        />
        <DashboardKpiCard
          label="Offers released"
          value={offersReleasedCount}
          hint="Candidates currently in offer stage"
          trend={trendOffers}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          }
        />
      </div>

      <div className="dashboard-grid">
        <DashboardPanel title="Pipeline funnel (workspace)" span={6}>
          <div className="dashboard-panel-content">
            {funnelChart.data.every(v => v === 0) ? (
              <div className="dashboard-empty">No applications yet. Once candidates apply, funnel counts appear here.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                <Bar
                  data={{
                    labels: funnelChart.labels,
                    datasets: [
                      {
                        label: 'Candidates',
                        data: funnelChart.data,
                        backgroundColor: funnelChart.colors,
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

        <DashboardPanel title="Source of candidates (workspace)" span={6}>
          <div className="dashboard-panel-content">
            {workspaceSourceChartSlices.length === 0 ? (
              <div className="dashboard-empty">No application source data yet.</div>
            ) : (
              <DashboardDoughnutChart slices={workspaceSourceChartSlices} emptyLabel="No data" legendLabel="Sources" />
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applications over time" span={6}>
          <div className="dashboard-panel-content">
            {monthlyTrend.every(item => item.value === 0) ? (
              <div className="dashboard-empty">No recent application activity yet.</div>
            ) : (
              <>
                <div className="dashboard-chart-shell dashboard-chart-shell-short">
                  <Line
                    data={{
                      labels: monthlyTrend.map(item => item.label),
                      datasets: [
                        {
                          data: monthlyTrend.map(item => item.value),
                          borderColor: '#2563eb',
                          backgroundColor: 'rgba(37,99,235,0.12)',
                          borderWidth: 2,
                          pointRadius: 4,
                          pointHoverRadius: 5,
                          pointBackgroundColor: '#ffffff',
                          pointBorderColor: '#2563eb',
                          pointBorderWidth: 2,
                          fill: true,
                          tension: 0.32,
                        },
                      ],
                    }}
                    options={lineOptions}
                  />
                </div>
                <div className="dashboard-insight-row">
                  <div className="dashboard-insight-card">
                    <strong>{monthlyDeltaLabel}</strong>
                    <span>MoM change (last vs prior month)</span>
                  </div>
                  <div className="dashboard-insight-card">
                    <strong>{trendApplications ? `${trendApplications.direction === 'up' ? '↑' : trendApplications.direction === 'down' ? '↓' : '→'} ${trendApplications.label}` : '—'}</strong>
                    <span>28-day application volume vs prior window</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Candidates by job" span={6}>
          <div className="dashboard-panel-content">
            {jobsApplicantBar.length === 0 ? (
              <div className="dashboard-empty">No applicants mapped to jobs yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Bar
                  data={{
                    labels: jobsApplicantBar.map(({ job }) => (job.title.length > 22 ? `${job.title.slice(0, 21)}…` : job.title)),
                    datasets: [
                      {
                        label: 'Applicants',
                        data: jobsApplicantBar.map(({ count }) => count),
                        backgroundColor: jobsApplicantBar.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length]),
                        borderRadius: 6,
                        maxBarThickness: 22,
                      },
                    ],
                  }}
                  options={{
                    ...barOptions,
                    plugins: { ...barOptions.plugins, tooltip: { callbacks: { title: items => {
                      const idx = items[0]?.dataIndex
                      if (idx == null) return ''
                      return jobsApplicantBar[idx]?.job.title ?? ''
                    } } } },
                  }}
                />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Recent activity" span={5}>
          <div className="dashboard-panel-content">
            {auditLoading && activityRows.length === 0 ? (
              <DashboardPanelSkeleton />
            ) : activityRows.length === 0 ? (
              <div className="dashboard-empty">No recent activity to show yet.</div>
            ) : (
              <ul className="dashboard-activity-feed">
                {activityRows.map(row => (
                  <li key={row.id} className="dashboard-activity-item">
                    <div className="dashboard-activity-dot" aria-hidden />
                    <div className="dashboard-activity-body">
                      <div className="dashboard-activity-title">{row.title}</div>
                      <div className="dashboard-activity-meta">{row.meta}</div>
                    </div>
                    <time className="dashboard-activity-time" dateTime={row.at}>
                      {new Date(row.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
            <div className="dashboard-panel-footer">
              <Link className="dashboard-link dashboard-link--quiet" to={`/account/${accountId}/settings/audit-compliance/audit-logs`}>
                View full audit log
              </Link>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs overview" span={7}>
          <div className="dashboard-panel-content dashboard-panel-content--flush">
            {jobsLoading ? (
              <DashboardPanelSkeleton />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">Create a job to see it listed here.</div>
            ) : (
              <div className="dashboard-table-scroll">
                <table className="dashboard-jobs-table">
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Status</th>
                      <th className="dashboard-jobs-table-num">Applicants</th>
                      <th>Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(job => {
                      const applicants = applicantsByJobId.get(job.id) ?? []
                      const stageKey =
                        applicants.length === 0
                          ? '—'
                          : Object.entries(
                              applicants.reduce<Record<string, number>>((acc, a) => {
                                acc[a.status] = (acc[a.status] ?? 0) + 1
                                return acc
                              }, {}),
                            ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
                      return (
                        <tr key={job.id}>
                          <td>
                            <button type="button" className="dashboard-table-job-link" onClick={() => setSelectedJobId(String(job.id))}>
                              {job.title}
                            </button>
                            <div className="dashboard-table-job-sub">{job.department ?? 'General'} · {job.location ?? 'Location TBD'}</div>
                          </td>
                          <td>
                            <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-gray'}`}>{formatDashboardLabel(job.status)}</span>
                          </td>
                          <td className="dashboard-jobs-table-num">{applicants.length}</td>
                          <td>
                            {stageKey === '—' ? (
                              '—'
                            ) : (
                              <span className={`tag ${STAGE_COLORS[stageKey] ?? 'tag-blue'}`}>{formatDashboardLabel(stageKey)}</span>
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
