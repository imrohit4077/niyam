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
import { DashboardSummaryCard, DashboardSummaryGridSkeleton } from '../components/dashboard/DashboardSummaryCard'
import { formatTrendPercent, monthOverMonthPercent } from '../components/dashboard/dashboardTrendUtils'
import { IconActivity, IconBriefcase, IconCalendar, IconGift, IconUsers } from '../components/dashboard/dashboardIcons'

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
  const candidatesMomPct = monthOverMonthPercent(currentMonthApplications, previousMonthApplications)
  const candidatesTrend = formatTrendPercent(candidatesMomPct)

  const workspaceApplicationsByStatus = useMemo(
    () =>
      allApplications.reduce<Record<string, number>>((acc, application) => {
        acc[application.status] = (acc[application.status] ?? 0) + 1
        return acc
      }, {}),
    [allApplications],
  )

  const FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
  const funnelCounts = FUNNEL_STAGES.map(stage => workspaceApplicationsByStatus[stage] ?? 0)
  const funnelLabels = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired']

  const nowDate = useMemo(() => new Date(), [])
  const jobsThisMonthCount = useMemo(() => {
    const y = nowDate.getFullYear()
    const m = nowDate.getMonth()
    return jobs.filter(j => {
      const d = new Date(j.created_at)
      return d.getFullYear() === y && d.getMonth() === m
    }).length
  }, [jobs, nowDate])
  const jobsPrevMonthCount = useMemo(() => {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1)
    return jobs.filter(j => {
      const c = new Date(j.created_at)
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth()
    }).length
  }, [jobs, nowDate])
  const jobsMomPct = monthOverMonthPercent(jobsThisMonthCount, jobsPrevMonthCount)
  const jobsTrend = formatTrendPercent(jobsMomPct)

  const interviewsScheduledMom = useMemo(() => {
    const y = nowDate.getFullYear()
    const m = nowDate.getMonth()
    const inMonth = (row: InterviewAssignmentRow, year: number, month: number) => {
      const raw = row.scheduled_at || row.created_at
      if (!raw) return false
      const t = new Date(raw)
      return t.getFullYear() === year && t.getMonth() === month
    }
    const cur = interviews.filter(row => inMonth(row, y, m)).length
    const prevD = new Date(y, m - 1, 1)
    const prev = interviews.filter(row => inMonth(row, prevD.getFullYear(), prevD.getMonth())).length
    return { cur, prev }
  }, [interviews, nowDate])
  const interviewsMomPct = monthOverMonthPercent(interviewsScheduledMom.cur, interviewsScheduledMom.prev)
  const interviewsTrend = formatTrendPercent(interviewsMomPct)

  const offerEventsByMonth = useMemo(() => {
    const countMonth = (year: number, month: number) => {
      let n = 0
      for (const app of allApplications) {
        for (const h of app.stage_history ?? []) {
          if (h.stage !== 'offer') continue
          const t = new Date(h.changed_at)
          if (t.getFullYear() === year && t.getMonth() === month) n += 1
        }
      }
      return n
    }
    const y = nowDate.getFullYear()
    const m = nowDate.getMonth()
    const cur = countMonth(y, m)
    const prevD = new Date(y, m - 1, 1)
    const prev = countMonth(prevD.getFullYear(), prevD.getMonth())
    return { cur, prev }
  }, [allApplications, nowDate])
  const offersMomPct = monthOverMonthPercent(offerEventsByMonth.cur, offerEventsByMonth.prev)
  const offersTrend = formatTrendPercent(offersMomPct)
  const offersReleasedWorkspace = allApplications.filter(a => a.status === 'offer').length

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

  const truncateJobTitle = (title: string, max = 28) =>
    title.length > max ? `${title.slice(0, max - 1)}…` : title

  const jobApplicantCounts = useMemo(() => {
    const map = allApplications.reduce<Record<number, number>>((acc, application) => {
      acc[application.job_id] = (acc[application.job_id] ?? 0) + 1
      return acc
    }, {})
    return jobs
      .map(job => ({ job, count: map[job.id] ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [allApplications, jobs])

  const jobsOverviewRows = useMemo(() => {
    const byJob = new Map<number, Application[]>()
    for (const app of allApplications) {
      const list = byJob.get(app.job_id) ?? []
      list.push(app)
      byJob.set(app.job_id, list)
    }
    const dominantStage = (apps: Application[]) => {
      if (apps.length === 0) return '—'
      const order = ['hired', 'offer', 'interview', 'screening', 'applied', 'rejected', 'withdrawn'] as const
      const counts = apps.reduce<Record<string, number>>((acc, a) => {
        acc[a.status] = (acc[a.status] ?? 0) + 1
        return acc
      }, {})
      for (const st of order) {
        if ((counts[st] ?? 0) > 0) return formatDashboardLabel(st)
      }
      return formatDashboardLabel(apps[0].status)
    }
    return jobs
      .map(job => ({
        job,
        applicants: byJob.get(job.id)?.length ?? 0,
        stage: dominantStage(byJob.get(job.id) ?? []),
      }))
      .sort((a, b) => b.applicants - a.applicants)
  }, [allApplications, jobs])

  const jobTitleById = useMemo(() => {
    const m = new Map<number, string>()
    jobs.forEach(j => m.set(j.id, j.title))
    return m
  }, [jobs])

  type ActivityKind = 'application' | 'interview' | 'stage'
  type ActivityItem = { id: string; at: number; kind: ActivityKind; title: string; subtitle: string }

  const activityFeed = useMemo(() => {
    const items: ActivityItem[] = []
    for (const app of allApplications) {
      const jobTitle = jobTitleById.get(app.job_id) ?? `Job #${app.job_id}`
      const name = app.candidate_name || app.candidate_email
      items.push({
        id: `app-${app.id}`,
        at: new Date(app.created_at).getTime(),
        kind: 'application',
        title: `Candidate applied`,
        subtitle: `${name} · ${jobTitle}`,
      })
      const lastStage = app.stage_history?.[app.stage_history.length - 1]
      if (lastStage && lastStage.stage !== 'applied') {
        items.push({
          id: `stage-${app.id}-${lastStage.changed_at}`,
          at: new Date(lastStage.changed_at).getTime(),
          kind: 'stage',
          title: `Moved to ${formatDashboardLabel(lastStage.stage)}`,
          subtitle: `${name} · ${jobTitle}`,
        })
      }
    }
    for (const row of interviews) {
      const when = row.scheduled_at || row.created_at
      if (!when) continue
      const jobTitle = row.job?.title ?? jobTitleById.get(row.application?.job_id ?? 0) ?? 'Interview'
      const cand = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
      items.push({
        id: `int-${row.id}-${when}`,
        at: new Date(when).getTime(),
        kind: 'interview',
        title: row.scheduled_at ? 'Interview scheduled' : 'Interview activity',
        subtitle: `${cand} · ${jobTitle}`,
      })
    }
    items.sort((a, b) => b.at - a.at)
    return items.slice(0, 14)
  }, [allApplications, interviews, jobTitleById])

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

  const funnelOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.parsed.x?.toLocaleString?.() ?? ctx.parsed.x} candidates`,
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
        ticks: { color: '#475569', font: { size: 11 } },
        grid: { display: false },
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

  const barJobsOptions: ChartOptions<'bar'> = {
    ...barOptions,
    indexAxis: 'y',
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

  const maxSourceValue = Math.max(...sourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'
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

      {jobsLoading || applicationsLoading ? (
        <DashboardSummaryGridSkeleton />
      ) : (
        <div className="dashboard-summary-grid">
          <DashboardSummaryCard
            label="Total candidates"
            value={totalApplicantsAcrossJobs.toLocaleString()}
            icon={<IconUsers />}
            trendLabel={candidatesTrend.label}
            trendDirection={candidatesTrend.direction}
            sublabel={`${avgApplicantsPerJob} avg per job · ${monthlyDeltaLabel} vs last month`}
            highlight
          />
          <DashboardSummaryCard
            label="Active jobs"
            value={openJobs.toLocaleString()}
            icon={<IconBriefcase />}
            trendLabel={jobsTrend.label}
            trendDirection={jobsTrend.direction}
            sublabel={`${jobs.length} total roles · ${jobsThisMonthCount} created this month`}
          />
          <DashboardSummaryCard
            label="Interviews scheduled"
            value={workspaceUpcomingInterviews.toLocaleString()}
            icon={<IconCalendar />}
            trendLabel={interviewsLoading ? '—' : interviewsTrend.label}
            trendDirection={interviewsLoading ? 'flat' : interviewsTrend.direction}
            sublabel={interviewsLoading ? 'Loading calendar…' : `${interviewsScheduledMom.cur} this month`}
          />
          <DashboardSummaryCard
            label="Offers released"
            value={offersReleasedWorkspace.toLocaleString()}
            icon={<IconGift />}
            trendLabel={offersTrend.label}
            trendDirection={offersTrend.direction}
            sublabel={`${offerEventsByMonth.cur} stage moves to offer this month`}
          />
        </div>
      )}

      <section className="dashboard-charts-section" aria-labelledby="dashboard-charts-heading">
        <div className="dashboard-charts-section__head">
          <h3 id="dashboard-charts-heading" className="dashboard-charts-section__title">
            Workspace analytics
          </h3>
          <p className="dashboard-charts-section__lede">Pipeline, volume, and sourcing across all roles.</p>
        </div>
        <div className="dashboard-charts-grid">
          <DashboardPanel title="Pipeline funnel">
            <div className="dashboard-panel-content">
              {applicationsLoading ? (
                <div className="dashboard-chart-skeleton-wrap">
                  <div className="dashboard-skeleton dashboard-skeleton--chart" />
                </div>
              ) : funnelCounts.every(n => n === 0) ? (
                <div className="dashboard-empty">No candidates in pipeline stages yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                  <Bar
                    data={{
                      labels: funnelLabels,
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
                    options={funnelOptions}
                  />
                </div>
              )}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Applications over time">
            <div className="dashboard-panel-content">
              {applicationsLoading ? (
                <div className="dashboard-chart-skeleton-wrap">
                  <div className="dashboard-skeleton dashboard-skeleton--chart" />
                </div>
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
                <div className="dashboard-chart-skeleton-wrap">
                  <div className="dashboard-skeleton dashboard-skeleton--chart" />
                </div>
              ) : jobApplicantCounts.length === 0 ? (
                <div className="dashboard-empty">Add jobs to see distribution.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-jobs-bar">
                  <Bar
                    data={{
                      labels: jobApplicantCounts.map(({ job }) => truncateJobTitle(job.title)),
                      datasets: [
                        {
                          data: jobApplicantCounts.map(({ count }) => count),
                          backgroundColor: '#3b82f6',
                          borderRadius: 6,
                          maxBarThickness: 22,
                        },
                      ],
                    }}
                    options={barJobsOptions}
                  />
                </div>
              )}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Source of candidates">
            <div className="dashboard-panel-content">
              {applicationsLoading ? (
                <div className="dashboard-chart-skeleton-wrap">
                  <div className="dashboard-skeleton dashboard-skeleton--chart" />
                </div>
              ) : workspaceSourceSlices.length === 0 ? (
                <div className="dashboard-empty">No source data yet.</div>
              ) : (
                <div className="dashboard-chart-shell dashboard-chart-shell-pie">
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
        </div>
      </section>

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

        <DashboardPanel title="Activity">
          <div className="dashboard-panel-content dashboard-activity-panel">
            {applicationsLoading || interviewsLoading ? (
              <div className="dashboard-activity-skeleton">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="dashboard-activity-row dashboard-activity-row--skeleton">
                    <div className="dashboard-skeleton dashboard-skeleton--circle" />
                    <div className="dashboard-activity-skeleton-lines">
                      <div className="dashboard-skeleton dashboard-skeleton--line md" />
                      <div className="dashboard-skeleton dashboard-skeleton--line sm" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activityFeed.length === 0 ? (
              <div className="dashboard-empty">No recent activity yet.</div>
            ) : (
              <ul className="dashboard-activity-list">
                {activityFeed.map(item => (
                  <li key={item.id} className="dashboard-activity-row">
                    <span className={`dashboard-activity-icon dashboard-activity-icon--${item.kind}`} aria-hidden>
                      <IconActivity />
                    </span>
                    <div className="dashboard-activity-body">
                      <span className="dashboard-activity-title">{item.title}</span>
                      <span className="dashboard-activity-sub">{item.subtitle}</span>
                    </div>
                    <time className="dashboard-activity-time" dateTime={new Date(item.at).toISOString()}>
                      {new Date(item.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs overview">
          <div className="dashboard-panel-content dashboard-jobs-table-wrap">
            {jobsLoading ? (
              <div className="dashboard-table-skeleton">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="dashboard-table-skeleton-row">
                    <div className="dashboard-skeleton dashboard-skeleton--line lg" />
                    <div className="dashboard-skeleton dashboard-skeleton--line sm" />
                    <div className="dashboard-skeleton dashboard-skeleton--line xs" />
                    <div className="dashboard-skeleton dashboard-skeleton--line sm" />
                  </div>
                ))}
              </div>
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobsOverviewRows.length === 0 ? (
              <div className="dashboard-empty">No jobs yet. Create a role to start hiring.</div>
            ) : (
              <div className="dashboard-table-scroll">
                <table className="dashboard-jobs-table">
                  <thead>
                    <tr>
                      <th scope="col">Job title</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="dashboard-jobs-table__num">
                        Applicants
                      </th>
                      <th scope="col">Dominant stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobsOverviewRows.map(({ job, applicants, stage }) => (
                      <tr key={job.id}>
                        <td>
                          <Link className="dashboard-jobs-table__title" to={`/account/${accountId}/jobs/${job.id}/edit`}>
                            {job.title}
                          </Link>
                          <span className="dashboard-jobs-table__meta">
                            {job.department ?? 'General'} · {job.location ?? '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-gray'}`}>{formatDashboardLabel(job.status)}</span>
                        </td>
                        <td className="dashboard-jobs-table__num">{applicants.toLocaleString()}</td>
                        <td>
                          <span className="dashboard-jobs-table__stage">{stage}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DashboardPanel>
      </div>
    </>
  )
}
