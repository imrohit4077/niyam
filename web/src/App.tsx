import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { ToastProvider } from './contexts/ToastContext'
import { AppearanceProvider } from './contexts/AppearanceContext'
import { AuthProvider, useAuth } from './auth/AuthContext'
import LoginPage from './pages/LoginPage'
import JobEditorPage from './pages/JobEditorPage'
import PublicJobApplyPage from './pages/PublicJobApplyPage'
import PublicEsignSignPage from './pages/PublicEsignSignPage'
import ApplicationDetailPage from './pages/ApplicationDetailPage'
import EsignDocumentsPage from './pages/EsignDocumentsPage'
import DashboardLayout from './layouts/DashboardLayout'
import JobsHubLayout from './layouts/JobsHubLayout'
import RoleKickoffHubPage from './pages/RoleKickoffHubPage'
import RoleKickoffFormPage from './pages/RoleKickoffFormPage'
import RoleKickoffDetailPage from './pages/RoleKickoffDetailPage'
import HiringAttributesPage from './pages/HiringAttributesPage'
import HiringStagesPage from './pages/HiringStagesPage'
import HiringStageEditorPage from './pages/HiringStageEditorPage'
import HiringPlansView from './components/HiringPlansView'
import PipelineBoardView from './components/PipelineBoardView'
import {
  JobsView,
  JobBoardsView,
  PostingsView,
  ApplicationsView,
  CandidatesView,
  InterviewsView,
  TeamView,
} from './components/PageViews'
import GeneralSettingsLayout from './layouts/GeneralSettingsLayout'
import AuditComplianceSettingsLayout from './layouts/AuditComplianceSettingsLayout'
import OrganizationSettingsPage from './pages/settings/OrganizationSettingsPage'
import JobSetupSectionsSettingsPage from './pages/settings/JobSetupSectionsSettingsPage'
import DepartmentsSettingsPage from './pages/settings/DepartmentsSettingsPage'
import JobLocationsSettingsPage from './pages/settings/JobLocationsSettingsPage'
import WorkspaceSettingsPage from './pages/settings/WorkspaceSettingsPage'
import AppearanceSettingsPage from './pages/settings/AppearanceSettingsPage'
import ReferralProgramSettingsPage from './pages/settings/ReferralProgramSettingsPage'
import AuditComplianceOverviewPage from './pages/settings/AuditComplianceOverviewPage'
import AuditLogEntriesPage from './pages/settings/AuditLogEntriesPage'
import AuditDeliveryFailuresPage from './pages/settings/AuditDeliveryFailuresPage'
import ReferralsHubPage from './pages/ReferralsHubPage'
import CustomFieldsSettingsLayout from './layouts/CustomFieldsSettingsLayout'
import CustomFieldsEntityPage from './pages/settings/CustomFieldsEntityPage'
import LabelsSettingsPage from './pages/settings/LabelsSettingsPage'
import CommunicationChannelsHubPage from './pages/settings/CommunicationChannelsHubPage'
import CommunicationChannelsEmailPage from './pages/settings/CommunicationChannelsEmailPage'
import HomeDashboardPage from './pages/HomeDashboardPage'
import EsignOverviewPage from './pages/esign/EsignOverviewPage'
import EsignTemplatesListPage from './pages/esign/EsignTemplatesListPage'
import EsignTemplateEditorPage from './pages/esign/EsignTemplateEditorPage'
import EsignRulesPage from './pages/esign/EsignRulesPage'
import EsignAdvancedPage from './pages/esign/EsignAdvancedPage'
import {
  GateOutlet,
  SettingsAccessGate,
  SettingsIndexRedirect,
  EsignSettingsAccess,
  EsignManageOutlet,
} from './components/PermissionGates'
import { can, navItemVisible } from './permissions'
import './App.css'

function Splash() {
  return (
    <div className="splash">
      <div className="spinner" aria-label="Loading" />
    </div>
  )
}

function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading && !user) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  if (!user.account) {
    return (
      <div className="splash">
        <p style={{ color: 'var(--text-muted)' }}>No workspace is linked to this user.</p>
      </div>
    )
  }
  return <Outlet />
}

function AccountRedirect() {
  const { accountId } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  if (!user?.account || !accountId) {
    return (
      <div className="splash">
        <div className="spinner" aria-label="Loading" />
      </div>
    )
  }
  if (accountId !== String(user.account.id)) {
    const suffix = location.pathname.replace(/^\/account\/[^/]+/, '') || '/profile'
    return <Navigate to={`/account/${user.account.id}${suffix}`} replace />
  }
  return <Outlet />
}

/** Old URL: /settings/general/audit → new section */
function RedirectAuditFromGeneralToCompliance() {
  const { accountId } = useParams<{ accountId: string }>()
  return <Navigate to={`/account/${accountId}/settings/audit-compliance/overview`} replace />
}

/** Unknown `/settings/*` paths would otherwise render an empty settings outlet. */
function SettingsUnknownRedirect() {
  const { accountId } = useParams<{ accountId: string }>()
  return <Navigate to={`/account/${accountId}/settings`} replace />
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (user?.account) return <Navigate to={`/account/${user.account.id}/profile`} replace />
  return <Navigate to="/login" replace />
}

function JobsIndexRedirect() {
  const { user } = useAuth()
  const { accountId } = useParams<{ accountId: string }>()
  if (!accountId) return <Navigate to="/" replace />
  const base = `/account/${accountId}/jobs`
  if (navItemVisible(user, 'jobs-all')) return <Navigate to={`${base}/all`} replace />
  if (navItemVisible(user, 'jobs-mine')) return <Navigate to={`${base}/mine`} replace />
  if (navItemVisible(user, 'jobs-role-kickoff')) return <Navigate to={`${base}/role-kickoff`} replace />
  return <Navigate to={`/account/${accountId}/profile`} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/apply/:token" element={<PublicJobApplyPage />} />
      <Route path="/esign/sign/:token" element={<PublicEsignSignPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/account/:accountId" element={<AccountRedirect />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<HomeDashboardPage />} />
            <Route element={<GateOutlet test={u => can(u, 'hiring_structure', 'view')} />}>
              <Route path="structured-hiring">
                <Route index element={<Navigate to="attributes" replace />} />
                <Route path="attributes" element={<HiringAttributesPage />} />
                <Route path="stages" element={<HiringStagesPage />} />
                <Route path="stages/new" element={<HiringStageEditorPage />} />
                <Route path="stages/:templateId/edit" element={<HiringStageEditorPage />} />
              </Route>
            </Route>
            <Route
              element={
                <GateOutlet
                  test={u =>
                    navItemVisible(u, 'jobs-all') ||
                    navItemVisible(u, 'jobs-mine') ||
                    navItemVisible(u, 'jobs-role-kickoff')
                  }
                />
              }
            >
              <Route path="jobs">
                <Route index element={<JobsIndexRedirect />} />
                <Route element={<JobsHubLayout />}>
                  <Route element={<GateOutlet test={u => navItemVisible(u, 'jobs-all')} />}>
                    <Route path="all" element={<JobsView jobsScope="all" />} />
                  </Route>
                  <Route element={<GateOutlet test={u => navItemVisible(u, 'jobs-mine')} />}>
                    <Route path="mine" element={<JobsView jobsScope="mine" />} />
                  </Route>
                  <Route element={<GateOutlet test={u => navItemVisible(u, 'jobs-role-kickoff')} />}>
                    <Route path="role-kickoff" element={<RoleKickoffHubPage />} />
                    <Route path="role-kickoff/new" element={<RoleKickoffFormPage />} />
                    <Route path="role-kickoff/:kickoffId/edit" element={<RoleKickoffFormPage />} />
                    <Route path="role-kickoff/:kickoffId" element={<RoleKickoffDetailPage />} />
                  </Route>
                </Route>
              </Route>
              <Route path="hiring-plans" element={<HiringPlansView />} />
              <Route path="job-boards" element={<JobBoardsView />} />
              <Route path="postings" element={<PostingsView />} />
            </Route>
            <Route element={<GateOutlet test={u => can(u, 'jobs', 'edit')} />}>
              <Route path="jobs/new" element={<JobEditorPage />} />
              <Route path="jobs/:jobId/edit" element={<JobEditorPage />} />
            </Route>
            <Route element={<GateOutlet test={u => navItemVisible(u, 'pipeline')} />}>
              <Route path="pipeline" element={<PipelineBoardView />} />
            </Route>
            <Route element={<GateOutlet test={u => navItemVisible(u, 'job-applications')} />}>
              <Route path="job-applications" element={<ApplicationsView />} />
              <Route path="job-applications/:applicationId" element={<ApplicationDetailPage />} />
            </Route>
            <Route element={<GateOutlet test={u => navItemVisible(u, 'candidates')} />}>
              <Route path="candidates" element={<CandidatesView />} />
            </Route>
            <Route element={<GateOutlet test={u => navItemVisible(u, 'interviews')} />}>
              <Route path="interviews" element={<InterviewsView />} />
            </Route>
            <Route element={<GateOutlet test={u => navItemVisible(u, 'esign-documents')} />}>
              <Route path="esign-documents" element={<EsignDocumentsPage />} />
            </Route>
            <Route element={<GateOutlet test={u => navItemVisible(u, 'team')} />}>
              <Route path="team" element={<TeamView />} />
            </Route>
            <Route element={<GateOutlet test={u => navItemVisible(u, 'referrals')} />}>
              <Route path="referrals" element={<ReferralsHubPage />} />
            </Route>
            <Route path="settings" element={<SettingsAccessGate />}>
              <Route index element={<SettingsIndexRedirect />} />
              <Route element={<GateOutlet test={u => navItemVisible(u, 'settings-general')} />}>
                <Route path="general" element={<GeneralSettingsLayout />}>
                  <Route index element={<Navigate to="organization" replace />} />
                  <Route path="organization" element={<OrganizationSettingsPage />} />
                  <Route path="job-setup-flow" element={<JobSetupSectionsSettingsPage />} />
                  <Route path="departments" element={<DepartmentsSettingsPage />} />
                  <Route path="job-locations" element={<JobLocationsSettingsPage />} />
                  <Route path="workspace" element={<WorkspaceSettingsPage />} />
                  <Route path="appearance" element={<AppearanceSettingsPage />} />
                  <Route path="referrals" element={<ReferralProgramSettingsPage />} />
                  <Route path="audit" element={<RedirectAuditFromGeneralToCompliance />} />
                </Route>
              </Route>
              <Route element={<GateOutlet test={u => can(u, 'settings', 'admin_roles')} />}>
                <Route path="audit-compliance" element={<AuditComplianceSettingsLayout />}>
                  <Route index element={<Navigate to="overview" replace />} />
                  <Route path="overview" element={<AuditComplianceOverviewPage />} />
                  <Route path="audit-logs" element={<AuditLogEntriesPage />} />
                  <Route path="delivery-failures" element={<AuditDeliveryFailuresPage />} />
                </Route>
              </Route>
              <Route element={<GateOutlet test={u => can(u, 'jobs', 'edit')} />}>
                <Route path="custom-fields" element={<CustomFieldsSettingsLayout />}>
                  <Route index element={<Navigate to="jobs" replace />} />
                  <Route path="jobs" element={<CustomFieldsEntityPage entityType="job" />} />
                  <Route path="candidates" element={<CustomFieldsEntityPage entityType="application" />} />
                </Route>
                <Route path="labels" element={<LabelsSettingsPage />} />
              </Route>
              <Route element={<GateOutlet test={u => can(u, 'settings', 'integrations')} />}>
                <Route path="communication-channels" element={<Outlet />}>
                  <Route index element={<CommunicationChannelsHubPage />} />
                  <Route path="email" element={<CommunicationChannelsEmailPage />} />
                </Route>
              </Route>
              <Route path="esign" element={<EsignSettingsAccess />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<EsignOverviewPage />} />
                <Route path="templates" element={<EsignTemplatesListPage />} />
                <Route element={<EsignManageOutlet />}>
                  <Route path="templates/new" element={<EsignTemplateEditorPage />} />
                  <Route path="templates/:templateId/edit" element={<EsignTemplateEditorPage />} />
                  <Route path="rules" element={<EsignRulesPage />} />
                  <Route path="advanced" element={<EsignAdvancedPage />} />
                </Route>
              </Route>
              <Route path="*" element={<SettingsUnknownRedirect />} />
            </Route>
          </Route>
        </Route>
      </Route>
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppearanceProvider>
            <AppRoutes />
          </AppearanceProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
