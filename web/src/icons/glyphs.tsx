import type { ReactNode } from 'react'

/**
 * Line glyphs — the single source of truth for every 2D icon in Niyam.
 * 24×24 grid, drawn for a 1.75 stroke with round caps/joins. Domain glyphs share
 * their name with a 3D model in `three/models.ts`, so `<Icon name="jobs" />` and
 * `<Icon3D name="jobs" />` always depict the same concept.
 */
export const GLYPHS = {
  /* ── Domain (also available in 3D) ── */
  brand: (
    <>
      <path d="M12 3.2c-2.3 1.4-4.6 2-7 2.1v6.2c0 4.3 2.9 7.6 7 9.3 4.1-1.7 7-5 7-9.3V5.3c-2.4-.1-4.7-.7-7-2.1z" />
      <path d="M9 9.5h6M9 12.5h6M9 15.5h3.5" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="8" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="2" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="2" />
      <rect x="3.5" y="14.5" width="7" height="6" rx="2" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c.9-3.6 3.9-5.8 7.5-5.8s6.6 2.2 7.5 5.8" />
    </>
  ),
  candidates: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.8 19.5c.7-3.2 3.2-5.2 6.2-5.2s5.5 2 6.2 5.2" />
      <path d="M15.5 4.8a3.5 3.5 0 010 6.4M17.6 14.6c2 .7 3.3 2.4 3.7 4.9" />
    </>
  ),
  team: (
    <>
      <circle cx="12" cy="7.5" r="3" />
      <circle cx="5.5" cy="10" r="2.2" />
      <circle cx="18.5" cy="10" r="2.2" />
      <path d="M7 19.5c.5-3 2.6-4.9 5-4.9s4.5 1.9 5 4.9M2 18.5c.3-1.9 1.6-3.2 3.3-3.4M22 18.5c-.3-1.9-1.6-3.2-3.3-3.4" />
    </>
  ),
  jobs: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M8.5 7V5.5A1.5 1.5 0 0110 4h4a1.5 1.5 0 011.5 1.5V7M3 12.5h18M10.5 12.5v1.5h3v-1.5" />
    </>
  ),
  kickoff: (
    <>
      <path d="M12 2.8c3 2.1 4.6 5.5 4.6 9.2v4.2H7.4V12c0-3.7 1.6-7.1 4.6-9.2z" />
      <circle cx="12" cy="9.5" r="1.8" />
      <path d="M7.4 12.5l-2.6 2.2v3.5l2.6-1.7M16.6 12.5l2.6 2.2v3.5l-2.6-1.7M10 19.5l2 2 2-2" />
    </>
  ),
  plans: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
      <path d="M12 12l6.5-6.5M16 5.5h2.5V8" />
    </>
  ),
  pipeline: (
    <>
      <rect x="3" y="4" width="5" height="16" rx="1.6" />
      <rect x="9.5" y="4" width="5" height="11" rx="1.6" />
      <rect x="16" y="4" width="5" height="7" rx="1.6" />
    </>
  ),
  boards: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3z" />
    </>
  ),
  postings: (
    <>
      <path d="M4 10v4a1.5 1.5 0 001.5 1.5H7l9 4.5V4L7 8.5H5.5A1.5 1.5 0 004 10z" />
      <path d="M7 15.5l1.3 4.2a1.2 1.2 0 002.3-.7L9.8 16M19 9.5a3.5 3.5 0 010 5" />
    </>
  ),
  attributes: (
    <>
      <path d="M12 3.5l8.5 4.3-8.5 4.3-8.5-4.3L12 3.5z" />
      <path d="M3.5 12.2l8.5 4.3 8.5-4.3M3.5 16.4l8.5 4.3 8.5-4.3" />
    </>
  ),
  stages: (
    <>
      <path d="M3 20.5h18" />
      <rect x="3.5" y="14" width="5" height="6.5" rx="1.2" />
      <rect x="9.5" y="9.5" width="5" height="11" rx="1.2" />
      <rect x="15.5" y="4.5" width="5" height="16" rx="1.2" />
    </>
  ),
  applications: (
    <>
      <path d="M14 3H7.5A2.5 2.5 0 005 5.5v13A2.5 2.5 0 007.5 21h9a2.5 2.5 0 002.5-2.5V8l-5-5z" />
      <path d="M14 3v5h5M8.5 12.5h7M8.5 16h5" />
    </>
  ),
  interviews: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 17.2h.01M12 17.2h.01" strokeWidth="2.4" />
    </>
  ),
  signature: (
    <>
      <path d="M13 3H7.5A2.5 2.5 0 005 5.5v13A2.5 2.5 0 007.5 21H12" />
      <path d="M8.5 8h5M8.5 11.5h3" />
      <path d="M18.4 9.6a1.9 1.9 0 012.7 2.7l-5.6 5.6-3.4.8.8-3.4 5.5-5.7z" />
    </>
  ),
  referrals: (
    <>
      <rect x="3.5" y="9" width="17" height="11.5" rx="2" />
      <path d="M2.5 9h19v3.5h-19zM12 9v11.5" />
      <path d="M12 9c-1.4-3.6-5.6-4.6-5.6-2.2C6.4 8.4 9 9 12 9zM12 9c1.4-3.6 5.6-4.6 5.6-2.2 0 1.6-2.6 2.2-5.6 2.2z" />
    </>
  ),
  settings: (
    <>
      <path d="M10.3 3.6a1.8 1.8 0 013.4 0l.4 1.1a1.8 1.8 0 002.4 1l1.1-.5a1.8 1.8 0 012.4 2.4l-.5 1.1a1.8 1.8 0 001 2.4l1.1.4a1.8 1.8 0 010 3.4l-1.1.4a1.8 1.8 0 00-1 2.4l.5 1.1a1.8 1.8 0 01-2.4 2.4l-1.1-.5a1.8 1.8 0 00-2.4 1l-.4 1.1a1.8 1.8 0 01-3.4 0l-.4-1.1a1.8 1.8 0 00-2.4-1l-1.1.5a1.8 1.8 0 01-2.4-2.4l.5-1.1a1.8 1.8 0 00-1-2.4l-1.1-.4a1.8 1.8 0 010-3.4l1.1-.4a1.8 1.8 0 001-2.4l-.5-1.1a1.8 1.8 0 012.4-2.4l1.1.5a1.8 1.8 0 002.4-1l.4-1.1z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  fields: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <path d="M17 13.5v7M13.5 17h7" />
    </>
  ),
  labels: (
    <>
      <path d="M3.5 11.6V5a1.5 1.5 0 011.5-1.5h6.6a2 2 0 011.4.6l7.9 7.9a2 2 0 010 2.8l-6.6 6.6a2 2 0 01-2.8 0l-7.9-7.9a2 2 0 01-.6-1.4z" />
      <circle cx="8" cy="8" r="1.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3.5 6.5l7.3 5.6a2 2 0 002.4 0l7.3-5.6" />
    </>
  ),
  audit: (
    <>
      <path d="M12 3c-2.3 1.4-4.6 2-7 2.1v6.2c0 4.3 2.9 7.6 7 9.3 4.1-1.7 7-5 7-9.3V5.1c-2.4-.1-4.7-.7-7-2.1z" />
      <path d="M8.8 12l2.2 2.2 4.2-4.4" />
    </>
  ),
  esign: (
    <>
      <path d="M15 4.5l4.5 4.5-9.3 9.3-5.6 1.1 1.1-5.6L15 4.5z" />
      <path d="M12.8 6.7l4.5 4.5M4 21h16" />
    </>
  ),
  analytics: (
    <>
      <path d="M3.5 20.5h17" />
      <rect x="5" y="12" width="3.5" height="6" rx="1" />
      <rect x="10.25" y="8" width="3.5" height="10" rx="1" />
      <rect x="15.5" y="4" width="3.5" height="14" rx="1" />
    </>
  ),
  trophy: (
    <>
      <path d="M7.5 4h9v5a4.5 4.5 0 01-9 0V4z" />
      <path d="M7.5 6H4.5v1.5a3 3 0 003 3M16.5 6h3v1.5a3 3 0 01-3 3M12 13.5V17M8.5 20.5h7M9.5 17h5v3.5h-5z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  funnel: (
    <>
      <path d="M3.5 4.5h17l-6.5 8v5.5l-4 2v-7.5l-6.5-8z" />
    </>
  ),
  building: (
    <>
      <rect x="4.5" y="3" width="11" height="18" rx="1.5" />
      <path d="M15.5 9h3a1.5 1.5 0 011.5 1.5V21M2.5 21h19M8 7h.01M12 7h.01M8 10.5h.01M12 10.5h.01M8 14h.01M12 14h.01" />
      <path d="M8.5 21v-3h3v3" />
    </>
  ),
  location: (
    <>
      <path d="M12 21s-6.5-5.4-6.5-10.8a6.5 6.5 0 0113 0C18.5 15.6 12 21 12 21z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 100 18c1.2 0 1.8-.8 1.8-1.7 0-1.3-1-1.6-1-2.6 0-.9.7-1.6 1.7-1.6h2.1A4.4 4.4 0 0021 10.7C21 6.4 17 3 12 3z" />
      <circle cx="7.5" cy="11" r="1.2" />
      <circle cx="10" cy="7" r="1.2" />
      <circle cx="15" cy="7.2" r="1.2" />
    </>
  ),
  folder: (
    <>
      <path d="M3 7.5A2.5 2.5 0 015.5 5h3.6a2 2 0 011.5.7l1.3 1.6h6.6A2.5 2.5 0 0121 9.8v7.7a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 17.5v-10z" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3l1.9 5.2a2 2 0 001.2 1.2L20.3 11l-5.2 1.9a2 2 0 00-1.2 1.2L12 19.3l-1.9-5.2a2 2 0 00-1.2-1.2L3.7 11l5.2-1.9a2 2 0 001.2-1.2L12 3z" />
      <path d="M19 3v3M17.5 4.5h3" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 13.5l2.6-7.4A2 2 0 018 4.8h8a2 2 0 011.9 1.3l2.6 7.4v4.5a2 2 0 01-2 2h-13a2 2 0 01-2-2v-4.5z" />
      <path d="M3.5 13.5h4.6l1.4 2.5h5l1.4-2.5h4.6" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4.5 4.5 0 006.4 0l3-3a4.5 4.5 0 00-6.4-6.4l-1.2 1.2" />
      <path d="M14 10a4.5 4.5 0 00-6.4 0l-3 3a4.5 4.5 0 006.4 6.4l1.2-1.2" />
    </>
  ),
  workspace: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M9 9v11" />
    </>
  ),
  typography: (
    <>
      <path d="M4 7V5h11v2M9.5 5v14M7.5 19h4M14 12v-1.5h6V12M17 10.5V19M15.8 19h2.4" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9.5a6 6 0 0112 0c0 6 2.5 7.5 2.5 7.5h-17S6 15.5 6 9.5z" />
      <path d="M10.3 20.5a2 2 0 003.4 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20.5 20.5l-4.6-4.6" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3M12 14.5v2.5" />
    </>
  ),
  rocket: (
    <>
      <path d="M12 2.8c3 2.1 4.6 5.5 4.6 9.2v4.2H7.4V12c0-3.7 1.6-7.1 4.6-9.2z" />
      <circle cx="12" cy="9.5" r="1.8" />
      <path d="M10 19.5l2 2 2-2" />
    </>
  ),
  star: (
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z" />
  ),
  shieldCheck: (
    <>
      <path d="M12 3c-2.3 1.4-4.6 2-7 2.1v6.2c0 4.3 2.9 7.6 7 9.3 4.1-1.7 7-5 7-9.3V5.1c-2.4-.1-4.7-.7-7-2.1z" />
      <path d="M8.8 12l2.2 2.2 4.2-4.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c.9-3.6 3.9-5.8 7.5-5.8s6.6 2.2 7.5 5.8" />
    </>
  ),
  userPlus: (
    <>
      <circle cx="10" cy="8" r="4" />
      <path d="M3 20.5c.8-3.6 3.6-5.8 7-5.8 1.5 0 2.9.4 4 1.2M18.5 13v6M15.5 16h6" />
    </>
  ),

  /* ── UI glyphs (2D only) ── */
  home: (
    <>
      <path d="M3.5 10.5L12 3.5l8.5 7V19a1.5 1.5 0 01-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 013.5 19v-8.5z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronUp: <path d="M6 15l6-6 6 6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronsLeft: <path d="M11 7l-5 5 5 5M18 7l-5 5 5 5" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  arrowUpRight: <path d="M7 17L17 7M8.5 7H17v8.5" />,
  trendUp: (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  trendDown: (
    <>
      <path d="M3 7l6 6 4-4 8 8" />
      <path d="M15 17h6v-6" />
    </>
  ),
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  sliders: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  more: (
    <path d="M5.5 12h.01M12 12h.01M18.5 12h.01" strokeWidth="3" />
  ),
  edit: (
    <>
      <path d="M15.5 4.5l4 4L9 19l-5 1 1-5L15.5 4.5z" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 12.5A1.5 1.5 0 008.5 21h7a1.5 1.5 0 001.5-1.5L18 7" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  download: <path d="M12 4v11M7 10.5l5 5 5-5M4.5 19.5h15" />,
  upload: <path d="M12 16V5M7 9.5l5-5 5 5M4.5 19.5h15" />,
  external: (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v4.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 014 18.5v-11A1.5 1.5 0 015.5 6H10" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </>
  ),
  list: <path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />,
  table: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10" />
    </>
  ),
  logout: (
    <>
      <path d="M9.5 20.5h-4A1.5 1.5 0 014 19V5a1.5 1.5 0 011.5-1.5h4" />
      <path d="M15.5 16.5L20 12l-4.5-4.5M20 12H9" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 8.5V5.5a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2h3" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11.5A8 8 0 006 6.3L4 8.5M4 12.5a8 8 0 0014 5.2l2-2.2" />
      <path d="M4 4v4.5h4.5M20 20v-4.5h-4.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5h.01" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 4.2a2 2 0 013.4 0l7.5 13a2 2 0 01-1.7 3H4.5a2 2 0 01-1.7-3l7.5-13z" />
      <path d="M12 9.5v4M12 17h.01" />
    </>
  ),
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.2l2.4 2.4 4.6-4.9" />
    </>
  ),
  menu: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  phone: (
    <path d="M5 4h3.5l1.8 4.5-2.3 1.4a11 11 0 005.6 5.6l1.4-2.3 4.5 1.8V19a1.5 1.5 0 01-1.5 1.5A15.5 15.5 0 013.5 5.5 1.5 1.5 0 015 4z" />
  ),
  command: (
    <path d="M9 6.5A2.5 2.5 0 106.5 9H9V6.5zM9 9h6v6H9zM15 6.5V9h2.5A2.5 2.5 0 1015 6.5zM9 15H6.5A2.5 2.5 0 109 17.5V15zM15 15v2.5a2.5 2.5 0 102.5-2.5H15z" />
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3z" />
    </>
  ),
  send: (
    <>
      <path d="M20.5 3.5l-7 17-3.2-7.3L3 10l17.5-6.5z" />
      <path d="M10.3 13.2l4.2-4.2" />
    </>
  ),
  drag: (
    <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth="2.6" />
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof GLYPHS
