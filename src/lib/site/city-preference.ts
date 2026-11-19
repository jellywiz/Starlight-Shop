'use client'

/**
 * The delivery city a visitor last picked, remembered in this browser only (localStorage;
 * no cookie, nothing sent to the server), so every product page can show "Delivery to
 * <city>: <fee>" without asking again. Only a city id is stored; the name and fee always
 * come from the current, active city list.
 */
export const CITY_STORAGE_KEY = 'sl-city'
const CHANGE_EVENT = 'sl-city-change'

export function readStoredCity(): number | null {
  try {
    const value = localStorage.getItem(CITY_STORAGE_KEY)
    return value && /^\d{1,9}$/.test(value) ? Number.parseInt(value, 10) : null
  } catch {
    return null
  }
}

export function storeCity(id: number | null): void {
  try {
    if (id === null) {
      localStorage.removeItem(CITY_STORAGE_KEY)
    } else {
      localStorage.setItem(CITY_STORAGE_KEY, String(id))
    }
  } catch {
    // Storage blocked (private mode, settings): the choice still works on this page.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** For useSyncExternalStore: other tabs (storage event) and this tab (custom event). */
export function subscribeStoredCity(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === CITY_STORAGE_KEY || event.key === null) {
      onChange()
    }
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}
