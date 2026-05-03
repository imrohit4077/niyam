import { Navigate, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { UserData } from '../api/auth'
import { can, navItemVisible, settingsAreaVisible, type NavId } from '../permissions'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import SettingsLayout from '../layouts/SettingsLayout'
import EsignSettingsLayout from '../layouts/EsignSettingsLayout'

function safeAccountId(accountId: string | undefined, user: UserData | null | undefined): string {
  if (accountId && /^\d+$/.test(accountId)) return accountId
  if (user?.account?.id != null) return String(user.account.id)
  return ''
}

export function GateOutlet({ test }: { test: (u: UserData | null | undefined) => boolean }) {
  const { user } = useAuth()
  const { accountId } = useParams<{ accountId: string }>()
  const id = safeAccountId(accountId, user)
  /** Must forward parent layout context — RR only supplies `useOutletContext` one level down. */
  const dashboardCtx = useOutletContext<DashboardOutletContext | undefined>()
  if (!user || !test(user)) {
    if (id) return <Navigate to={`/account/${id}/profile`} replace />
    return <Navigate to="/" replace />
  }
  return <Outlet context={dashboardCtx} />
}

export function SettingsAccessGate() {
  const { user } = useAuth()
  const { accountId } = useParams<{ accountId: string }>()
  const id = safeAccountId(accountId, user)
  if (!settingsAreaVisible(user)) {
    if (id) return <Navigate to={`/account/${id}/profile`} replace />
    return <Navigate to="/" replace />
  }
  return <SettingsLayout />
}

/** Picks the first settings subsection the user may access (stable order). */
export function EsignSettingsAccess() {
  const { user } = useAuth()
  const { accountId } = useParams<{ accountId: string }>()
  const id = safeAccountId(accountId, user)
  if (!navItemVisible(user, 'settings-esign')) {
    if (id) return <Navigate to={`/account/${id}/profile`} replace />
    return <Navigate to="/" replace />
  }
  return <EsignSettingsLayout />
}

export function EsignManageOutlet() {
  return <GateOutlet test={u => can(u, 'esign', 'manage')} />
}

export function SettingsIndexRedirect() {
  const { user } = useAuth()
  const { accountId } = useParams<{ accountId: string }>()
  const acct = safeAccountId(accountId, user)
  const base = `/account/${acct}/settings`
  const order: NavId[] = [
    'settings-general',
    'settings-custom-fields',
    'settings-labels',
    'settings-communication-channels',
    'settings-esign',
    'settings-audit-compliance',
  ]
  for (const navId of order) {
    if (!navItemVisible(user, navId)) continue
    if (navId === 'settings-general') return <Navigate to={`${base}/general/organization`} replace />
    if (navId === 'settings-custom-fields') return <Navigate to={`${base}/custom-fields/jobs`} replace />
    if (navId === 'settings-labels') return <Navigate to={`${base}/labels`} replace />
    if (navId === 'settings-communication-channels') return <Navigate to={`${base}/communication-channels`} replace />
    if (navId === 'settings-esign') return <Navigate to={`${base}/esign/overview`} replace />
    if (navId === 'settings-audit-compliance') return <Navigate to={`${base}/audit-compliance/overview`} replace />
  }
  if (acct) return <Navigate to={`/account/${acct}/profile`} replace />
  return <Navigate to="/" replace />
}
