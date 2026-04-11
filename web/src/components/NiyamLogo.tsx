const LOGO_SRC = '/niyam-logo.png'

type Props = {
  className?: string
  width: number
  height: number
  /** Empty string when the logo is decorative next to visible text */
  alt?: string
}

export default function NiyamLogo({ className, width, height, alt = 'Niyam' }: Props) {
  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      width={width}
      height={height}
      className={className}
      decoding="async"
    />
  )
}
