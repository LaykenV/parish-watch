import { BROWSER_CIVIC_EVENTS } from './civicContracts'
import type { BrowserCivicEvent } from './civicContracts'
import { isRateLimitError } from '@convex-dev/rate-limiter'

import { internal } from '../_generated/api'
import { httpAction } from '../_generated/server'
import type { AnalyticsAreaSlug } from './contracts'

const ALLOWED_ORIGINS = new Set([
  'https://www.publicparish.com',
  'https://befitting-flamingo-587.convex.site',
])
const MAX_BODY_BYTES = 512

type AnalyticsPayload = { kind: BrowserCivicEvent; visitorKeyHash: string; eventKey: string }
  | {
      kind: 'app_visit'
      visitorKeyHash: string
      eventKey: string
    }
  | {
      kind: 'area_selected'
      visitorKeyHash: string
      eventKey: string
      areaSlug: AnalyticsAreaSlug
    }

export const recordProductAnalytics = httpAction(async (ctx, request) => {
  const origin = request.headers.get('origin')
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return response(403)

  const declaredLength = Number(request.headers.get('content-length') ?? '0')
  if (declaredLength > MAX_BODY_BYTES) return response(413)

  let payload: AnalyticsPayload | null = null
  try {
    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return response(413)
    }
    payload = parsePayload(JSON.parse(rawBody))
  } catch {
    return response(400)
  }
  if (!payload) return response(400)

  try {
    if (payload.kind === 'app_visit') {
      await ctx.runMutation(internal.analytics.events.recordVisit, {
        visitorKeyHash: payload.visitorKeyHash,
        eventKey: payload.eventKey,
      })
    } else if (payload.kind === 'area_selected') {
      await ctx.runMutation(internal.analytics.events.recordAreaSelection, {
        visitorKeyHash: payload.visitorKeyHash,
        eventKey: payload.eventKey,
        areaSlug: payload.areaSlug,
      })
    }
    else await ctx.runMutation(internal.analytics.civic.recordBrowserEvent, payload)
    return response(204)
  } catch (error) {
    if (isRateLimitError(error)) {
      return response(429, {
        'retry-after': String(
          Math.max(1, Math.ceil(error.data.retryAfter / 1000)),
        ),
      })
    }
    return response(500)
  }
})

function parsePayload(value: unknown): AnalyticsPayload | null {
  if (!isRecord(value)) return null
  if (!isVisitorKeyHash(value.visitorKeyHash) || !isEventKey(value.eventKey)) {
    return null
  }
  if (
    value.kind === 'app_visit' &&
    hasOnlyKeys(value, ['eventKey', 'kind', 'visitorKeyHash'])
  ) {
    return {
      kind: value.kind,
      visitorKeyHash: value.visitorKeyHash,
      eventKey: value.eventKey,
    }
  }
  if (
    value.kind === 'area_selected' &&
    isAreaSlug(value.areaSlug) &&
    hasOnlyKeys(value, ['areaSlug', 'eventKey', 'kind', 'visitorKeyHash'])
  ) {
    return {
      kind: value.kind,
      visitorKeyHash: value.visitorKeyHash,
      eventKey: value.eventKey,
      areaSlug: value.areaSlug,
    }
  }
  if (typeof value.kind === 'string' && BROWSER_CIVIC_EVENTS.includes(value.kind) && hasOnlyKeys(value, ['eventKey', 'kind', 'visitorKeyHash'])) return { kind: value.kind as BrowserCivicEvent, eventKey: value.eventKey, visitorKeyHash: value.visitorKeyHash }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]) {
  const keys = Object.keys(value).sort()
  return (
    keys.length === allowed.length && keys.every((key, i) => key === allowed[i])
  )
}

function isVisitorKeyHash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
}

function isEventKey(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9-]{16,80}$/.test(value)
}

function isAreaSlug(value: unknown): value is AnalyticsAreaSlug {
  return (
    value === 'lafayette-parish' ||
    value === 'east-baton-rouge-parish' ||
    value === 'rapides-parish'
  )
}

function response(status: number, headers?: Record<string, string>) {
  return new Response(null, {
    status,
    headers: {
      'cache-control': 'no-store',
      ...headers,
    },
  })
}
