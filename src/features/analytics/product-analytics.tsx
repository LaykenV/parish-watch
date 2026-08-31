import { useCallback, useEffect } from 'react'

import type { AreaSlug } from '../discovery/contracts'

const VISITOR_STORAGE_KEY = 'public-parish.analytics.visitor.v1'
export const ANALYTICS_OPTOUT_STORAGE_KEY = 'public-parish.analytics.optout.v1'

const PRODUCTION_HOSTS = new Set([
  'www.publicparish.com',
  'befitting-flamingo-587.convex.site',
])

let volatileVisitorId: string | null = null

type AnalyticsRuntime = {
  automated: boolean
  hostname: string
  optedOut: boolean
  production: boolean
}

export function isAnalyticsRuntimeAllowed(runtime: AnalyticsRuntime): boolean {
  return (
    runtime.production &&
    PRODUCTION_HOSTS.has(runtime.hostname) &&
    !runtime.automated &&
    !runtime.optedOut
  )
}

export function ProductAnalyticsTracker() {
  useEffect(() => {
    void sendAnalytics({ kind: 'app_visit' })
  }, [])

  return null
}

export function useRecordAreaSelection() {
  return useCallback((areaSlug: AreaSlug) => {
    void sendAnalytics({ kind: 'area_selected', areaSlug })
  }, [])
}

async function sendAnalytics(
  event: { kind: 'app_visit' } | { kind: 'area_selected'; areaSlug: AreaSlug },
) {
  try {
    if (!canUseAnalytics()) return
    const visitorKeyHash = await getVisitorKeyHash()
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...event,
        visitorKeyHash,
        eventKey: crypto.randomUUID(),
      }),
      credentials: 'omit',
      keepalive: true,
      referrerPolicy: 'no-referrer',
    })
  } catch {
    // Product telemetry never blocks a resident action.
  }
}

function canUseAnalytics(): boolean {
  if (typeof window === 'undefined') return false
  let optedOut = false
  try {
    optedOut =
      window.localStorage.getItem(ANALYTICS_OPTOUT_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
  return isAnalyticsRuntimeAllowed({
    automated: window.navigator.webdriver,
    hostname: window.location.hostname,
    optedOut,
    production: import.meta.env.PROD,
  })
}

async function getVisitorKeyHash(): Promise<string> {
  let visitorId = volatileVisitorId
  try {
    const stored = window.localStorage.getItem(VISITOR_STORAGE_KEY)
    if (stored) {
      visitorId = stored
    } else {
      visitorId = crypto.randomUUID()
      window.localStorage.setItem(VISITOR_STORAGE_KEY, visitorId)
    }
  } catch {
    visitorId ??= crypto.randomUUID()
  }
  volatileVisitorId = visitorId

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(visitorId),
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}
