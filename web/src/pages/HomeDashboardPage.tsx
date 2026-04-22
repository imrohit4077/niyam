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
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { DashboardJobsTable, type JobRowStage } from '../components/dashboard/DashboardJobsTable'
import { SummaryStatCard, type SummaryTrend } from '../components/dashboard/SummaryStatCard'
import { formatDashboardLabel, formatDateTimeShort, formatRelativeTime } from '../components/dashboard/dashboardFormatters'

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

const DASHBOARD_CHART_COLORS = ['#0ea5e9', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6']

const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

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

function countApplicationsInRange(applications: Application[], start: Date, end: Date, field: 'created_at' | 'updated_at') {
  const s = start.getTime()
  const e = end.getTime()
  return applications.filter(a => {
    const t = new Date(a[field]).getTime()
    return t >= s && t < e
  }).length
}

function computePercentTrend(current: number, previous: number): SummaryTrend | null {
  if (current === 0 && previous === 0) return null
  if (previous === 0) {
    if (current === 0) return null
    return { direction: 'up', label: 'New' }
  }
  const raw = Math.round(((current - previous) / previous) * 100)
  if (raw === 0) return { direction: 'flat', label: '0%' }
  if (raw > 0) return { direction: 'up', label: `${raw}%` }
  return { direction: 'down', label: `${Math.abs(raw)}%` }
}

function statusToneForStage(status: string): JobRowStage['tone'] {
  if (status === 'hired' || status === 'offer') return 'success'
  if (status === 'interview' || status === 'screening') return 'progress'
  if (status === 'rejected' || status === 'withdrawn') return 'warning'
  return 'neutral'
}

function dominantStageFromApplications(apps: Application[]): JobRowStage | null {
  if (apps.length === 0) return null
  const counts = apps.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  const priority = ['hired', 'offer', 'interview', 'screening', 'applied', 'rejected', 'withdrawn']
  const topStatus = Object.entries(counts).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return priority.indexOf(a[0]) - priority.indexOf(b[0])
  })[0]?.[0]
  if (!topStatus) return null
  return { label: formatDashboardLabel(topStatus), tone: statusToneForStage(topStatus) }
}

type ActivityItem = {
  id: string
  at: string
  title: string
  detail: string
  kind: 'application' | 'interview' | 'stage'
}

function jobTitleById(jobs: Job[], jobId: number) {
  return jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`
}

function buildActivityFeed(
  applications: Application[],
  interviewRows: InterviewAssignmentRow[],
  jobs: Job[],
): ActivityItem[] {
  const items: ActivityItem[] = []

  const recentApps = [...applications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 18)

  for (const app of recentApps) {
    const jt = jobTitleById(jobs, app.job_id)
    const name = app.candidate_name || app.candidate_email
    items.push({
      id: `app-${app.id}`,
      at: app.created_at,
      title: 'New application',
      detail: `${name} · ${jt}`,
      kind: 'application',
    })
    const history = app.stage_history
    if (history?.length) {
      const last = [...history].sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())[0]
      if (last && new Date(last.changed_at).getTime() > new Date(app.created_at).getTime() + 60_000) {
        items.push({
          id: `stage-${app.id}-${last.changed_at}`,
          at: last.changed_at,
          title: `Stage · ${formatDashboardLabel(last.stage)}`,
          detail: `${name} · ${jt}`,
          kind: 'stage',
        })
      }
    }
  }

  for (const row of interviewRows) {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jt = row.job?.title ?? jobTitleById(jobs, row.application?.job_id ?? 0)
    const at = row.scheduled_at || row.updated_at
    items.push({
      id: `int-${row.id}`,
      at,
      title: row.scheduled_at ? 'Interview scheduled' : `Interview · ${formatDashboardLabel(row.status)}`,
      detail: `${name} · ${jt}`,
      kind: 'interview',
    })
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 14)
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
    <div className="dashboard-chart-shell dashboard-chart-shell-compact">
      <Doughnut data={chartData} options={options} />
    </div>
  )
}

function DashboardPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="panel dashboard-panel dashboard-modern-panel">
      <div className="panel-header dashboard-modern-panel-header">
        <div className="dashboard-panel-title-block">
          <span className="panel-header-title">{title}</span>
          {subtitle ? <span className="dashboard-panel-subtitle">{subtitle}</span> : null}
        </div>
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}

const iconCandidates = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const iconBriefcase = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
)

const iconCalendar = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const iconGift = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect x="2" y="7" width="20" height="5" />
    <line x1="12" y1="22" x2="12" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
)

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

    void (async () => {
      setJobsLoading(true)
      setJobsError('')
      try {
        const rows = await jobsApi.list(token)
        if (cancelled) return
        setJobs(rows)
        setSelectedJobId(current => {
          if (current && rows.some(job => String(job.id) === current)) return current
          const preferred = rows.find(job => job.status === 'open') ?? rows[0]
          return preferred ? String(preferred.id) : ''
        })
      } catch (e) {
        if (!cancelled) setJobsError(e instanceof Error ? e.message : 'Failed to load jobs')
      } finally {
        if (!cancelled) setJobsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setInterviewsLoading(true)
      setInterviewsError('')
      try {
        const res = await interviewsApi.myAssignments(token, {
          include_open: true,
          page: 1,
          per_page: 12,
        })
        if (!cancelled) setInterviews(res.entries)
      } catch (e) {
        if (!cancelled) setInterviewsError(e instanceof Error ? e.message : 'Failed to load interviews')
      } finally {
        if (!cancelled) setInterviewsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setApplicationsLoading(true)
      try {
        const rows = await applicationsApi.list(token)
        if (!cancelled) setAllApplications(rows)
      } catch {
        if (!cancelled) setAllApplications([])
      } finally {
        if (!cancelled) setApplicationsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      if (!selectedJobId) {
        setJobApplications([])
        setAnalyticsError('')
        setAnalyticsLoading(false)
        return
      }

      setAnalyticsLoading(true)
      setAnalyticsError('')
      try {
        const rows = await applicationsApi.list(token, { jobId: Number(selectedJobId) })
        if (!cancelled) setJobApplications(rows)
      } catch (e) {
        if (!cancelled) {
          setJobApplications([])
          setAnalyticsError(e instanceof Error ? e.message : 'Failed to load job applications')
        }
      } finally {
        if (!cancelled) setAnalyticsLoading(false)
      }
    })()

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

  const applicantCountByJobId = useMemo(() => {
    return allApplications.reduce<Record<number, number>>((acc, a) => {
      acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
      return acc
    }, {})
  }, [allApplications])

  const dominantStageByJobId = useMemo(() => {
    const byJob = new Map<number, Application[]>()
    for (const a of allApplications) {
      const list = byJob.get(a.job_id) ?? []
      list.push(a)
      byJob.set(a.job_id, list)
    }
    const out: Record<number, JobRowStage | null> = {}
    for (const job of jobs) {
      out[job.id] = dominantStageFromApplications(byJob.get(job.id) ?? [])
    }
    return out
  }, [allApplications, jobs])

  const activityItems = useMemo(
    () => buildActivityFeed(allApplications, interviews, jobs),
    [allApplications, interviews, jobs],
  )

  const jobDistribution = useMemo(() => {
    const entries = jobs
      .map(job => ({ job, n: applicantCountByJobId[job.id] ?? 0 }))
      .filter(x => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 10)
    return entries
  }, [jobs, applicantCountByJobId])

  const summaryStatsLoading = jobsLoading || applicationsLoading

  const summaryTrends = useMemo(() => {
    const now = new Date()
    const d30 = new Date(now)
    d30.setDate(d30.getDate() - 30)
    const d60 = new Date(now)
    d60.setDate(d60.getDate() - 60)

    const appsLast30 = countApplicationsInRange(allApplications, d30, now, 'created_at')
    const appsPrev30 = countApplicationsInRange(allApplications, d60, d30, 'created_at')

    const newListingsLast30 = jobs.filter(j => new Date(j.created_at).getTime() >= d30.getTime()).length
    const newListingsPrev30 = jobs.filter(j => {
      const t = new Date(j.created_at).getTime()
      return t >= d60.getTime() && t < d30.getTime()
    }).length
    const jobsTrend = computePercentTrend(newListingsLast30, newListingsPrev30)

    const intLast14 = interviews.filter(r => new Date(r.created_at).getTime() >= new Date(now.getTime() - 14 * 86400000).getTime()).length
    const intPrev14 = interviews.filter(r => {
      const t = new Date(r.created_at).getTime()
      const a = new Date(now.getTime() - 28 * 86400000).getTime()
      const b = new Date(now.getTime() - 14 * 86400000).getTime()
      return t >= a && t < b
    }).length

    const offers = allApplications.filter(a => a.status === 'offer')
    const offersLast30 = countApplicationsInRange(offers, d30, now, 'updated_at')
    const offersPrev30 = countApplicationsInRange(offers, d60, d30, 'updated_at')

    return {
      candidates: computePercentTrend(appsLast30, appsPrev30),
      jobs: jobsTrend,
      interviews: computePercentTrend(intLast14, intPrev14),
      offers: computePercentTrend(offersLast30, offersPrev30),
    }
  }, [allApplications, jobs, interviews])

  const offersReleasedTotal = allApplications.filter(a => a.status === 'offer').length

  const currentMonthApplications = monthlyTrend[monthlyTrend.length - 1]?.value ?? 0
  const previousMonthApplications = monthlyTrend[monthlyTrend.length - 2]?.value ?? 0
  const monthlyDelta = currentMonthApplications - previousMonthApplications
  const monthlyDeltaLabel = `${monthlyDelta > 0 ? '+' : ''}${monthlyDelta}`
  const maxSourceValue = Math.max(...sourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'

  const funnelValues = PIPELINE_FUNNEL_STAGES.map(stage => jobApplicationsByStatus[stage] ?? 0)
  const funnelLabels = [...PIPELINE_FUNNEL_STAGES].reverse().map(s => formatDashboardLabel(s))
  const funnelValuesDisplay = [...funnelValues].reverse()
  const funnelColorsDisplay = [...PIPELINE_FUNNEL_STAGES].reverse().map(
    (_, i) => DASHBOARD_CHART_COLORS[(PIPELINE_FUNNEL_STAGES.length - 1 - i) % DASHBOARD_CHART_COLORS.length],
  )
  const funnelMax = Math.max(...funnelValues, 1)

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
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.formattedValue} candidates`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: funnelMax,
        ticks: { color: '#6b7280', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.22)' },
      },
      y: {
        ticks: { color: '#374151', font: { size: 12 } },
        grid: { display: false },
      },
    },
  }

  const jobBarOptions: ChartOptions<'bar'> = {
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
        ticks: {
          color: '#4b5563',
          font: { size: 11 },
          callback: function (val) {
            const labels = jobDistribution.map(j => j.job.title)
            const i = typeof val === 'number' ? val : Number(val)
            const t = labels[i] ?? ''
            return t.length > 28 ? `${t.slice(0, 26)}…` : t
          },
        },
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
        grid: { color: 'rgba(14,165,233,0.12)' },
      },
    },
  }

  const pieOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
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
            Pipeline velocity, candidate volume, and role health — distilled into a single calm view for hiring teams.
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

      <div className="dashboard-stats-grid" role="region" aria-label="Workspace summary">
        <SummaryStatCard
          label="Total candidates"
          value={totalApplicantsAcrossJobs.toLocaleString()}
          icon={iconCandidates}
          trend={summaryTrends.candidates}
          sublabel="All applications across roles"
          highlight
          loading={summaryStatsLoading}
        />
        <SummaryStatCard
          label="Active jobs"
          value={openJobs.toLocaleString()}
          icon={iconBriefcase}
          trend={summaryTrends.jobs}
          sublabel={`${jobs.length} total listings · ${openJobs} open`}
          loading={summaryStatsLoading}
        />
        <SummaryStatCard
          label="Interviews scheduled"
          value={workspaceUpcomingInterviews.toLocaleString()}
          icon={iconCalendar}
          trend={summaryTrends.interviews}
          sublabel={`${scheduledInterviews} in scope of selected role`}
          loading={summaryStatsLoading}
        />
        <SummaryStatCard
          label="Offers released"
          value={offersReleasedTotal.toLocaleString()}
          icon={iconGift}
          trend={summaryTrends.offers}
          sublabel="Candidates currently in offer stage"
          loading={summaryStatsLoading}
        />
      </div>

      <p className="dashboard-inline-meta">
        Application flow this month: <strong>{currentMonthApplications}</strong> vs {previousMonthApplications} last month ({monthlyDeltaLabel})
      </p>

      <div className="dashboard-grid">
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
                <div className="dashboard-footnote">Select a role to refresh pipeline, sources, and funnel charts.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Role pipeline" subtitle={selectedJob?.title ?? 'Pick a job'}>
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

                <div className="dashboard-split-charts">
                  <div>
                    <p className="dashboard-chart-caption">Hiring funnel</p>
                    {funnelValues.every(v => v === 0) ? (
                      <div className="dashboard-empty dashboard-empty-tight">No applicants in funnel stages for this role.</div>
                    ) : (
                      <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                        <Bar
                          data={{
                            labels: funnelLabels,
                            datasets: [
                              {
                                data: funnelValuesDisplay,
                                backgroundColor: funnelColorsDisplay,
                                borderRadius: 8,
                                barThickness: 22,
                              },
                            ],
                          }}
                          options={funnelBarOptions}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="dashboard-chart-caption">Stage mix</p>
                    <DashboardDoughnutChart
                      slices={analyticsSlices}
                      emptyLabel="No stage data for this role."
                      legendLabel="Applicants"
                    />
                  </div>
                </div>

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
                    <span>Rejected / withdrawn</span>
                  </div>
                </div>
                <div className="dashboard-footnote">Click a metric to open candidate-level detail.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Candidate sources" subtitle="Workspace">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <LoadingRow />
            ) : workspaceSourceSlices.length === 0 ? (
              <div className="dashboard-empty">No source data yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-pie">
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

        <DashboardPanel title="Top sources" subtitle="Selected role">
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
                    <span>Top channel</span>
                  </div>
                  <div className="dashboard-insight-card">
                    <strong>{sourceSlices.length}</strong>
                    <span>Distinct channels</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applications over time" subtitle="Last 6 months · workspace">
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

        <DashboardPanel title="Applicants by job" subtitle="Top roles by volume">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <LoadingRow />
            ) : jobDistribution.length === 0 ? (
              <div className="dashboard-empty">No applicants yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-jobs-bar">
                <Bar
                  data={{
                    labels: jobDistribution.map(j => j.job.title),
                    datasets: [
                      {
                        data: jobDistribution.map(j => j.n),
                        backgroundColor: 'rgba(14,165,233,0.55)',
                        borderRadius: 6,
                        barThickness: 18,
                      },
                    ],
                  }}
                  options={jobBarOptions}
                />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Upcoming interviews" subtitle="Filtered by selected role when set">
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

        <DashboardPanel title="Recent activity" subtitle="Applications and interviews">
          <div className="dashboard-panel-content">
            {applicationsLoading && interviewsLoading ? (
              <LoadingRow />
            ) : activityItems.length === 0 ? (
              <div className="dashboard-empty">No recent activity.</div>
            ) : (
              <ul className="dashboard-activity-list">
                {activityItems.map(item => (
                  <li key={item.id} className="dashboard-activity-item">
                    <span className={`dashboard-activity-dot dashboard-activity-dot-${item.kind}`} aria-hidden />
                    <div className="dashboard-activity-body">
                      <div className="dashboard-activity-title-row">
                        <strong>{item.title}</strong>
                        <time dateTime={item.at}>{formatRelativeTime(item.at)}</time>
                      </div>
                      <p className="dashboard-activity-detail">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs overview">
          <div className="dashboard-panel-content dashboard-panel-content-flush">
            <DashboardJobsTable
              jobs={jobs}
              applicantCountByJobId={applicantCountByJobId}
              dominantStageByJobId={dominantStageByJobId}
              accountId={accountId}
              selectedJobId={selectedJobId}
              onSelectJob={setSelectedJobId}
              loading={jobsLoading || applicationsLoading}
            />
          </div>
        </DashboardPanel>
      </div>
    </>
  )
}
