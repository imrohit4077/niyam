/**
 * UI + route gates aligned with API permission keys (`resource:action`).
 * Full workspace access: admin, superadmin, site_admin (matches backend JWT role + profile.full_access).
 * Exception: Settings (`settings-*` nav + `/account/.../settings`) is superadmin-only in the UI.
 */

import type { UserData } from './api/auth'

export const FULL_ACCESS_ROLE_SLUGS = ['admin', 'superadmin', 'site_admin'] as const

/** Workspace Settings UI + `/account/.../settings` routes: superadmin only (not admin/site_admin). */
export function isSuperAdmin(user: UserData | null | undefined): boolean {
  if (!user) return false
  const primary = user.role?.slug?.toLowerCase()
  if (primary === 'superadmin') return true
  return (user.role_slugs ?? []).some(s => s.toLowerCase() === 'superadmin')
}

export function hasFullAccess(user: UserData | null | undefined): boolean {
  if (!user) return false
  if (user.full_access) return true
  const s = user.role?.slug?.toLowerCase()
  return FULL_ACCESS_ROLE_SLUGS.includes(s as (typeof FULL_ACCESS_ROLE_SLUGS)[number])
}

export function permissionSet(user: UserData | null | undefined): Set<string> {
  if (!user?.permissions?.length) return new Set()
  return new Set(user.permissions)
}

export function can(user: UserData | null | undefined, resource: string, action: string): boolean {
  if (!user) return false
  if (hasFullAccess(user)) return true
  return permissionSet(user).has(`${resource}:${action}`)
}

export function canAny(user: UserData | null | undefined, keys: Array<[string, string]>): boolean {
  if (!user) return false
  if (hasFullAccess(user)) return true
  const s = permissionSet(user)
  return keys.some(([r, a]) => s.has(`${r}:${a}`))
}

/** Sidebar / route ids (aligned with Sidebar.tsx `SidebarPage`). */
export type NavId =
  | 'profile'
  | 'jobs-all'
  | 'jobs-mine'
  | 'jobs-role-kickoff'
  | 'hiring-plans'
  | 'pipeline'
  | 'job-boards'
  | 'postings'
  | 'job-applications'
  | 'candidates'
  | 'interviews'
  | 'esign-documents'
  | 'referrals'
  | 'team'
  | 'settings-general'
  | 'settings-custom-fields'
  | 'settings-labels'
  | 'settings-communication-channels'
  | 'settings-audit-compliance'
  | 'settings-esign'

type NavRule = { anyOf: Array<[string, string]> } | { allOf: Array<[string, string]> } | { always: true }

export const NAV_RULES: Record<NavId, NavRule> = {
  profile: { always: true },
  'jobs-all': { anyOf: [['jobs', 'view']] },
  'jobs-mine': { anyOf: [['jobs', 'view']] },
  'jobs-role-kickoff': { anyOf: [['kickoff', 'submit'], ['kickoff', 'process']] },
  'hiring-plans': { anyOf: [['jobs', 'view']] },
  pipeline: { anyOf: [['applications', 'view_all'], ['applications', 'view_assigned'], ['applications', 'move_stage']] },
  'job-boards': { anyOf: [['jobs', 'view']] },
  postings: { anyOf: [['jobs', 'view']] },
  'job-applications': { anyOf: [['applications', 'view_all'], ['applications', 'view_assigned']] },
  candidates: { anyOf: [['applications', 'view_all'], ['applications', 'view_assigned']] },
  interviews: {
    anyOf: [
      ['interviews', 'perform'],
      ['interviews', 'schedule'],
      ['interviews', 'claim_assignment'],
      ['applications', 'view_all'],
    ],
  },
  'esign-documents': { anyOf: [['esign', 'view']] },
  referrals: { anyOf: [['referrals', 'view']] },
  team: { anyOf: [['jobs', 'view']] },
  /** Overridden in `navItemVisible`: Settings nav is superadmin-only. */
  'settings-general': { anyOf: [['jobs', 'view']] },
  'settings-custom-fields': { anyOf: [['jobs', 'edit']] },
  'settings-labels': { anyOf: [['jobs', 'edit']] },
  'settings-communication-channels': { anyOf: [['settings', 'integrations']] },
  'settings-audit-compliance': { anyOf: [['settings', 'admin_roles']] },
  'settings-esign': { anyOf: [['esign', 'view']] },
}

export function navItemVisible(user: UserData | null | undefined, id: NavId): boolean {
  if (!user) return false
  if (String(id).startsWith('settings-')) {
    return isSuperAdmin(user)
  }
  if (hasFullAccess(user)) return true
  const rule = NAV_RULES[id]
  if (!rule) return false
  if ('always' in rule) return true
  if ('anyOf' in rule) return canAny(user, rule.anyOf)
  return rule.allOf.every(([r, a]) => can(user, r, a))
}

/** True if the user can open workspace Settings (any sub-section). Superadmin only. */
export function settingsAreaVisible(user: UserData | null | undefined): boolean {
  return isSuperAdmin(user)
}
