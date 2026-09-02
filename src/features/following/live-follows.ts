import { useMutation, useQuery } from 'convex/react'
import { useMemo } from 'react'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import type { DeliveryFrequency, FollowKind, FollowedTarget } from './contracts'

export type LiveFollow = {
  cadence: DeliveryFrequency | 'muted'
  createdAt: number
  detail: string
  id: string
  resumeCadence: DeliveryFrequency
  targetKey: string
  targetKind: 'issue' | 'topic' | 'government_body' | 'place'
  title: string
}

const followKinds: Record<LiveFollow['targetKind'], FollowKind> = {
  issue: 'Issue',
  topic: 'Topic',
  government_body: 'Government body',
  place: 'Place',
}

export function useGoogleFollows(enabled: boolean) {
  const follows = useQuery(
    api.follows.enrollment.currentGoogleFollows,
    enabled ? {} : 'skip',
  )
  return useMemo(() => follows?.map(toFollowedTarget), [follows])
}

export function useGoogleFollowMutations() {
  const update = useMutation(api.follows.enrollment.updateGoogleFollow)
  const remove = useMutation(api.follows.enrollment.removeGoogleFollow)

  return {
    remove: (followId: string) =>
      remove({ followId: followId as Id<'follows'> }),
    update: (followId: string, cadence: DeliveryFrequency | 'muted') =>
      update({ followId: followId as Id<'follows'>, cadence }),
  }
}

export function useNotificationSettings(enabled: boolean) {
  return useQuery(
    api.follows.enrollment.currentNotificationSettings,
    enabled ? {} : 'skip',
  )
}

export function useNotificationSettingsMutation() {
  const update = useMutation(
    api.follows.enrollment.updateNotificationDefault,
  )
  return (cadence: DeliveryFrequency) => update({ cadence })
}

export function toFollowedTarget(follow: LiveFollow): FollowedTarget {
  const muted = follow.cadence === 'muted'
  return {
    id: follow.id,
    key: follow.targetKey,
    href:
      follow.targetKind === 'issue' ? `/issues/${follow.targetKey}` : undefined,
    kind: followKinds[follow.targetKind],
    title: follow.title,
    detail: follow.detail,
    destination: 'Google account',
    frequency: follow.resumeCadence,
    latestChange: `Follow created ${new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Chicago',
    }).format(follow.createdAt)}`,
    status: muted ? 'Muted' : 'Following',
  }
}
