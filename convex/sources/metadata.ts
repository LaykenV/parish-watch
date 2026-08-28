import { v } from 'convex/values'

export const firecrawlMetadataValue = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
  v.array(v.string()),
  v.array(v.number()),
  v.array(v.boolean()),
)

export type FirecrawlMetadataValue = typeof firecrawlMetadataValue.type

const MAX_METADATA_FIELDS = 128
const MAX_VALUE_LENGTH = 10_000
const MAX_ARRAY_LENGTH = 128

export function normalizeFirecrawlMetadata(
  metadata: Record<string, unknown>,
): Record<string, FirecrawlMetadataValue> {
  const normalized: Record<string, FirecrawlMetadataValue> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (Object.keys(normalized).length >= MAX_METADATA_FIELDS) {
      break
    }
    if (!isSafeRecordKey(key)) {
      continue
    }
    normalized[key] = normalizeMetadataValue(value)
  }
  return normalized
}

function isSafeRecordKey(key: string): boolean {
  return (
    key.length > 0 &&
    !key.startsWith('_') &&
    !key.startsWith('$') &&
    /^[\x20-\x7e]+$/.test(key)
  )
}

function normalizeMetadataValue(value: unknown): FirecrawlMetadataValue {
  if (typeof value === 'string') {
    return value.slice(0, MAX_VALUE_LENGTH)
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value
  }
  if (Array.isArray(value)) {
    const bounded = value.slice(0, MAX_ARRAY_LENGTH)
    if (bounded.every((entry): entry is string => typeof entry === 'string')) {
      return bounded.map((entry) => entry.slice(0, MAX_VALUE_LENGTH))
    }
    if (bounded.every((entry): entry is number => typeof entry === 'number')) {
      return bounded
    }
    if (
      bounded.every((entry): entry is boolean => typeof entry === 'boolean')
    ) {
      return bounded
    }
  }
  return safeJson(value).slice(0, MAX_VALUE_LENGTH)
}

function safeJson(value: unknown): string {
  if (
    value === undefined ||
    typeof value === 'function' ||
    typeof value === 'symbol'
  ) {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
