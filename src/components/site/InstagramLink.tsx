import type { Dictionary } from '@/i18n/dictionary'

export function InstagramIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" />
    </svg>
  )
}

/**
 * The Instagram action (spec section 8): a normal HTTPS link to the confirmed profile,
 * opened in a new tab with rel protection and an explicit "opens Instagram" hint. No
 * message prefilling, no API, no tracking.
 */
export function InstagramLink({
  href,
  label,
  dict,
  className = 'btn-instagram',
}: {
  href: string
  label: string
  dict: Dictionary
  className?: string
}) {
  return (
    <a
      href={href}
      className={className}
      target="_blank"
      rel="noopener noreferrer external"
      title={dict.common.opensInNewTab}
    >
      <InstagramIcon />
      <span>{label}</span>
      <span className="sr-only"> ({dict.common.opensInNewTab})</span>
    </a>
  )
}
