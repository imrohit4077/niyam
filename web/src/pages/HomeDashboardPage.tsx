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
import { IconBriefcase, IconCalendar, IconDocument, IconUsers } from '../components/dashboard/DashboardIcons'
import { DashboardSummaryCard } from '../components/dashboard/DashboardSummaryCard'
import { trendFromPeriods } from '../components/dashboard/dashboardTrend'
import { DashboardChartSkeleton, DashboardPanelSkeleton, DashboardTableSkeleton } from '../components/dashboard/DashboardSkeleton'

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

const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

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

function DashboardPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel dashboard-panel dashboard-modern-panel">
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
  const workspaceOffersCount = allApplications.filter(application => application.status === 'offer').length
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

  const applicantsByJobId = useMemo(() => {
    const map = new Map<number, Application[]>()
    allApplications.forEach(application => {
      const list = map.get(application.job_id) ?? []
      list.push(application)
      map.set(application.job_id, list)
    })
    return map
  }, [allApplications])

  const jobDistribution = useMemo(() => {
    const counts = allApplications.reduce<Record<number, number>>((acc, application) => {
      acc[application.job_id] = (acc[application.job_id] ?? 0) + 1
      return acc
    }, {})
    return jobs
      .map(job => ({ job, count: counts[job.id] ?? 0 }))
      .filter(row => row.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [allApplications, jobs])

  const workspaceFunnel = useMemo(() => {
    const tallies = PIPELINE_FUNNEL_STAGES.reduce<Record<string, number>>((acc, stage) => {
      acc[stage] = 0
      return acc
    }, {})
    allApplications.forEach(application => {
      const status = application.status
      if (status in tallies) tallies[status] += 1
    })
    return PIPELINE_FUNNEL_STAGES.map(stage => ({
      stage,
      label: formatDashboardLabel(stage),
      value: tallies[stage] ?? 0,
    }))
  }, [allApplications])

  const activityFeed = useMemo(() => {
    type FeedItem = {
      id: string
      title: string
      detail: string
      at: string
      color: string
    }
    const items: FeedItem[] = []

    allApplications.slice(0, 80).forEach(application => {
      const jobTitle = jobs.find(j => j.id === application.job_id)?.title ?? `Job #${application.job_id}`
      items.push({
        id: `app-${application.id}`,
        title: 'Application received',
        detail: `${application.candidate_name || application.candidate_email} · ${jobTitle}`,
        at: application.created_at,
        color: '#3b82f6',
      })
    })

    interviews.forEach(row => {
      const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
      const jobTitle = row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`
      items.push({
        id: `int-${row.id}`,
        title: 'Interview activity',
        detail: `${name} · ${jobTitle}`,
        at: row.scheduled_at || row.updated_at,
        color: '#0ea5e9',
      })
    })

    return items
      .filter(item => item.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 12)
  }, [allApplications, interviews, jobs])

  const currentMonthApplications = monthlyTrend[monthlyTrend.length - 1]?.value ?? 0
  const previousMonthApplications = monthlyTrend[monthlyTrend.length - 2]?.value ?? 0
  const applicationsTrend = trendFromPeriods(currentMonthApplications, previousMonthApplications)
  const previousMonthOpenJobs = useMemo(() => {
    const anchor = new Date()
    anchor.setMonth(anchor.getMonth() - 1)
    return jobs.filter(job => {
      const created = new Date(job.created_at)
      if (created > anchor) return false
      if (job.status !== 'open') return false
      if (job.closes_at) {
        const closes = new Date(job.closes_at)
        if (!Number.isNaN(closes.getTime()) && closes < anchor) return false
      }
      return true
    }).length
  }, [jobs])
  const openJobsTrend = trendFromPeriods(openJobs, previousMonthOpenJobs)
  const currentMonthInterviews = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return interviews.filter(row => {
      const t = row.scheduled_at || row.created_at
      if (!t) return false
      const d = new Date(t)
      return d >= start && d <= now
    }).length
  }, [interviews])
  const previousMonthInterviews = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    return interviews.filter(row => {
      const t = row.scheduled_at || row.created_at
      if (!t) return false
      const d = new Date(t)
      return d >= start && d <= end
    }).length
  }, [interviews])
  const interviewsTrend = trendFromPeriods(currentMonthInterviews, previousMonthInterviews)
  const currentMonthOffers = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return allApplications.filter(application => {
      if (application.status !== 'offer') return false
      const d = new Date(application.updated_at)
      return d >= start && d <= now
    }).length
  }, [allApplications])
  const previousMonthOffers = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    return allApplications.filter(application => {
      if (application.status !== 'offer') return false
      const d = new Date(application.updated_at)
      return d >= start && d <= end
    }).length
  }, [allApplications])
  const offersTrend = trendFromPeriods(currentMonthOffers, previousMonthOffers)
  const funnelChartData = {
    labels: workspaceFunnel.map(row => row.label),
    datasets: [
      {
        label: 'Candidates',
        data: workspaceFunnel.map(row => row.value),
        backgroundColor: workspaceFunnel.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length]),
        borderRadius: 8,
        maxBarThickness: 48,
      },
    ],
  }
  const funnelBarOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
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
  const pieOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
    },
  }
  const jobBarData = {
    labels: jobDistribution.map(row => (row.job.title.length > 28 ? `${row.job.title.slice(0, 26)}…` : row.job.title)),
    datasets: [
      {
        label: 'Applicants',
        data: jobDistribution.map(row => row.count),
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
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#475569', font: { size: 10 } },
        grid: { display: false },
      },
    },
  }
  const pieChartData =
    sourceSlices.length > 0
      ? {
          labels: sourceSlices.map(s => s.label),
          datasets: [
            {
              data: sourceSlices.map(s => s.value),
              backgroundColor: sourceSlices.map(s => s.color),
              borderColor: '#ffffff',
              borderWidth: 2,
            },
          ],
        }
      : null
  const maxSourceValue = Math.max(...sourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'
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
            Pipeline health, hiring velocity, and role-level detail in one calm overview—built for how recruiting teams actually work.
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

      <div className="dashboard-kpi-grid">
        {applicationsLoading || jobsLoading ? (
          <>
            {[0, 1, 2, 3].map(i => (
              <article
                key={i}
                className={`dashboard-kpi-card dashboard-kpi-card--skeleton${i === 0 ? ' dashboard-kpi-primary' : ''}`}
              >
                <div className="dashboard-kpi-card-head">
                  <span className="dashboard-kpi-icon" aria-hidden>
                    <span className="dashboard-kpi-skeleton-block" style={{ width: 22, height: 22, borderRadius: 6 }} />
                  </span>
                  <span className="dashboard-kpi-label">Loading</span>
                </div>
                <div className="dashboard-kpi-value-row">
                  <strong>—</strong>
                  <span className="dashboard-kpi-trend dashboard-kpi-trend--flat">—</span>
                </div>
                <div className="dashboard-kpi-skeleton-block" style={{ width: '88%', maxWidth: 200, height: 10, marginTop: 12 }} />
              </article>
            ))}
          </>
        ) : (
          <>
            <DashboardSummaryCard
              primary
              icon={<IconUsers />}
              label="Total candidates"
              value={totalApplicantsAcrossJobs}
              trend={applicationsTrend}
              footnote={`${avgApplicantsPerJob} avg per job · ${jobs.length} roles`}
            />
            <DashboardSummaryCard
              icon={<IconBriefcase />}
              label="Active jobs"
              value={openJobs}
              trend={openJobsTrend}
              footnote={`${jobs.length} total requisitions`}
            />
            <DashboardSummaryCard
              icon={<IconCalendar />}
              label="Interviews scheduled"
              value={workspaceUpcomingInterviews}
              trend={interviewsTrend}
              footnote={`${scheduledInterviews} in scope for selected role`}
            />
            <DashboardSummaryCard
              icon={<IconDocument />}
              label="Offers released"
              value={workspaceOffersCount}
              trend={offersTrend}
              footnote="Candidates currently in offer stage"
            />
          </>
        )}
      </div>

      <div className="dashboard-charts-row">
        <div className="dashboard-chart-tile">
          <h3 className="dashboard-chart-tile-title">Pipeline funnel (workspace)</h3>
          {applicationsLoading ? (
            <DashboardChartSkeleton short />
          ) : workspaceFunnel.every(row => row.value === 0) ? (
            <div className="dashboard-empty">No candidates in these stages yet.</div>
          ) : (
            <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
              <Bar data={funnelChartData} options={funnelBarOptions} />
            </div>
          )}
        </div>
        <div className="dashboard-chart-tile">
          <h3 className="dashboard-chart-tile-title">Applications over time</h3>
          {applicationsLoading ? (
            <DashboardChartSkeleton short />
          ) : monthlyTrend.every(item => item.value === 0) ? (
            <div className="dashboard-empty">No application activity in the last six months.</div>
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
        <div className="dashboard-chart-tile">
          <h3 className="dashboard-chart-tile-title">Candidates by job</h3>
          {applicationsLoading || jobsLoading ? (
            <DashboardChartSkeleton short />
          ) : jobDistribution.length === 0 ? (
            <div className="dashboard-empty">No applicants mapped to jobs yet.</div>
          ) : (
            <div className="dashboard-chart-shell dashboard-chart-shell-short">
              <Bar data={jobBarData} options={jobBarOptions} />
            </div>
          )}
        </div>
        <div className="dashboard-chart-tile">
          <h3 className="dashboard-chart-tile-title">Source of candidates (selected job)</h3>
          {analyticsLoading ? (
            <DashboardChartSkeleton short />
          ) : !pieChartData ? (
            <div className="dashboard-empty">Select a job with applicants to see source mix.</div>
          ) : (
            <div className="dashboard-chart-shell dashboard-chart-shell-short">
              <Pie data={pieChartData} options={pieOptions} />
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
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
              <DashboardPanelSkeleton rows={4} />
            ) : sourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data is available for this job.</div>
            ) : (
              <>
                <div className="dashboard-chart-shell dashboard-chart-shell-short">
                  <Pie
                    data={{
                      labels: sourceSlices.map(slice => slice.label),
                      datasets: [
                        {
                          data: sourceSlices.map(slice => slice.value),
                          backgroundColor: sourceSlices.map(slice => slice.color),
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
                    <strong>{sourceSlices.length}</strong>
                    <span>Distinct source channels</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Recent activity">
          <div className="dashboard-panel-content">
            {applicationsLoading || interviewsLoading ? (
              <DashboardPanelSkeleton rows={5} />
            ) : activityFeed.length === 0 ? (
              <div className="dashboard-empty">No recent applications or interviews yet.</div>
            ) : (
              <div className="dashboard-activity-list">
                {activityFeed.map(item => (
                  <div key={item.id} className="dashboard-activity-item">
                    <span className="dashboard-activity-dot" style={{ backgroundColor: item.color }} />
                    <div className="dashboard-activity-body">
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <time className="dashboard-activity-time" dateTime={item.at}>
                      {new Date(item.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs overview">
          <div className="dashboard-panel-content">
            {jobsLoading ? (
              <DashboardTableSkeleton />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">Create a job to see it listed here.</div>
            ) : (
              <div className="dashboard-jobs-table-wrap">
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
                      const jobApps = applicantsByJobId.get(job.id) ?? []
                      const byStatus = jobApps.reduce<Record<string, number>>((acc, a) => {
                        acc[a.status] = (acc[a.status] ?? 0) + 1
                        return acc
                      }, {})
                      const stageFocus =
                        jobApps.length === 0
                          ? null
                          : PIPELINE_FUNNEL_STAGES.map(s => ({ s, n: byStatus[s] ?? 0 })).sort((a, b) => b.n - a.n)[0]?.s ?? null
                      return (
                        <tr key={job.id}>
                          <td>
                            <strong>{job.title}</strong>
                            <div className="dashboard-jobs-table-sub">{job.department ?? '—'} · {job.location ?? '—'}</div>
                          </td>
                          <td>
                            <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-gray'}`}>{formatDashboardLabel(job.status)}</span>
                          </td>
                          <td>{jobApps.length}</td>
                          <td>
                            {stageFocus ? (
                              <span className={`tag ${STAGE_COLORS[stageFocus] ?? 'tag-blue'}`}>{formatDashboardLabel(stageFocus)}</span>
                            ) : (
                              <span className="dashboard-jobs-table-muted">—</span>
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
