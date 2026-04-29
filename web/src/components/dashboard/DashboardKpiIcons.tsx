import type { SVGProps } from 'react'

const common: SVGProps<SVGSVGElement> = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none' }

export function IconUsers(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...common} aria-hidden className="dashboard-kpi-icon-svg" {...props}>
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M3 20.5c1.1-2.2 3.3-3.5 6-3.5h6c2.7 0 4.9 1.3 6 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconBriefcase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...common} aria-hidden className="dashboard-kpi-icon-svg" {...props}>
      <path
        d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M8 6V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 10h20" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function IconCalendar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...common} aria-hidden className="dashboard-kpi-icon-svg" {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 10h18M8 3v3M16 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconGift(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...common} aria-hidden className="dashboard-kpi-icon-svg" {...props}>
      <rect x="3" y="10" width="18" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 10v11M3 15h18" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 10V8a2 2 0 0 1 1.3-1.9 2 2 0 0 1 2.1.2 2 2 0 0 1 2.1-.2A2 2 0 0 1 15 8v2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}
