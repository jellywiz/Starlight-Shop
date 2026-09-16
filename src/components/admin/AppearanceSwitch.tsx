'use client'

import { useTheme } from '@payloadcms/ui'
import React from 'react'

import { markThemeChoice, type ThemeChoice as Choice } from '@/lib/admin-theme'

const Sun = () => (
  <svg
    className="sl-appearance__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
  </svg>
)

const Moon = () => (
  <svg
    className="sl-appearance__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
  </svg>
)

const Auto = () => (
  <svg
    className="sl-appearance__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
  </svg>
)

/**
 * Light / Dark / Auto switch for the admin, shown in the menu. Payload keeps the choice
 * in a cookie (so the server renders the right theme next time) and "Auto" follows the
 * device setting.
 */
export function AppearanceSwitch() {
  const { autoMode, setTheme, theme } = useTheme()
  const current: Choice = autoMode ? 'auto' : theme

  const choose = (choice: Choice) => {
    // Payload's setter also accepts 'auto' (it clears the saved choice).
    setTheme(choice as 'dark' | 'light')
    markThemeChoice(choice)
  }

  const options: { value: Choice; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun /> },
    { value: 'dark', label: 'Dark', icon: <Moon /> },
    { value: 'auto', label: 'Auto', icon: <Auto /> },
  ]

  return (
    <div className="sl-appearance" role="group" aria-label="Appearance">
      <span className="sl-appearance__label">Appearance</span>
      <div className="sl-appearance__options">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="sl-appearance__option"
            aria-pressed={current === option.value}
            onClick={() => choose(option.value)}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
