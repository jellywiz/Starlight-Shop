/**
 * Admin light/dark theme plumbing shared by the server layout and the Appearance switch.
 * Safe to import from client components (no server-only imports here).
 */

/** Payload keeps the admin's chosen theme in this cookie; no cookie means "follow the device". */
export const THEME_COOKIE = 'payload-theme'

/**
 * Set on <html> by the admin layout while no theme has been chosen. Payload can then only
 * guess the theme on the server and corrects it after hydration, so custom.scss lets the
 * page follow the device setting in the meantime (the admin renders entirely in the
 * browser: until its JavaScript runs the page is blank, and a dark phone must not flash a
 * light blank page first).
 */
export const THEME_AUTO_ATTRIBUTE = 'data-theme-auto'

export type ThemeChoice = 'auto' | 'dark' | 'light'

/** Keeps the html attribute in step with a choice made in the browser (no reload). */
export function markThemeChoice(choice: ThemeChoice) {
  if (choice === 'auto') {
    document.documentElement.setAttribute(THEME_AUTO_ATTRIBUTE, '')
  } else {
    document.documentElement.removeAttribute(THEME_AUTO_ATTRIBUTE)
  }
}
