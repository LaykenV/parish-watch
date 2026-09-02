import type { Infer } from 'convex/values'
import { v } from 'convex/values'

export const followOwnerKind = v.union(v.literal('google'), v.literal('email'))

export const followTargetKind = v.union(
  v.literal('issue'),
  v.literal('topic'),
  v.literal('government_body'),
  v.literal('place'),
)

export const activeDeliveryCadence = v.union(
  v.literal('immediate'),
  v.literal('weekly'),
  v.literal('both'),
)

export const deliveryCadence = v.union(
  activeDeliveryCadence,
  v.literal('muted'),
)

export const emailSubscriberState = v.union(
  v.literal('pending'),
  v.literal('verified'),
  v.literal('unsubscribed'),
)

export const emailTokenKind = v.union(
  v.literal('management'),
  v.literal('unsubscribe'),
)

export const verificationPurpose = v.literal('create_follow')

export const followView = v.object({
  id: v.string(),
  targetKind: followTargetKind,
  targetKey: v.string(),
  title: v.string(),
  detail: v.string(),
  cadence: deliveryCadence,
  resumeCadence: activeDeliveryCadence,
  createdAt: v.number(),
})

export type ActiveDeliveryCadence = Infer<typeof activeDeliveryCadence>
export type DeliveryCadence = Infer<typeof deliveryCadence>
export type FollowTargetKind = Infer<typeof followTargetKind>

export const VERIFICATION_CODE_LENGTH = 6
export const VERIFICATION_MAX_ATTEMPTS = 3
export const VERIFICATION_TTL_MS = 10 * 60 * 1000
export const MANAGEMENT_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const MAX_FOLLOWS_PER_OWNER = 50
