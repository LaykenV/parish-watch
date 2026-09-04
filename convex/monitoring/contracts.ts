import { v } from 'convex/values'

import { sourceKindUnion } from '../pipeline/state'

export const MONITOR_VERSION = 'monitor-v1'
export const DAY_MS = 86_400_000
export const INVENTORY_CHARS = 45_000
export const MAX_DOCUMENT_CHARS = 450_000
export const MAX_TARGETS_PER_CHUNK = 100
export const monitorState = v.union(
  v.literal('running'), v.literal('completed'), v.literal('incomplete'),
  v.literal('stopped'), v.literal('failed'),
)
export const targetState = v.union(
  v.literal('pending'), v.literal('running'), v.literal('published'),
  v.literal('withheld'), v.literal('failed'), v.literal('not_found'),
)
export const inventoryTarget = v.object({
  printedId: v.union(v.string(), v.null()),
  title: v.string(),
  excerpt: v.string(),
})
export const inventoryResult = v.object({
  complete: v.boolean(),
  bodyName: v.string(),
  sourceKind: sourceKindUnion,
  meetingDate: v.union(v.string(), v.null()),
  dateExcerpt: v.union(v.string(), v.null()),
  targets: v.array(inventoryTarget),
})
export type InventoryResult = typeof inventoryResult.type

export function inventoryContract(value: InventoryResult, source: string, bodyName: string): string | null {
  if (!value.complete) return 'Document inventory is incomplete.'
  if (value.bodyName !== bodyName) return 'Inventory changed the government body.'
  if (value.targets.length > MAX_TARGETS_PER_CHUNK) return 'Inventory target overflow.'
  if (value.targets.length && (!value.meetingDate || !/^\d{4}-\d{2}-\d{2}$/.test(value.meetingDate) || !Number.isFinite(Date.parse(value.meetingDate)) || new Date(value.meetingDate).toISOString().slice(0, 10) !== value.meetingDate)) {
    return 'Decision inventory needs a source-backed date.'
  }
  const normalized = source.replace(/\s+/g, ' ')
  if (value.meetingDate && (!value.dateExcerpt || !normalized.includes(value.dateExcerpt.replace(/\s+/g, ' ')))) return 'Inventory date citation does not resolve.'
  const identities = new Set<string>()
  for (const target of value.targets) {
    if (!target.title.trim() || target.title.length > 300 || target.excerpt.length > 1_000 || !target.excerpt.trim() || !normalized.includes(target.excerpt.replace(/\s+/g, ' '))) return 'Inventory target citation does not resolve.'
    if (target.printedId !== null && (!target.printedId.trim() || target.printedId.length > 100 || /[\r\n]/.test(target.printedId) || !target.excerpt.includes(target.printedId))) return 'Printed identifier is not in the cited item.'
    const identity = target.printedId ?? target.title
    if (identities.has(identity)) return 'Inventory contains ambiguous duplicate targets.'
    identities.add(identity)
  }
  return null
}

export const inventoryJsonSchema = {
  type: 'object', additionalProperties: false,
  required: ['complete', 'bodyName', 'sourceKind', 'meetingDate', 'dateExcerpt', 'targets'],
  properties: {
    complete: { type: 'boolean' }, bodyName: { type: 'string' },
    sourceKind: { type: 'string', enum: ['agenda', 'minutes', 'ordinance', 'resolution', 'notice', 'calendar', 'packet', 'planning_case', 'other'] },
    meetingDate: { type: ['string', 'null'] }, dateExcerpt: { type: ['string', 'null'] },
    targets: { type: 'array', items: { type: 'object', additionalProperties: false,
      required: ['printedId', 'title', 'excerpt'], properties: {
        printedId: { type: ['string', 'null'] }, title: { type: 'string' }, excerpt: { type: 'string' },
      } } },
  },
}
