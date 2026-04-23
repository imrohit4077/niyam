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
import { Bar, Doughnut } from 'react-chartjs-2'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { jobsApi, type Job } from '../api/jobs'
import { applicationsApi, type Application } from '../api/applications'
import { interviewsApi, type InterviewAssignmentRow } from '../api/interviews'
import { DashboardPanel } from '../components/dashboard/DashboardPanel'
import { DashboardSummaryCards } from '../components/dashboard/DashboardSummaryCards'
import { DashboardChartsSection } from '../components/dashboard/DashboardChartsSection'
import { DashboardActivityFeed } from '../components/dashboard/DashboardActivityFeed'
import { DashboardJobsTable } from '../components/dashboard/DashboardJobsTable'
import { DashboardKpiSkeleton } from '../components/dashboard/DashboardSkeleton'
import type { DashboardActivityItem, SummaryKpi } from '../components/dashboard/dashboardTypes'
import {
  applicationVolumeTrend,
  interviewSchedulingTrend,
  offersReleasedTrend,
  openRolesPostedTrend,
} from '../components/dashboard/dashboardTrends'

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

function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobTitleById: Map<number, string>,
  limit = 14,
): DashboardActivityItem[] {
  type Row = DashboardActivityItem & { sort: number }
  const rows: Row[] = []

  applications.forEach(app => {
    const jobLine = jobTitleById.get(app.job_id) ?? `Job #${app.job_id}`
    rows.push({
      id: `app-${app.id}`,
      kind: 'application',
      title: `${app.candidate_name?.trim() || app.candidate_email} applied`,
      subtitle: jobLine,
      at: app.created_at,
      sort: new Date(app.created_at).getTime(),
    })
    if (app.status === 'offer') {
      const offerAt = app.stage_history?.find(h => h.stage === 'offer')?.changed_at ?? app.updated_at
      rows.push({
        id: `offer-${app.id}`,
        kind: 'offer',
        title: `Offer stage · ${app.candidate_name?.trim() || app.candidate_email}`,
        subtitle: `${jobLine} · ${formatDashboardLabel(app.source_type || 'unknown source')}`,
        at: offerAt,
        sort: new Date(offerAt).getTime(),
      })
    }
    if (app.status === 'hired') {
      const hiredAt = app.stage_history?.find(h => h.stage === 'hired')?.changed_at ?? app.updated_at
      rows.push({
        id: `hire-${app.id}`,
        kind: 'hire',
        title: `Hired · ${app.candidate_name?.trim() || app.candidate_email}`,
        subtitle: jobLine,
        at: hiredAt,
        sort: new Date(hiredAt).getTime(),
      })
    }
  })

  interviews.forEach(row => {
    if (!row.scheduled_at) return
    rows.push({
      id: `int-${row.id}`,
      kind: 'interview',
      title: `Interview scheduled · ${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}`,
      subtitle: row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`,
      at: row.scheduled_at,
      sort: new Date(row.scheduled_at).getTime(),
    })
  })

  const dedup = new Map<string, Row>()
  rows
    .sort((a, b) => b.sort - a.sort)
    .forEach(r => {
      if (!dedup.has(r.id)) dedup.set(r.id, r)
    })

  return Array.from(dedup.values())
    .sort((a, b) => b.sort - a.sort)
    .slice(0, limit)
    .map(r => ({ id: r.id, kind: r.kind, title: r.title, subtitle: r.subtitle, at: r.at }))
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

      interviewsApi
        .myAssignments(token, {
          include_open: true,
          page: 1,
          per_page: 100,
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
    })

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      if (!selectedJobId) {
        setJobApplications([])
        setAnalyticsError('')
        return
      }

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
  const workspaceScheduledInterviews = interviews.filter(
    row => row.status === 'scheduled' || row.status === 'pending' || !!row.scheduled_at,
  ).length
  const offerRows = jobApplications.filter(application => application.status === 'offer')
  const hiredRows = jobApplications.filter(application => application.status === 'hired')
  const openJobsList = jobs.filter(job => job.status === 'open')
  const openJobs = openJobsList.length
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
  const offersInPipeline = allApplications.filter(a => a.status === 'offer').length

  const summaryKpis: SummaryKpi[] = [
    {
      id: 'candidates',
      label: 'Total candidates',
      value: totalApplicantsAcrossJobs,
      icon: 'users',
      trend: applicationVolumeTrend(allApplications, 30),
      hint: `${avgApplicantsPerJob} avg per job`,
    },
    {
      id: 'active-jobs',
      label: 'Active jobs',
      value: openJobs,
      icon: 'briefcase',
      trend: openRolesPostedTrend(openJobsList, 30),
      hint: `${jobs.length} total listings`,
    },
    {
      id: 'interviews',
      label: 'Interviews scheduled',
      value: workspaceScheduledInterviews,
      icon: 'calendar',
      trend: interviewSchedulingTrend(interviews, 14),
      hint: `${scheduledInterviews} in selected job scope`,
    },
    {
      id: 'offers',
      label: 'Offers released',
      value: offersInPipeline,
      icon: 'gift',
      trend: offersReleasedTrend(allApplications, 30),
      hint: 'Candidates currently in offer',
    },
  ]

  const jobTitleById = useMemo(() => new Map(jobs.map(j => [j.id, j.title])), [jobs])

  const activityItems = useMemo(
    () => buildActivityFeed(allApplications, interviews, jobTitleById),
    [allApplications, interviews, jobTitleById],
  )

  const maxSourceValue = Math.max(...sourceSlices.map(slice => slice.value), 0)
  const sourceTopLabel = sourceSlices.find(slice => slice.value === maxSourceValue)?.label ?? 'No data'
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
            Pipeline velocity, candidate quality, and hiring outcomes in one calm workspace view.
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
            <span>Hired (workspace)</span>
            <strong>{totalHiredCandidates}</strong>
          </div>
        </div>
      </div>

      {showKpiSkeleton ? <DashboardKpiSkeleton /> : <DashboardSummaryCards items={summaryKpis} />}

      <DashboardChartsSection allApplications={allApplications} jobs={jobs} />

      <div className="dashboard-grid">
        <DashboardPanel title="Jobs by status" subtitle="Select a role for analytics">
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
                  <div className="dashboard-footnote">Select a role to refresh pipeline and source panels.</div>
                </>
              )}
            </div>
        </DashboardPanel>

        <DashboardPanel title="Selected job pipeline" subtitle="Stage mix for this role">
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

        <DashboardPanel title="Applicant sources" subtitle="Selected job">
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

        <DashboardPanel title="Recent activity" subtitle="Applications, interviews, offers, hires">
            <div className="dashboard-panel-content dashboard-panel-content--flush">
              {applicationsLoading ? <LoadingRow /> : <DashboardActivityFeed items={activityItems} />}
            </div>
        </DashboardPanel>

        <DashboardPanel title="Upcoming interviews" subtitle="Selected job scope">
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

        <DashboardPanel title="Jobs overview" subtitle="Applicants and dominant pipeline stage" span="full">
            <div className="dashboard-panel-content dashboard-panel-content--table">
              {jobsLoading ? <LoadingRow /> : <DashboardJobsTable jobs={jobs} applications={allApplications} accountId={accountId} />}
            </div>
        </DashboardPanel>
      </div>
    </>
  )
}
