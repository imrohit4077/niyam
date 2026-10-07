import { useState, useRef, useEffect, useMemo } from 'react'
import { Link, NavLink } from 'react-router-dom'
import type { UserData } from '../api/auth'
import { can, settingsAreaVisible } from '../permissions'
import { Icon } from '../icons'

interface Props {
  user: UserData
  onSignOut: () => void
  /** e.g. /account/1/profile — SPA home for logged-in user */
  accountHomePath: string
  /** Opens the sidebar drawer on small screens. */
  onToggleNav?: () => void
}

function UserAvatar({ name, avatar, size = 32 }: { name: string; avatar: string | null; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <span className="header-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {avatar ? <img src={avatar} alt={name} /> : initials}
    </span>
  )
}

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

export default function Header({ user, onSignOut, accountHomePath, onToggleNav }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const showSettingsLink = useMemo(() => settingsAreaVisible(user), [user])
  const canCreateJob = useMemo(() => can(user, 'jobs', 'edit'), [user])
  const accountBase = accountHomePath.replace(/\/profile$/, '')

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

  // "/" or ⌘K / Ctrl+K focuses search, matching the hint shown in the field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const cmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
      if (cmdK || (e.key === '/' && !isTypingTarget(e.target))) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-left">
          {onToggleNav ? (
            <button type="button" className="header-icon-btn header-menu-btn" onClick={onToggleNav} aria-label="Open navigation">
              <Icon name="menu" size={18} />
            </button>
          ) : null}
          <label className="header-search">
            <Icon name="search" size={16} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search jobs, candidates, people…"
              className="header-search-input"
              aria-label="Search"
            />
            <kbd className="header-search-kbd">⌘K</kbd>
          </label>
        </div>

        <div className="header-right">
          {canCreateJob ? (
            <Link to={`${accountBase}/jobs/new`} className="header-cta">
              <Icon name="plus" size={16} strokeWidth={2.2} />
              <span>New job</span>
            </Link>
          ) : null}

          <button type="button" className="header-icon-btn" title="Notifications" aria-label="Notifications">
            <Icon name="bell" size={18} />
            <span className="header-notif-dot" />
          </button>

          <span className="header-divider" aria-hidden />

          <div className="header-user-menu" ref={menuRef}>
            <button
              type="button"
              className="header-user-trigger"
              onClick={() => setMenuOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <UserAvatar name={user.name} avatar={user.avatar} size={34} />
              <span className="header-user-info">
                <span className="header-user-name">{user.name}</span>
                <span className="header-user-role">{user.role?.name ?? 'Member'}</span>
              </span>
              <Icon name="chevronDown" size={16} className={`header-chevron ${menuOpen ? 'open' : ''}`} />
            </button>

            {menuOpen && (
              <div className="header-dropdown" role="menu">
                <div className="header-dropdown-header">
                  <UserAvatar name={user.name} avatar={user.avatar} size={42} />
                  <div className="header-dropdown-id">
                    <div className="header-dropdown-name">{user.name}</div>
                    <div className="header-dropdown-email">{user.email}</div>
                    {user.account ? (
                      <div className="header-dropdown-account">
                        {user.account.name}
                        {user.account.plan ? <span className="header-dropdown-plan">{user.account.plan}</span> : null}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="header-dropdown-divider" />
                <NavLink className="header-dropdown-item" to={accountHomePath} onClick={() => setMenuOpen(false)} role="menuitem">
                  <Icon name="dashboard" size={16} />
                  Overview
                </NavLink>
                {showSettingsLink ? (
                  <NavLink
                    className="header-dropdown-item"
                    to={`${accountBase}/settings`}
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                  >
                    <Icon name="settings" size={16} />
                    Settings
                  </NavLink>
                ) : null}
                <div className="header-dropdown-divider" />
                <button type="button" className="header-dropdown-item header-dropdown-danger" onClick={onSignOut} role="menuitem">
                  <Icon name="logout" size={16} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
