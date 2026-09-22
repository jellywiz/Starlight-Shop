'use client'

import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

/** localStorage key of the visitor's explicit choice; absent means "follow the system". */
export const THEME_STORAGE_KEY = 'sl-theme'

// Keep the choice for this page even when browser storage is blocked.
let pageChoice: Theme | null = null

/**
 * Runs before paint (inline in the document head) so the first frame already has the
 * right theme: the visitor's saved choice, otherwise the operating system setting.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');var t=s==='dark'||s==='light'?s:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`

function storedChoice(): Theme | null {
  if (pageChoice !== null) {
    return pageChoice
  }
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    return pageChoice
  }
}

function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  if (currentTheme() !== theme || !document.documentElement.hasAttribute('data-theme')) {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

/** Keep the document in sync with the preference, including after layout navigation. */
function subscribe(onChange: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const syncTheme = () => {
    applyTheme(storedChoice() ?? (media.matches ? 'dark' : 'light'))
    onChange()
  }
  // React can remove the manually set attribute when a locale layout remounts.
  // Restore it before paint; applyTheme is idempotent so observing it cannot loop.
  const observer = new MutationObserver(syncTheme)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      pageChoice = null
      syncTheme()
    }
  }
  media.addEventListener('change', syncTheme)
  window.addEventListener('storage', onStorage)
  // Also covers a remount that removed the attribute while no observer was subscribed.
  syncTheme()
  return () => {
    observer.disconnect()
    media.removeEventListener('change', syncTheme)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * Light/dark switch for the public site. The choice is kept in this browser; until the
 * visitor chooses, the site follows the system setting (and keeps following it live).
 */
export function ThemeToggle({ labels }: { labels: { toDark: string; toLight: string } }) {
  // null while rendering on the server and during hydration: the theme is only known in
  // the browser (set before paint by THEME_INIT_SCRIPT).
  const theme = useSyncExternalStore<Theme | null>(subscribe, currentTheme, () => null)

  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  const label = next === 'dark' ? labels.toDark : labels.toLight

  const toggle = () => {
    pageChoice = next
    applyTheme(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* private mode or blocked storage: the choice lasts for this page only */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-full p-2 text-emphasis hover:bg-surface-2"
      aria-label={label}
      title={label}
      data-theme-toggle
    >
      {theme === 'dark' ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-2"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-2"
        >
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
        </svg>
      )}
    </button>
  )
}
