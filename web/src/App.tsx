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
import SettingsLayout from './layouts/SettingsLayout'
import EsignSettingsLayout from './layouts/EsignSettingsLayout'
import GeneralSettingsLayout from './layouts/GeneralSettingsLayout'
import AuditComplianceSettingsLayout from './layouts/AuditComplianceSettingsLayout'
import OrganizationSettingsPage from './pages/settings/OrganizationSettingsPage'
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
import CommunicationChannelsPage from './pages/settings/CommunicationChannelsPage'
import HomeDashboardPage from './pages/HomeDashboardPage'
import EsignOverviewPage from './pages/esign/EsignOverviewPage'
import EsignTemplatesListPage from './pages/esign/EsignTemplatesListPage'
import EsignTemplateEditorPage from './pages/esign/EsignTemplateEditorPage'
import EsignRulesPage from './pages/esign/EsignRulesPage'
import EsignAdvancedPage from './pages/esign/EsignAdvancedPage'
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
  if (!user?.account || !accountId) return null
  if (accountId !== String(user.account.id)) {
    const suffix = location.pathname.replace(/^\/account\/[^/]+/, '') || '/profile'
    return <Navigate to={`/account/${user.account.id}${suffix}`} replace />
  }
  return <Outlet />
}

function AuditComplianceAdminGate() {
  const { accountId } = useParams<{ accountId: string }>()
  const { user } = useAuth()
  const slug = user?.role?.slug
  if (slug !== 'admin' && slug !== 'superadmin') {
    return <Navigate to={`/account/${accountId}/settings/general/organization`} replace />
  }
  return <Outlet />
}

function CommunicationChannelsAdminGate() {
  const { accountId } = useParams<{ accountId: string }>()
  const { user } = useAuth()
  const slug = user?.role?.slug
  if (slug !== 'admin' && slug !== 'superadmin') {
    return <Navigate to={`/account/${accountId}/settings/general/organization`} replace />
  }
  return <Outlet />
}

/** Old URL: /settings/general/audit → new section */
function RedirectAuditFromGeneralToCompliance() {
  const { accountId } = useParams<{ accountId: string }>()
  return <Navigate to={`/account/${accountId}/settings/audit-compliance/overview`} replace />
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (user?.account) return <Navigate to={`/account/${user.account.id}/profile`} replace />
  return <Navigate to="/login" replace />
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
            <Route path="jobs" element={<JobsView />} />
            <Route path="jobs/new" element={<JobEditorPage />} />
            <Route path="jobs/:jobId/edit" element={<JobEditorPage />} />
            <Route path="hiring-plans" element={<HiringPlansView />} />
            <Route path="pipeline" element={<PipelineBoardView />} />
            <Route path="job-boards" element={<JobBoardsView />} />
            <Route path="postings" element={<PostingsView />} />
            <Route path="job-applications" element={<ApplicationsView />} />
            <Route path="job-applications/:applicationId" element={<ApplicationDetailPage />} />
            <Route path="candidates" element={<CandidatesView />} />
            <Route path="interviews" element={<InterviewsView />} />
            <Route path="esign-documents" element={<EsignDocumentsPage />} />
            <Route path="team" element={<TeamView />} />
            <Route path="referrals" element={<ReferralsHubPage />} />
            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="general" replace />} />
              <Route path="general" element={<GeneralSettingsLayout />}>
                <Route index element={<Navigate to="organization" replace />} />
                <Route path="organization" element={<OrganizationSettingsPage />} />
                <Route path="workspace" element={<WorkspaceSettingsPage />} />
                <Route path="appearance" element={<AppearanceSettingsPage />} />
                <Route path="referrals" element={<ReferralProgramSettingsPage />} />
                <Route path="audit" element={<RedirectAuditFromGeneralToCompliance />} />
              </Route>
              <Route path="audit-compliance" element={<AuditComplianceAdminGate />}>
                <Route element={<AuditComplianceSettingsLayout />}>
                  <Route index element={<Navigate to="overview" replace />} />
                  <Route path="overview" element={<AuditComplianceOverviewPage />} />
                  <Route path="audit-logs" element={<AuditLogEntriesPage />} />
                  <Route path="delivery-failures" element={<AuditDeliveryFailuresPage />} />
                </Route>
              </Route>
              <Route path="custom-fields" element={<CustomFieldsSettingsLayout />}>
                <Route index element={<Navigate to="jobs" replace />} />
                <Route path="jobs" element={<CustomFieldsEntityPage entityType="job" />} />
                <Route path="candidates" element={<CustomFieldsEntityPage entityType="application" />} />
              </Route>
              <Route path="labels" element={<LabelsSettingsPage />} />
              <Route path="communication-channels" element={<CommunicationChannelsAdminGate />}>
                <Route index element={<CommunicationChannelsPage />} />
              </Route>
              <Route path="esign" element={<EsignSettingsLayout />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<EsignOverviewPage />} />
                <Route path="templates" element={<EsignTemplatesListPage />} />
                <Route path="templates/new" element={<EsignTemplateEditorPage />} />
                <Route path="templates/:templateId/edit" element={<EsignTemplateEditorPage />} />
                <Route path="rules" element={<EsignRulesPage />} />
                <Route path="advanced" element={<EsignAdvancedPage />} />
              </Route>
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
