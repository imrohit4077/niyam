import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { ToastProvider } from './contexts/ToastContext'
import { AuthProvider, useAuth } from './auth/AuthContext'
import LoginPage from './pages/LoginPage'
import JobEditorPage from './pages/JobEditorPage'
import PublicJobApplyPage from './pages/PublicJobApplyPage'
import DashboardLayout from './layouts/DashboardLayout'
import HiringPlansView from './components/HiringPlansView'
import PipelineBoardView from './components/PipelineBoardView'
import {
  ProfileView,
  JobsView,
  JobBoardsView,
  PostingsView,
  ApplicationsView,
  CandidatesView,
  InterviewsView,
  TeamView,
  SettingsView,
} from './components/PageViews'
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
      <Route element={<RequireAuth />}>
        <Route path="/account/:accountId" element={<AccountRedirect />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<ProfileView />} />
            <Route path="jobs" element={<JobsView />} />
            <Route path="jobs/new" element={<JobEditorPage />} />
            <Route path="jobs/:jobId/edit" element={<JobEditorPage />} />
            <Route path="hiring-plans" element={<HiringPlansView />} />
            <Route path="pipeline" element={<PipelineBoardView />} />
            <Route path="job-boards" element={<JobBoardsView />} />
            <Route path="postings" element={<PostingsView />} />
            <Route path="job-applications" element={<ApplicationsView />} />
            <Route path="candidates" element={<CandidatesView />} />
            <Route path="interviews" element={<InterviewsView />} />
            <Route path="team" element={<TeamView />} />
            <Route path="settings" element={<SettingsView />} />
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
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
