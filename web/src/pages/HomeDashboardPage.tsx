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
import { DashboardPanel } from '../components/dashboard/DashboardPanel'
import {
  DashboardKpiCard,
  KpiIconCandidates,
  KpiIconInterviews,
  KpiIconJobs,
  KpiIconOffers,
} from '../components/dashboard/DashboardKpiCard'
import {
  DashboardChartSkeleton,
  DashboardKpiGridSkeleton,
  DashboardPanelSkeleton,
} from '../components/dashboard/DashboardSkeletons'
import {
  countInRange,
  formatDashboardLabel,
  formatDateTimeShort,
  formatRelativeTime,
  makeDashboardSlices,
  monthBounds,
  pctChange,
  type DashboardSlice,
} from '../components/dashboard/dashboardUtils'

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
const FUNNEL_LABELS = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'] as const

type PipelineModalKind = 'applicants' | 'interviews' | 'offers' | 'hired'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler)

function LoadingRow() {
  return <DashboardPanelSkeleton rows={5} />
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

type ActivityItem = {
  id: string
  at: string
  title: string
  subtitle: string
  kind: 'application' | 'interview'
}

const STATUS_RANK: Record<string, number> = {
  offer: 5,
  interview: 4,
  screening: 3,
  applied: 2,
  hired: 6,
  rejected: 1,
  withdrawn: 0,
}

function dominantJobStage(apps: Application[]): string {
  if (apps.length === 0) return '—'
  const counts: Record<string, number> = {}
  for (const a of apps) {
    counts[a.status] = (counts[a.status] ?? 0) + 1
  }
  let best = ''
  let bestN = -1
  for (const [st, n] of Object.entries(counts)) {
    const rank = STATUS_RANK[st] ?? 0
    const bestRank = STATUS_RANK[best] ?? 0
    if (n > bestN || (n === bestN && rank > bestRank)) {
      best = st
      bestN = n
    }
  }
  return formatDashboardLabel(best)
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

  const funnelWorkspace = useMemo(() => {
    const c: Record<string, number> = {}
    for (const s of FUNNEL_STAGES) c[s] = 0
    for (const a of allApplications) {
      if (c[a.status] !== undefined) c[a.status] += 1
    }
    return FUNNEL_STAGES.map(s => c[s])
  }, [allApplications])

  const funnelSelectedJob = useMemo(() => {
    const c: Record<string, number> = {}
    for (const s of FUNNEL_STAGES) c[s] = 0
    for (const a of jobApplications) {
      if (c[a.status] !== undefined) c[a.status] += 1
    }
    return FUNNEL_STAGES.map(s => c[s])
  }, [jobApplications])

  const jobDistribution = useMemo(() => {
    const byJob: Record<number, { title: string; n: number }> = {}
    for (const a of allApplications) {
      const j = jobs.find(job => job.id === a.job_id)
      const title = j?.title ?? `Job #${a.job_id}`
      if (!byJob[a.job_id]) byJob[a.job_id] = { title, n: 0 }
      byJob[a.job_id].n += 1
    }
    const rows = Object.entries(byJob)
      .map(([, v]) => v)
      .sort((a, b) => b.n - a.n)
      .slice(0, 10)
    return rows
  }, [allApplications, jobs])

  const appsByJobId = useMemo(() => {
    const m = new Map<number, Application[]>()
    for (const a of allApplications) {
      const list = m.get(a.job_id) ?? []
      list.push(a)
      m.set(a.job_id, list)
    }
    return m
  }, [allApplications])

  const activityItems = useMemo(() => {
    const items: ActivityItem[] = []
    for (const a of allApplications) {
      const name = a.candidate_name || a.candidate_email || 'Candidate'
      const job = jobs.find(j => j.id === a.job_id)
      items.push({
        id: `app-${a.id}-c`,
        at: a.created_at,
        kind: 'application',
        title: `Application: ${name}`,
        subtitle: `${job?.title ?? 'Job'} · ${formatDashboardLabel(a.status)}`,
      })
    }
    for (const row of interviews) {
      const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
      items.push({
        id: `int-${row.id}-u`,
        at: row.updated_at,
        kind: 'interview',
        title: `Interview ${formatDashboardLabel(row.status)}: ${name}`,
        subtitle: row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`,
      })
    }
    items.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
    return items.slice(0, 14)
  }, [allApplications, interviews, jobs])

  const cm = monthBounds(0)
  const pm = monthBounds(1)
  const newAppsThisMonth = countInRange(allApplications, a => new Date(a.created_at).getTime(), cm.start, cm.end)
  const newAppsPrevMonth = countInRange(allApplications, a => new Date(a.created_at).getTime(), pm.start, pm.end)

  const newOpenJobsThisMonth = countInRange(
    jobs.filter(j => j.status === 'open'),
    j => new Date(j.created_at).getTime(),
    cm.start,
    cm.end,
  )
  const newOpenJobsPrevMonth = countInRange(
    jobs.filter(j => j.status === 'open'),
    j => new Date(j.created_at).getTime(),
    pm.start,
    pm.end,
  )

  const interviewsThisMonth = countInRange(
    interviews,
    r => (r.scheduled_at ? new Date(r.scheduled_at).getTime() : null),
    cm.start,
    cm.end,
  )
  const interviewsPrevMonth = countInRange(
    interviews,
    r => (r.scheduled_at ? new Date(r.scheduled_at).getTime() : null),
    pm.start,
    pm.end,
  )

  const offersWorkspace = allApplications.filter(a => a.status === 'offer')
  const offersThisMonth = countInRange(
    offersWorkspace,
    a => new Date(a.updated_at).getTime(),
    cm.start,
    cm.end,
  )
  const offersPrevMonth = countInRange(
    offersWorkspace,
    a => new Date(a.updated_at).getTime(),
    pm.start,
    pm.end,
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

  const pieOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '58%',
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

  const showKpiSkeleton = jobsLoading || applicationsLoading

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
                          <span className={`tag ${STAGE_COLORS[application.status] ?? 'tag-blue'}`}>
                            {formatDashboardLabel(application.status)}
                          </span>
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
                          <span className={`tag ${STAGE_COLORS[application.status] ?? 'tag-blue'}`}>
                            {formatDashboardLabel(application.status)}
                          </span>
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
                        <span className={`tag ${STAGE_COLORS[application.status] ?? 'tag-blue'}`}>
                          {formatDashboardLabel(application.status)}
                        </span>
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
            Pipeline velocity, candidate flow, and hiring outcomes in one place—clear enough for exec reviews, detailed enough for recruiters.
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

      {showKpiSkeleton ? (
        <DashboardKpiGridSkeleton />
      ) : (
        <div className="dashboard-kpi-grid dashboard-kpi-grid-four">
          <DashboardKpiCard
            primary
            label="Total Candidates"
            value={totalApplicantsAcrossJobs}
            hint={`${monthlyDeltaLabel} new vs prior month · ${openingFillRate}% fill rate`}
            icon={<KpiIconCandidates />}
            trend={{ pct: pctChange(newAppsThisMonth, newAppsPrevMonth), label: 'New applications vs prior month' }}
          />
          <DashboardKpiCard
            label="Active Jobs"
            value={openJobs}
            hint={`${jobs.length} total requisitions`}
            icon={<KpiIconJobs />}
            trend={{ pct: pctChange(newOpenJobsThisMonth, newOpenJobsPrevMonth), label: 'New open roles vs prior month' }}
          />
          <DashboardKpiCard
            label="Interviews Scheduled"
            value={workspaceUpcomingInterviews}
            hint={`${scheduledInterviews} in selected job scope`}
            icon={<KpiIconInterviews />}
            trend={{ pct: pctChange(interviewsThisMonth, interviewsPrevMonth), label: 'Scheduled this month vs last' }}
          />
          <DashboardKpiCard
            label="Offers Released"
            value={offersWorkspace.length}
            hint={`${offerStageCount} in selected job`}
            icon={<KpiIconOffers />}
            trend={{ pct: pctChange(offersThisMonth, offersPrevMonth), label: 'Offer-stage updates this month' }}
          />
        </div>
      )}

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
                <div className="dashboard-footnote">Select a role to refocus pipeline charts and the jobs table context.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Selected Job Pipeline">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <>
                <DashboardPanelSkeleton rows={2} />
                <DashboardChartSkeleton />
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
                <p className="dashboard-chart-caption">Stage funnel</p>
                <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                  <Bar
                    data={{
                      labels: [...FUNNEL_LABELS],
                      datasets: [
                        {
                          data: funnelSelectedJob,
                          backgroundColor: FUNNEL_STAGES.map((_, i) => `rgba(14, 165, 233, ${0.95 - i * 0.12})`),
                          borderRadius: 6,
                          maxBarThickness: 22,
                        },
                      ],
                    }}
                    options={funnelBarOptions}
                  />
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
                <div className="dashboard-footnote">Click a metric card to inspect candidate-level records in detail.</div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Workspace Pipeline Funnel">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <DashboardChartSkeleton short />
            ) : funnelWorkspace.every(v => v === 0) ? (
              <div className="dashboard-empty">No candidates in funnel stages yet.</div>
            ) : (
              <>
                <p className="dashboard-chart-caption">All jobs · counts by application status</p>
                <div className="dashboard-chart-shell dashboard-chart-shell-funnel">
                  <Bar
                    data={{
                      labels: [...FUNNEL_LABELS],
                      datasets: [
                        {
                          data: funnelWorkspace,
                          backgroundColor: FUNNEL_STAGES.map((_, i) => `rgba(37, 99, 235, ${0.92 - i * 0.1})`),
                          borderRadius: 6,
                          maxBarThickness: 22,
                        },
                      ],
                    }}
                    options={funnelBarOptions}
                  />
                </div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applications Over Time">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <DashboardChartSkeleton short />
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
                        backgroundColor: 'rgba(14, 165, 233, 0.16)',
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

        <DashboardPanel title="Candidates By Job">
          <div className="dashboard-panel-content">
            {applicationsLoading || jobsLoading ? (
              <DashboardChartSkeleton short />
            ) : jobDistribution.length === 0 ? (
              <div className="dashboard-empty">No applications yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-short">
                <Bar
                  data={{
                    labels: jobDistribution.map(r => r.title),
                    datasets: [
                      {
                        data: jobDistribution.map(r => r.n),
                        backgroundColor: 'rgba(14, 165, 233, 0.75)',
                        borderRadius: 8,
                        maxBarThickness: 36,
                      },
                    ],
                  }}
                  options={barOptions}
                />
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Source Of Candidates">
          <div className="dashboard-panel-content">
            {applicationsLoading ? (
              <DashboardChartSkeleton />
            ) : sourceSlicesWorkspace.length === 0 ? (
              <div className="dashboard-empty">No source data yet.</div>
            ) : (
              <div className="dashboard-chart-shell dashboard-chart-shell-pie">
                <Doughnut
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

        <DashboardPanel title="Applicant Sources (Selected Job)">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <DashboardChartSkeleton short />
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

        <DashboardPanel title="Recent Activity">
          <div className="dashboard-panel-content">
            {applicationsLoading && interviewsLoading ? (
              <DashboardPanelSkeleton rows={6} />
            ) : activityItems.length === 0 ? (
              <div className="dashboard-empty">No recent activity yet.</div>
            ) : (
              <ul className="dashboard-activity-feed">
                {activityItems.map(item => (
                  <li key={item.id} className="dashboard-activity-item">
                    <span className={`dashboard-activity-dot dashboard-activity-dot--${item.kind}`} aria-hidden />
                    <div className="dashboard-activity-body">
                      <div className="dashboard-activity-title">{item.title}</div>
                      <div className="dashboard-activity-meta">
                        <span>{item.subtitle}</span>
                        <span className="dashboard-activity-time">{formatRelativeTime(item.at)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
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

        <DashboardPanel title="Jobs Overview">
          <div className="dashboard-panel-content dashboard-panel-content--flush">
            {jobsLoading ? (
              <DashboardPanelSkeleton rows={8} />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty">No jobs yet.</div>
            ) : (
              <div className="dashboard-jobs-table-wrap">
                <table className="dashboard-jobs-table">
                  <thead>
                    <tr>
                      <th>Job title</th>
                      <th>Status</th>
                      <th>Applicants</th>
                      <th>Stage</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(job => {
                      const apps = appsByJobId.get(job.id) ?? []
                      return (
                        <tr key={job.id}>
                          <td>
                            <button
                              type="button"
                              className="dashboard-jobs-table-title"
                              onClick={() => setSelectedJobId(String(job.id))}
                            >
                              {job.title}
                            </button>
                          </td>
                          <td>
                            <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-gray'}`}>{formatDashboardLabel(job.status)}</span>
                          </td>
                          <td>{apps.length}</td>
                          <td className="dashboard-jobs-table-stage">{dominantJobStage(apps)}</td>
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
      </div>
    </>
  )
}
