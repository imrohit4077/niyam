/** Small inline SVGs for dashboard summary cards (currentColor). */

export function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm6 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-6 1.5c-2.5 0-4.5 1.5-4.5 3.3V17h9v-1.2c0-1.8-2-3.3-4.5-3.3Zm6 .5c-.9 0-1.7.2-2.4.5 1 .7 1.6 1.6 1.6 2.6V17H21v-1.1c0-1.6-2.2-2.9-5-2.9Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function IconBriefcase({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 2h4a2 2 0 0 1 2 2v2h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3V4a2 2 0 0 1 2-2Zm0 2v2h4V4h-4ZM5 8v11h14V8H5Zm4 3h2v3H9v-3Z"
        fill="currentColor"
        opacity="0.92"
      />
    </svg>
  )
}

export function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1Zm12 7H5v11h14V9ZM9 12h2v2H9v-2Z"
        fill="currentColor"
        opacity="0.92"
      />
    </svg>
  )
}

export function IconDocument({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V6h2.5L13 3.5ZM8 12h8v2H8v-2Zm0 4h8v2H8v-2Z"
        fill="currentColor"
        opacity="0.92"
      />
    </svg>
  )
}
