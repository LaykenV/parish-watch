import { useSyncExternalStore } from 'react'

import type { AreaSlug } from './contracts'

const STORAGE_KEY = 'public-parish.area.v1'
const SLUGS: readonly AreaSlug[] = [
  'lafayette-parish',
  'east-baton-rouge-parish',
  'rapides-parish',
]

function readStoredArea(): AreaSlug | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value && (SLUGS as readonly string[]).includes(value)
      ? (value as AreaSlug)
      : null
  } catch {
    return null
  }
}

let currentArea: AreaSlug | null = readStoredArea()
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function getArea(): AreaSlug | null {
  return currentArea
}

export function setArea(slug: AreaSlug | null) {
  currentArea = slug
  try {
    if (slug) {
      window.localStorage.setItem(STORAGE_KEY, slug)
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Storage can be unavailable in private modes. The session keeps the area.
  }
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useArea(): AreaSlug | null {
  return useSyncExternalStore(subscribe, getArea, () => null)
}
