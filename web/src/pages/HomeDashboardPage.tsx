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
import { Doughnut, Line } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { can } from '../permissions'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { Hero3D, Icon, Icon3D, type IconName, type Model3DName } from '../icons'

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

/** Brand chart palette — mirrors the 3D/CSS tokens. */
const DASHBOARD_CHART_COLORS = ['#4157ff', '#2ec5f0', '#7c5cff', '#1fbf87', '#ffb547', '#ff6b81', '#8088a4']

const CHART_TICK = { color: '#8088a4', font: { size: 11, family: 'Inter, system-ui, sans-serif' } }
const CHART_GRID = { color: 'rgba(205, 210, 224, 0.5)' }


type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

type PipelineModalKind = 'applicants' | 'interviews' | 'offers' | 'hired'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler)

// Plugin defaults exist only after registration.
ChartJS.defaults.font.family = 'Inter, system-ui, sans-serif'
ChartJS.defaults.plugins.tooltip.backgroundColor = '#12162b'
ChartJS.defaults.plugins.tooltip.padding = 10
ChartJS.defaults.plugins.tooltip.cornerRadius = 10
ChartJS.defaults.plugins.tooltip.titleFont = { weight: 600 }

function LoadingRow() {
  return (
    <div className="dashboard-loading" aria-label="Loading">
      <div className="nx-skeleton" style={{ height: 14, width: '42%' }} />
      <div className="nx-skeleton" style={{ height: 120 }} />
      <div className="nx-skeleton" style={{ height: 14, width: '68%' }} />
    </div>
  )
}

function DashEmpty({ icon, title, text }: { icon: Model3DName; title: string; text?: string }) {
  return (
    <div className="nx-empty dashboard-empty">
      <Icon3D name={icon} size={64} />
      <div className="nx-empty-title">{title}</div>
      {text ? <div className="nx-empty-text">{text}</div> : null}
    </div>
  )
}

function initials(name: string) {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
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

/** Fixed-size donut with the total in the middle — no legend, so the card height never jumps. */
function StatusDonut({ slices, total, caption }: { slices: DashboardSlice[]; total: number; caption: string }) {
  const empty = slices.length === 0
  const data = {
    labels: empty ? ['None'] : slices.map(s => s.label),
    datasets: [
      {
        data: empty ? [1] : slices.map(s => s.value),
        backgroundColor: empty ? ['#eef0f6'] : slices.map(s => s.color),
        borderColor: '#ffffff',
        borderWidth: empty ? 0 : 3,
        borderRadius: empty ? 0 : 6,
        hoverOffset: empty ? 0 : 4,
      },
    ],
  }
  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '74%',
    plugins: { legend: { display: false }, tooltip: { enabled: !empty } },
  }
  return (
    <div className="dash-donut">
      <Doughnut data={data} options={options} />
      <div className="dash-donut-center">
        <strong>{total}</strong>
        <span>{caption}</span>
      </div>
    </div>
  )
}

/** Small, fixed-height empty message for inside a panel. */
function InlineEmpty({ icon, text }: { icon: IconName; text: string }) {
  return (
    <div className="dash-inline-empty">
      <span className="dash-inline-empty-icon">
        <Icon name={icon} size={18} />
      </span>
      <span>{text}</span>
    </div>
  )
}

const FUNNEL_STAGES: { key: string; label: string; modal: PipelineModalKind }[] = [
  { key: 'applied', label: 'Applied', modal: 'applicants' },
  { key: 'screening', label: 'Screening', modal: 'applicants' },
  { key: 'interview', label: 'Interview', modal: 'interviews' },
  { key: 'offer', label: 'Offer', modal: 'offers' },
  { key: 'hired', label: 'Hired', modal: 'hired' },
]

function DashboardPanel({
  title,
  icon,
  hint,
  action,
  className,
  children,
}: {
  title: string
  icon: IconName
  hint?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`panel dashboard-panel dashboard-modern-panel${className ? ` ${className}` : ''}`}>
      <div className="panel-header dashboard-modern-panel-header">
        <span className="dashboard-panel-icon">
          <Icon name={icon} size={16} />
        </span>
        <span className="panel-header-title">{title}</span>
        {hint ? <span className="dashboard-panel-hint">{hint}</span> : null}
        {action ? <div className="dashboard-panel-action">{action}</div> : null}
      </div>
      <div className="panel-body dashboard-modern-panel-body">{children}</div>
    </section>
  )
}

export default function HomeDashboardPage() {
  const { user, token, accountId } = useOutletContext<DashboardOutletContext>()
  const canEditJobs = can(user, 'jobs', 'edit')
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
  const totalApplicants = jobApplications.length
  const hiredCount = jobApplicationsByStatus.hired ?? 0
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
  const maxSourceValue = Math.max(...sourceSlices.map(slice => slice.value), 1)
  const funnelMax = Math.max(...FUNNEL_STAGES.map(st => jobApplicationsByStatus[st.key] ?? 0), 1)
  const recentJobs = [...jobs].sort((x, y) => (x.status === 'open' ? -1 : 0) - (y.status === 'open' ? -1 : 0)).slice(0, 4)
  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: CHART_TICK,
        grid: { display: false },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { ...CHART_TICK, precision: 0 },
        grid: CHART_GRID,
        border: { display: false },
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
                <Icon name="x" size={18} />
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
                  <DashEmpty icon="interviews" title="No interviews yet" text="No interview records for this job." />
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
                  <DashEmpty icon="candidates" title="No applicants yet" text="Share the posting to start receiving applications." />
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
                  <DashEmpty icon="signature" title="No offers out" text="No candidates are in the offer stage for this job." />
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
                <DashEmpty icon="trophy" title="No hires yet" text="Hired candidates for this job will show up here." />
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

      <section className="dashboard-hero dashboard-hero-modern">
        <div className="dashboard-hero-main">
          <p className="dashboard-eyebrow">
            <Icon name="sparkle" size={14} /> {user.account?.name ?? 'Your workspace'} · Hiring overview
          </p>
          <h2 className="dashboard-title">
            {greeting()}, {user.name.split(' ')[0]}
          </h2>
          <p className="dashboard-subtitle">
            {jobsLoading ? (
              <span className="nx-skeleton dash-subtitle-skeleton" />
            ) : (
              `You have ${openJobs} open ${openJobs === 1 ? 'role' : 'roles'}, ${workspaceUpcomingInterviews} upcoming ${workspaceUpcomingInterviews === 1 ? 'interview' : 'interviews'} and ${totalApplicantsAcrossJobs} ${totalApplicantsAcrossJobs === 1 ? 'applicant' : 'applicants'} in the funnel.`
            )}
          </p>
          <div className="dashboard-hero-actions">
            {canEditJobs ? (
              <Link to={`/account/${accountId}/jobs/new`} className="dashboard-hero-btn dashboard-hero-btn--primary">
                <Icon name="plus" size={16} strokeWidth={2.2} /> Create job
              </Link>
            ) : null}
            <Link to={`/account/${accountId}/pipeline`} className="dashboard-hero-btn">
              <Icon name="pipeline" size={16} /> Open pipeline
            </Link>
            <Link to={`/account/${accountId}/interviews`} className="dashboard-hero-btn">
              <Icon name="interviews" size={16} /> My interviews
            </Link>
          </div>
        </div>
        <div className="dashboard-hero-side">
          <Hero3D
            className="dashboard-hero-scene"
            center="analytics"
            posterSize={110}
            centerScale={1.15}
            calm
            satellites={[
              { name: 'jobs', position: [-0.82, 0.5, -0.3], scale: 0.44 },
              { name: 'candidates', position: [0.84, 0.55, -0.5], scale: 0.44 },
              { name: 'trophy', position: [0.84, -0.55, 0.2], scale: 0.42 },
              { name: 'interviews', position: [-0.8, -0.52, 0.1], scale: 0.42 },
            ]}
          />
          <div className="dashboard-hero-meta">
            <div className="dashboard-hero-meta-item">
              <span>Pipeline health</span>
              <strong>
                <i className={`dashboard-health-dot dashboard-health-dot--${conversionRate >= 25 ? 'good' : conversionRate >= 10 ? 'ok' : 'low'}`} />
                {conversionRate >= 25 ? 'Strong' : conversionRate >= 10 ? 'Stable' : 'Needs attention'}
              </strong>
            </div>
            <div className="dashboard-hero-meta-item">
              <span>Fill rate</span>
              <strong>{openingFillRate}%</strong>
            </div>
            <div className="dashboard-hero-meta-item">
              <span>Applicants / job</span>
              <strong>{avgApplicantsPerJob}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="dashboard-kpi-grid">
        {(
          [
            { icon: 'jobs', label: 'Jobs listed', value: jobs.length, sub: `${openJobs} currently open`, to: `/account/${accountId}/jobs` },
            { icon: 'interviews', label: 'Upcoming interviews', value: workspaceUpcomingInterviews, sub: 'Across your assignments', to: `/account/${accountId}/interviews` },
            { icon: 'trophy', label: 'Total hired', value: totalHiredCandidates, sub: `${openingFillRate}% of openings filled` },
            {
              icon: 'analytics',
              label: 'Applications this month',
              value: currentMonthApplications,
              sub: `${previousMonthApplications} last month`,
              delta: monthlyDelta,
            },
            { icon: 'candidates', label: 'Total applicants', value: totalApplicantsAcrossJobs, sub: `${avgApplicantsPerJob} per job on average`, to: `/account/${accountId}/candidates` },
          ] as { icon: Model3DName; label: string; value: number; sub: string; delta?: number; to?: string }[]
        ).map(kpi => {
          const body = (
            <>
              <div className="dashboard-kpi-top">
                <Icon3D name={kpi.icon} size={42} tile />
                {kpi.delta !== undefined ? (
                  <span className={`dashboard-delta dashboard-delta--${kpi.delta > 0 ? 'up' : kpi.delta < 0 ? 'down' : 'flat'}`}>
                    <Icon name={kpi.delta < 0 ? 'trendDown' : 'trendUp'} size={13} strokeWidth={2.2} />
                    {monthlyDeltaLabel}
                  </span>
                ) : kpi.to ? (
                  <span className="dashboard-kpi-go" aria-hidden>
                    <Icon name="arrowUpRight" size={15} />
                  </span>
                ) : null}
              </div>
              <span className="dashboard-kpi-label">{kpi.label}</span>
              {jobsLoading ? <span className="nx-skeleton dash-kpi-skeleton" /> : <strong>{kpi.value}</strong>}
              <p>{kpi.sub}</p>
            </>
          )
          return kpi.to ? (
            <Link key={kpi.label} to={kpi.to} className="dashboard-kpi-card dashboard-kpi-card--link">
              {body}
            </Link>
          ) : (
            <article key={kpi.label} className="dashboard-kpi-card">
              {body}
            </article>
          )
        })}
      </div>

      <div className="dash-grid">
        <DashboardPanel
          title="Hiring funnel"
          icon="funnel"
          className="dash-span-8"
          action={
            <select
              className="dash-job-select"
              value={selectedJobId}
              onChange={e => setSelectedJobId(e.target.value)}
              disabled={jobsLoading || jobs.length === 0}
              aria-label="Job"
            >
              {jobs.length === 0 && <option value="">No jobs yet</option>}
              {jobs.map(job => (
                <option key={job.id} value={String(job.id)}>
                  {job.title}
                </option>
              ))}
            </select>
          }
        >
          <div className="dashboard-panel-content">
            {analyticsLoading || jobsLoading ? (
              <LoadingRow />
            ) : analyticsError ? (
              <ErrorRow msg={analyticsError} />
            ) : (
              <>
                <div className="dash-funnel-head">
                  <div>
                    <strong>{selectedJob?.title ?? 'No job selected'}</strong>
                    <span>
                      {selectedJob
                        ? `${selectedJob.department ?? 'General'} · ${selectedJob.location ?? 'Location not set'} · ${selectedJob.open_positions ?? 0} openings`
                        : 'Create a job to see its funnel'}
                    </span>
                  </div>
                  {selectedJob ? (
                    <Link
                      className="dashboard-link"
                      to={canEditJobs ? `/account/${accountId}/jobs/${selectedJob.id}/edit` : `/account/${accountId}/jobs`}
                    >
                      Open job <Icon name="arrowRight" size={14} />
                    </Link>
                  ) : null}
                </div>

                <div className="dash-funnel">
                  {FUNNEL_STAGES.map((st, i) => {
                    const count = jobApplicationsByStatus[st.key] ?? 0
                    const pct = totalApplicants > 0 ? Math.round((count / totalApplicants) * 100) : 0
                    return (
                      <button key={st.key} type="button" className="dash-funnel-row" onClick={() => setActivePipelineModal(st.modal)}>
                        <span className="dash-funnel-label">{st.label}</span>
                        <span className="dash-funnel-track">
                          <span
                            className="dash-funnel-fill"
                            style={{ width: `${Math.max((count / funnelMax) * 100, count > 0 ? 6 : 0)}%`, opacity: 1 - i * 0.12 }}
                          />
                        </span>
                        <span className="dash-funnel-count">{count}</span>
                        <span className="dash-funnel-pct">{pct}%</span>
                      </button>
                    )
                  })}
                </div>

                <div className="dash-funnel-foot">
                  <div>
                    <span>Total applicants</span>
                    <strong>{totalApplicants}</strong>
                  </div>
                  <div>
                    <span>Hire conversion</span>
                    <strong>{conversionRate}%</strong>
                  </div>
                  <div>
                    <span>Scheduled interviews</span>
                    <strong>{scheduledInterviews}</strong>
                  </div>
                  <div>
                    <span>Rejected / withdrawn</span>
                    <strong>{rejectedCount}</strong>
                  </div>
                </div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Jobs by status" icon="jobs" hint={`${jobs.length} total`} className="dash-span-4">
          <div className="dashboard-panel-content">
            {jobsLoading ? (
              <LoadingRow />
            ) : jobsError ? (
              <ErrorRow msg={jobsError} />
            ) : (
              <>
                <div className="dash-status">
                  <StatusDonut slices={jobsByStatus} total={jobs.length} caption={jobs.length === 1 ? 'job' : 'jobs'} />
                  <ul className="dash-status-legend">
                    {jobStatusGroups.length === 0 ? (
                      <li className="dash-status-none">No jobs yet</li>
                    ) : (
                      jobStatusGroups.map(group => (
                        <li key={group.key}>
                          <span className="dashboard-legend-dot" style={{ backgroundColor: group.color }} />
                          <span className="dash-status-name">{group.label}</span>
                          <span className="dash-status-count">{group.jobs.length}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div className="dash-mini-list">
                  <span className="dash-mini-title">Jump to a job</span>
                  {recentJobs.length === 0 ? (
                    <InlineEmpty icon="jobs" text="Jobs you create will appear here." />
                  ) : (
                    recentJobs.map(job => (
                      <button
                        key={job.id}
                        type="button"
                        className={`dash-mini-job${selectedJobId === String(job.id) ? ' is-active' : ''}`}
                        onClick={() => setSelectedJobId(String(job.id))}
                      >
                        <span className="dash-mini-job-text">
                          <strong>{job.title}</strong>
                          <span>{job.department ?? 'General'}</span>
                        </span>
                        <span className={`tag ${STAGE_COLORS[job.status] ?? 'tag-gray'}`}>{formatDashboardLabel(job.status)}</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Application trend" icon="trendUp" hint="Last 6 months" className="dash-span-8">
          <div className="dashboard-panel-content">
            <div className="dash-trend-summary">
              <div>
                <strong>{currentMonthApplications}</strong>
                <span>this month</span>
              </div>
              <span className={`dashboard-delta dashboard-delta--${monthlyDelta > 0 ? 'up' : monthlyDelta < 0 ? 'down' : 'flat'}`}>
                <Icon name={monthlyDelta < 0 ? 'trendDown' : 'trendUp'} size={13} strokeWidth={2.2} />
                {monthlyDeltaLabel} vs last month
              </span>
            </div>
            <div className="dashboard-chart-shell dashboard-chart-shell-short">
              <Line
                data={{
                  labels: monthlyTrend.map(item => item.label),
                  datasets: [
                    {
                      data: monthlyTrend.map(item => item.value),
                      borderColor: '#4157ff',
                      backgroundColor: (ctx: { chart: ChartJS }) => {
                        const { ctx: c, chartArea } = ctx.chart
                        if (!chartArea) return 'rgba(65,87,255,0.12)'
                        const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
                        g.addColorStop(0, 'rgba(65,87,255,0.24)')
                        g.addColorStop(1, 'rgba(46,197,240,0.02)')
                        return g
                      },
                      borderWidth: 2.5,
                      pointRadius: 3.5,
                      pointHoverRadius: 6,
                      pointBackgroundColor: '#ffffff',
                      pointBorderColor: '#4157ff',
                      pointBorderWidth: 2,
                      fill: true,
                      tension: 0.35,
                    },
                  ],
                }}
                options={{
                  ...lineOptions,
                  scales: {
                    ...lineOptions.scales,
                    y: { ...lineOptions.scales?.y, suggestedMax: Math.max(...monthlyTrend.map(m => m.value), 4) },
                  },
                }}
              />
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Upcoming interviews" icon="interviews" hint="Selected job" className="dash-span-4">
          <div className="dashboard-panel-content">
            {interviewsLoading ? (
              <LoadingRow />
            ) : interviewsError ? (
              <ErrorRow msg={interviewsError} />
            ) : filteredUpcomingInterviews.length === 0 ? (
              <InlineEmpty icon="interviews" text="No interviews scheduled for this job yet." />
            ) : (
              <div className="dashboard-schedule">
                {filteredUpcomingInterviews.slice(0, 5).map(row => (
                  <div key={row.id} className="dashboard-schedule-item">
                    <span className="dashboard-avatar" aria-hidden>
                      {initials(row.application?.candidate_name || row.application?.candidate_email || 'C')}
                    </span>
                    <div className="dashboard-schedule-main">
                      <strong>{row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}</strong>
                      <span>{formatDateTimeShort(row.scheduled_at)}</span>
                    </div>
                    <span className={`tag ${STAGE_COLORS[row.status] ?? 'tag-blue'}`}>{formatDashboardLabel(row.status)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="dashboard-panel-footer">
              <Link className="dashboard-link" to={`/account/${accountId}/interviews`}>
                Open interviews <Icon name="arrowRight" size={14} />
              </Link>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Applicant sources" icon="boards" hint="Selected job" className="dash-span-12">
          <div className="dashboard-panel-content">
            {analyticsLoading ? (
              <LoadingRow />
            ) : sourceSlices.length === 0 ? (
              <InlineEmpty icon="boards" text="Source channels appear here once this job receives applications." />
            ) : (
              <div className="dash-sources">
                {sourceSlices.map(slice => (
                  <div key={slice.key} className="dash-source">
                    <span className="dash-source-name">
                      <span className="dashboard-legend-dot" style={{ backgroundColor: slice.color }} />
                      {slice.label}
                    </span>
                    <span className="dash-source-track">
                      <span className="dash-source-fill" style={{ width: `${(slice.value / maxSourceValue) * 100}%`, background: slice.color }} />
                    </span>
                    <span className="dash-source-count">
                      {slice.value}
                      <em>{totalApplicants ? Math.round((slice.value / totalApplicants) * 100) : 0}%</em>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DashboardPanel>
      </div>
    </>
  )
}
