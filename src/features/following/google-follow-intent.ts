import type { DeliveryFrequency, FollowKind, FollowTarget } from './contracts'

export type GoogleFollowTargetKind =
  'issue' | 'topic' | 'government_body' | 'place'

export type GoogleFollowIntent = {
  cadence: DeliveryFrequency
  targetKey: string
  targetKind: GoogleFollowTargetKind
}

const INTENT_CADENCE = 'followCadence'
const INTENT_KEY = 'followKey'
const INTENT_KIND = 'followKind'

const targetKinds: Record<FollowKind, GoogleFollowTargetKind> = {
  Issue: 'issue',
  Topic: 'topic',
  'Government body': 'government_body',
  Place: 'place',
}

export function followTargetKind(kind: FollowKind): GoogleFollowTargetKind {
  return targetKinds[kind]
}

export function googleFollowIntentUrl(
  href: string,
  target: FollowTarget,
  cadence: DeliveryFrequency,
): string {
  const url = new URL(href)
  url.searchParams.set(INTENT_KIND, followTargetKind(target.kind))
  url.searchParams.set(INTENT_KEY, target.key)
  url.searchParams.set(INTENT_CADENCE, cadence)
  return url.href
}

export function readGoogleFollowIntent(
  href: string,
): GoogleFollowIntent | null {
  const url = parseUrl(href)
  if (!url) return null
  const targetKind = url.searchParams.get(INTENT_KIND)
  const targetKey = url.searchParams.get(INTENT_KEY)
  const cadence = url.searchParams.get(INTENT_CADENCE)
  if (
    !isTargetKind(targetKind) ||
    !targetKey ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(targetKey) ||
    !isCadence(cadence)
  ) {
    return null
  }
  return { cadence, targetKey, targetKind }
}

export function clearGoogleFollowIntent(href: string): string {
  const url = new URL(href)
  url.searchParams.delete(INTENT_KIND)
  url.searchParams.delete(INTENT_KEY)
  url.searchParams.delete(INTENT_CADENCE)
  return `${url.pathname}${url.search}${url.hash}`
}

function isTargetKind(value: string | null): value is GoogleFollowTargetKind {
  return (
    value === 'issue' ||
    value === 'topic' ||
    value === 'government_body' ||
    value === 'place'
  )
}

function isCadence(value: string | null): value is DeliveryFrequency {
  return value === 'immediate' || value === 'weekly' || value === 'both'
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}
