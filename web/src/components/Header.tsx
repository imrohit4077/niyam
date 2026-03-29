import { useState, useRef, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import type { UserData } from '../api/auth'

interface Props {
  user?: UserData | null
  onSignOut?: () => void
  variant?: 'app' | 'auth'
  /** e.g. /account/1/profile — SPA home for logged-in user */
  accountHomePath?: string
}

function BrandIcon() {
  return (
    <div className="header-brand-icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 18L12 4L20 18H16L12 10L8 18H4Z" fill="white" />
      </svg>
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function UserAvatar({ name, avatar, size = 32 }: { name: string; avatar: string | null; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="header-avatar" style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {avatar ? <img src={avatar} alt={name} /> : initials}
    </div>
  )
}

export default function Header({ user, onSignOut, variant = 'app', accountHomePath }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  if (variant === 'auth') {
    return (
      <header className="header header-auth">
        <div className="header-inner">
          <a className="header-brand" href="/">
            <BrandIcon />
            <span className="header-brand-text">ATS</span>
          </a>
        </div>
      </header>
    )
  }

  return (
    <header className="header header-app">
      <div className="header-inner">
        <div className="header-left">
          {accountHomePath ? (
            <Link className="header-brand" to={accountHomePath}>
              <BrandIcon />
              <span className="header-brand-text">ATS</span>
            </Link>
          ) : (
            <a className="header-brand" href="/">
              <BrandIcon />
              <span className="header-brand-text">ATS</span>
            </a>
          )}
          <div className="header-search">
            <SearchIcon />
            <input type="text" placeholder="Search jobs, candidates..." className="header-search-input" />
            <kbd className="header-search-kbd">/</kbd>
          </div>
        </div>

        <div className="header-right">
          <button className="header-icon-btn" title="Notifications">
            <BellIcon />
            <span className="header-notif-dot" />
          </button>

          {user && (
            <div className="header-user-menu" ref={menuRef}>
              <button className="header-user-trigger" onClick={() => setMenuOpen(o => !o)}>
                <UserAvatar name={user.name} avatar={user.avatar} size={32} />
                <div className="header-user-info">
                  <span className="header-user-name">{user.name}</span>
                  <span className="header-user-role">
                    {user.role?.name ?? 'Member'}
                    {user.account && <> &middot; {user.account.name}</>}
                  </span>
                </div>
                <svg className={`header-chevron ${menuOpen ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {menuOpen && (
                <div className="header-dropdown">
                  <div className="header-dropdown-header">
                    <UserAvatar name={user.name} avatar={user.avatar} size={40} />
                    <div>
                      <div className="header-dropdown-name">{user.name}</div>
                      <div className="header-dropdown-email">{user.email}</div>
                    </div>
                  </div>
                  <div className="header-dropdown-divider" />
                  {accountHomePath ? (
                    <NavLink
                      className="header-dropdown-item"
                      to={accountHomePath}
                      onClick={() => setMenuOpen(false)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 8a7 7 0 0114 0H5z" /></svg>
                      My Profile
                    </NavLink>
                  ) : (
                    <button className="header-dropdown-item" onClick={() => setMenuOpen(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 8a7 7 0 0114 0H5z" /></svg>
                      My Profile
                    </button>
                  )}
                  <NavLink
                    className="header-dropdown-item"
                    to={accountHomePath ? accountHomePath.replace(/\/profile$/, '/settings') : '/settings'}
                    onClick={() => setMenuOpen(false)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96a7.02 7.02 0 00-1.62-.94l-.36-2.54A.484.484 0 0014 2h-4a.484.484 0 00-.48.41l-.36 2.54a7.4 7.4 0 00-1.62.94l-2.39-.96a.48.48 0 00-.59.22L2.74 8.87a.47.47 0 00.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.47.47 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.36 1.04.67 1.62.94l.36 2.54c.05.24.27.41.48.41h4c.24 0 .44-.17.47-.41l.36-2.54a7.4 7.4 0 001.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 00-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 110-7.2 3.6 3.6 0 010 7.2z" /></svg>
                    Settings
                  </NavLink>
                  <div className="header-dropdown-divider" />
                  <button className="header-dropdown-item header-dropdown-danger" onClick={onSignOut}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
