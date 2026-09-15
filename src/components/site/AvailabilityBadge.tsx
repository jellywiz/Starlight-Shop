import type { Dictionary } from '@/i18n/dictionary'

/** Availability label with an icon so it never relies on color alone. */
export function AvailabilityBadge({ available, dict }: { available: boolean; dict: Dictionary }) {
  return available ? (
    <span className="badge-available">
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
        <path d="M7.6 13.4 4.2 10l1.4-1.4 2 2 6.8-6.8L15.8 5z" />
      </svg>
      {dict.common.available}
    </span>
  ) : (
    <span className="badge-unavailable">
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
        <path d="M5.3 3.9 3.9 5.3 8.6 10l-4.7 4.7 1.4 1.4L10 11.4l4.7 4.7 1.4-1.4L11.4 10l4.7-4.7-1.4-1.4L10 8.6z" />
      </svg>
      {dict.common.unavailable}
    </span>
  )
}
