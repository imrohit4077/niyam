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
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import DashboardKpiCard, { type TrendDirection } from '../components/dashboard/DashboardKpiCard'
import { IconBriefcase, IconCalendar, IconGift, IconUsers } from '../components/dashboard/DashboardIcons'
import { DashboardChartSkeleton, DashboardPanelSkeleton } from '../components/dashboard/DashboardSkeleton'

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

const FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler)

function pctChange(current: number, previous: number): { percent: number; direction: TrendDirection } {
  if (previous === 0 && current === 0) return { percent: 0, direction: 'flat' }
  if (previous === 0) return { percent: 100, direction: 'up' }
  const raw = Math.round(((current - previous) / previous) * 100)
  const direction: TrendDirection = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  return { percent: Math.abs(raw), direction }
}

function applicationsInCalendarMonth(apps: Application[], year: number, monthZeroIndexed: number) {
  return apps.filter(a => {
    const d = new Date(a.created_at)
    return d.getFullYear() === year && d.getMonth() === monthZeroIndexed
  }).length
}

function jobsCreatedInMonth(jobsList: Job[], year: number, monthZeroIndexed: number) {
  return jobsList.filter(j => {
    const d = new Date(j.created_at)
    return d.getFullYear() === year && d.getMonth() === monthZeroIndexed
  }).length
}

function interviewAssignmentsCreatedInMonth(rows: InterviewAssignmentRow[], year: number, monthZeroIndexed: number) {
  return rows.filter(r => {
    const d = new Date(r.created_at)
    return d.getFullYear() === year && d.getMonth() === monthZeroIndexed
  }).length
}

function offersTouchedInMonth(apps: Application[], year: number, monthZeroIndexed: number) {
  return apps.filter(a => {
    if (a.status !== 'offer') return false
    const d = new Date(a.updated_at)
    return d.getFullYear() === year && d.getMonth() === monthZeroIndexed
  }).length
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
  const [allApplicationsLoading, setAllApplicationsLoading] = useState(true)
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
    setAllApplicationsLoading(true)

    applicationsApi
      .list(token)
      .then(rows => {
        if (!cancelled) setAllApplications(rows)
      })
      .catch(() => {
        if (!cancelled) setAllApplications([])
      })
      .finally(() => {
        if (!cancelled) setAllApplicationsLoading(false)
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
  const pipelineOffersTotal = allApplications.filter(a => a.status === 'offer').length
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

  const kpiMomentum = useMemo(() => {
    const now = new Date()
    const cy = now.getFullYear()
    const cm = now.getMonth()
    const py = cm === 0 ? cy - 1 : cy
    const pm = cm === 0 ? 11 : cm - 1
    return {
      candidates: pctChange(
        applicationsInCalendarMonth(allApplications, cy, cm),
        applicationsInCalendarMonth(allApplications, py, pm),
      ),
      jobs: pctChange(jobsCreatedInMonth(jobs, cy, cm), jobsCreatedInMonth(jobs, py, pm)),
      interviews: pctChange(
        interviewAssignmentsCreatedInMonth(interviews, cy, cm),
        interviewAssignmentsCreatedInMonth(interviews, py, pm),
      ),
      offers: pctChange(offersTouchedInMonth(allApplications, cy, cm), offersTouchedInMonth(allApplications, py, pm)),
    }
  }, [allApplications, jobs, interviews])

  const workspaceFunnelCounts = useMemo(() => {
    const acc: Record<string, number> = {}
    FUNNEL_STATUSES.forEach(s => {
      acc[s] = 0
    })
    allApplications.forEach(application => {
      const s = application.status
      if ((FUNNEL_STATUSES as readonly string[]).includes(s)) acc[s] = (acc[s] ?? 0) + 1
    })
    return FUNNEL_STATUSES.map(status => ({
      key: status,
      label: formatDashboardLabel(status),
      value: acc[status] ?? 0,
    }))
  }, [allApplications])

  const workspaceApplicantsByJob = useMemo(() => {
    const map = new Map<number, { title: string; count: number }>()
    allApplications.forEach(application => {
      const job = jobs.find(j => j.id === application.job_id)
      const title = job?.title ?? `Job #${application.job_id}`
      const cur = map.get(application.job_id)
      if (cur) cur.count += 1
      else map.set(application.job_id, { title, count: 1 })
    })
    return [...map.entries()]
      .map(([, v]) => v)
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
  }, [allApplications, jobs])

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

  const activityFeed = useMemo(() => {
    type FeedEntry = { ts: number; key: string; label: string; detail: string; href?: string }
    const entries: FeedEntry[] = []

    allApplications.forEach(application => {
      const name = application.candidate_name || application.candidate_email || 'Candidate'
      const job = jobs.find(j => j.id === application.job_id)
      entries.push({
        ts: new Date(application.created_at).getTime(),
        key: `app-created-${application.id}`,
        label: 'Application received',
        detail: `${name} · ${job?.title ?? `Job #${application.job_id}`}`,
        href: `/account/${accountId}/job-applications/${application.id}`,
      })
    })

    interviews.forEach(row => {
      const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
      const when = row.scheduled_at || row.created_at
      entries.push({
        ts: new Date(when).getTime(),
        key: `int-${row.id}`,
        label: row.scheduled_at ? 'Interview scheduled' : 'Interview activity',
        detail: `${name} · ${row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`}`,
        href: row.application ? `/account/${accountId}/job-applications/${row.application.id}` : undefined,
      })
    })

    allApplications.forEach(application => {
      const history = application.stage_history ?? []
      const last = history.length ? history[history.length - 1] : null
      if (!last) return
      const name = application.candidate_name || application.candidate_email || 'Candidate'
      const job = jobs.find(j => j.id === application.job_id)
      entries.push({
        ts: new Date(last.changed_at).getTime(),
        key: `stage-${application.id}-${last.changed_at}`,
        label: `Stage → ${formatDashboardLabel(last.stage)}`,
        detail: `${name} · ${job?.title ?? `Job #${application.job_id}`}`,
        href: `/account/${accountId}/job-applications/${application.id}`,
      })
    })

    return entries
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 18)
  }, [allApplications, interviews, jobs, accountId])

  const funnelChartData = useMemo(
    () => ({
      labels: workspaceFunnelCounts.map(f => f.label),
      datasets: [
        {
          label: 'Candidates',
          data: workspaceFunnelCounts.map(f => f.value),
          backgroundColor: workspaceFunnelCounts.map(
            (_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length],
          ),
          borderRadius: 8,
          maxBarThickness: 32,
        },
      ],
    }),
    [workspaceFunnelCounts],
  )

  const jobDistributionChartData = useMemo(
    () => ({
      labels: workspaceApplicantsByJob.map(j => j.title),
      datasets: [
        {
          data: workspaceApplicantsByJob.map(j => j.count),
          backgroundColor: workspaceApplicantsByJob.map(
            (_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length],
          ),
          borderRadius: 8,
          maxBarThickness: 36,
        },
      ],
    }),
    [workspaceApplicantsByJob],
  )

  const sourcePieData = useMemo(
    () => ({
      labels: workspaceSourceSlices.map(s => s.label),
      datasets: [
        {
          data: workspaceSourceSlices.map(s => s.value),
          backgroundColor: workspaceSourceSlices.map(s => s.color),
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    }),
    [workspaceSourceSlices],
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
          <h2 className="dashboard-title">{user.account?.name ?? 'Your Workspace'}</h2>
          <p className="dashboard-subtitle">
            Pipeline health, hiring velocity, and team activity across your workspace.
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

      <div className="dashboard-kpi-grid dashboard-kpi-grid--four">
        {allApplicationsLoading || jobsLoading ? (
          <>
            <div className="dashboard-kpi-skeleton" aria-hidden />
            <div className="dashboard-kpi-skeleton" aria-hidden />
            <div className="dashboard-kpi-skeleton" aria-hidden />
            <div className="dashboard-kpi-skeleton" aria-hidden />
          </>
        ) : (
          <>
            <DashboardKpiCard
              label="Total candidates"
              value={totalApplicantsAcrossJobs}
              icon={<IconUsers />}
              trendPercent={kpiMomentum.candidates.percent}
              trendDirection={kpiMomentum.candidates.direction}
              trendLabel="vs prior month (applications created)"
              subtitle={`${avgApplicantsPerJob} avg per job · ${openingFillRate}% openings filled`}
              emphasize
            />
            <DashboardKpiCard
              label="Active jobs"
              value={openJobs}
              icon={<IconBriefcase />}
              trendPercent={kpiMomentum.jobs.percent}
              trendDirection={kpiMomentum.jobs.direction}
              trendLabel="vs prior month (new jobs)"
              subtitle={`${jobs.length} total listings`}
            />
            <DashboardKpiCard
              label="Interviews scheduled"
              value={workspaceUpcomingInterviews}
              icon={<IconCalendar />}
              trendPercent={kpiMomentum.interviews.percent}
              trendDirection={kpiMomentum.interviews.direction}
              trendLabel="vs prior month (assignments)"
              subtitle={`${scheduledInterviews} in selected job scope`}
            />
            <DashboardKpiCard
              label="Offers released"
              value={pipelineOffersTotal}
              icon={<IconGift />}
              trendPercent={kpiMomentum.offers.percent}
              trendDirection={kpiMomentum.offers.direction}
              trendLabel="vs prior month (offer updates)"
              subtitle={`${conversionRate}% hire rate on selected job`}
            />
          </>
        )}
      </div>

      <div className="dashboard-grid">
        <DashboardPanel title="Pipeline funnel (workspace)" className="dashboard-panel--span-12">
          <div className="dashboard-panel-content">
            {allApplicationsLoading ? (
              <DashboardChartSkeleton height={220} />
            ) : workspaceFunnelCounts.every(f => f.value === 0) ? (
              <div className="dashboard-empty">No candidates in pipeline stages yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Bar data={funnelChartData} options={barOptions} />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applications over time">
          <div className="dashboard-panel-content">
            {allApplicationsLoading ? (
              <DashboardChartSkeleton height={220} />
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
                        borderColor: 'var(--teal)',
                        backgroundColor: 'rgba(0, 180, 216, 0.14)',
                        borderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: 'var(--teal)',
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
            {allApplicationsLoading ? (
              <DashboardChartSkeleton height={220} />
            ) : workspaceApplicantsByJob.length === 0 ? (
              <div className="dashboard-empty">No applications yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Bar data={jobDistributionChartData} options={barOptions} />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Source of candidates (workspace)">
          <div className="dashboard-panel-content">
            {allApplicationsLoading ? (
              <DashboardChartSkeleton height={260} />
            ) : workspaceSourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data yet.</div>
            ) : (
              <div className="dashboard-chart-shell">
                <Pie data={sourcePieData} options={pieOptions} />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Activity" className="dashboard-panel--span-6">
          <div className="dashboard-panel-content">
            {allApplicationsLoading && interviewsLoading ? (
              <DashboardPanelSkeleton rows={6} />
            ) : activityFeed.length === 0 ? (
              <div className="dashboard-empty">No recent activity.</div>
            ) : (
              <ul className="dashboard-activity-feed">
                {activityFeed.map(item => {
                  const inner = (
                    <>
                      <span className="dashboard-activity-label">{item.label}</span>
                      <span className="dashboard-activity-detail">{item.detail}</span>
                      <time className="dashboard-activity-time" dateTime={new Date(item.ts).toISOString()}>
                        {new Date(item.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </time>
                    </>
                  )
                  return (
                    <li key={item.key} className="dashboard-activity-item">
                      {item.href ? (
                        <Link to={item.href} className="dashboard-activity-link">
                          {inner}
                        </Link>
                      ) : (
                        <div className="dashboard-activity-static">{inner}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs overview" className="dashboard-panel--span-6">
          <div className="dashboard-panel-content dashboard-panel-content--flush">
            {jobsLoading ? (
              <DashboardPanelSkeleton rows={5} />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">No jobs yet.</div>
            ) : (
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Status</th>
                      <th className="dashboard-table-num">Applicants</th>
                      <th>Stage focus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(job => {
                      const count = allApplications.filter(a => a.job_id === job.id).length
                      const bySt = allApplications
                        .filter(a => a.job_id === job.id)
                        .reduce<Record<string, number>>((acc, a) => {
                          acc[a.status] = (acc[a.status] ?? 0) + 1
                          return acc
                        }, {})
                      const top = Object.entries(bySt).sort((x, y) => y[1] - x[1])[0]
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
                            <span className="dashboard-table-sub">{job.department ?? '—'} · {job.location ?? '—'}</span>
                          </td>
                          <td>
                            <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-gray'}`}>{formatDashboardLabel(job.status)}</span>
                          </td>
                          <td className="dashboard-table-num">{count}</td>
                          <td>
                            {top ? (
                              <span className="dashboard-table-stage">{formatDashboardLabel(top[0])}</span>
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

        <DashboardPanel title="Jobs by status">
          <div className="dashboard-panel-content">
            {jobsLoading ? (
              <DashboardChartSkeleton height={240} />
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
                <div className="dashboard-footnote">Select a role to update pipeline and source analytics.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Selected job pipeline">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <DashboardChartSkeleton height={260} />
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

        <DashboardPanel title="Applicant sources (selected job)">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <DashboardChartSkeleton height={220} />
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

        <DashboardPanel title="Upcoming interviews (scope)">
          <div className="dashboard-panel-content">
            {interviewsLoading ? (
              <DashboardPanelSkeleton rows={4} />
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
