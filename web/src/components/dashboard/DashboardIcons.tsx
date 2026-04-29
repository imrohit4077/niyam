import type { SVGProps } from 'react'

function IconBase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    />
  )
}

export function IconCandidates(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path
        d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5Zm8 0h-.29c.07.32.12.65.12 1 0 .34-.05.67-.14 1H16c1.49 0 2.89.47 4 1.29V19h6v-2.5c0-2.02-3.77-3.28-6.51-3.5Z"
        fill="currentColor"
        opacity="0.92"
      />
    </IconBase>
  )
}

export function IconBriefcase(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path
        d="M10 16v-1H7v-2h10v2h-3v1h4a2 2 0 002-2V9a2 2 0 00-2-2h-2V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H8a2 2 0 00-2 2v5a2 2 0 002 2h2Zm2-12h4v2h-4V4Zm8 9h-4v1h-4v-1H8V9h12v4Z"
        fill="currentColor"
        opacity="0.92"
      />
    </IconBase>
  )
}

export function IconCalendar(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path
        d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2Zm0 16H5V10h14v10Zm0-12H5V6h14v2Z"
        fill="currentColor"
        opacity="0.92"
      />
    </IconBase>
  )
}

export function IconOffer(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path
        d="M20 6h-2.18c.11-.31.18-.65.18-1a3 3 0 00-3-3c-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68A2.99 2.99 0 0012 2a3 3 0 00-3 3c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2Zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1ZM9 5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1Zm11 14H4v-2h16v2Zm0-5H4V8h16v6Z"
        fill="currentColor"
        opacity="0.92"
      />
    </IconBase>
  )
}
