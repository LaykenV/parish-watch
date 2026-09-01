import { v } from 'convex/values'

export const modelRoles = v.union(
  v.literal('MODEL_STRONG'),
  v.literal('MODEL_FAST'),
)

export type ModelRole = typeof modelRoles.type

export const aiRoutes = v.union(
  v.literal('ai_gateway'),
  v.literal('direct_openai'),
)

export type AiRoute = typeof aiRoutes.type

export type ChatMessage = {
  role: 'system' | 'user'
  content: string
}

export type StructuredRequest = {
  role: ModelRole
  messages: ChatMessage[]
  schemaName: string
  jsonSchema: Record<string, unknown>
  reasoningEffort: 'high' | 'low'
  maxCompletionTokens?: number
}

export type ModelUsage = {
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  cachedTokens: number | null
  reasoningTokens: number | null
}

export type StructuredSuccess = {
  kind: 'success'
  route: AiRoute
  modelId: string
  requestId: string | null
  finishReason: string | null
  content: string
  parsed: unknown
  usage: ModelUsage
  latencyMs: number
}

export type StructuredFailure = {
  kind:
    | 'refusal'
    | 'response_truncated'
    | 'content_filtered'
    | 'missing_content'
    | 'malformed_json'
    | 'schema_invalid'
  route: AiRoute
  modelId: string | null
  requestId: string | null
  finishReason: string | null
  content: string | null
  detail: string
  usage: ModelUsage | null
  latencyMs: number
}

export type StructuredOutcome =
  | { outcome: 'success'; result: StructuredSuccess; attempts: AttemptRecord[] }
  | { outcome: 'failed'; failure: StructuredFailure; attempts: AttemptRecord[] }

export type AttemptRecord = {
  route: AiRoute
  modelId: string
  status: string
  httpStatus: number | null
  latencyMs: number
  requestId: string | null
  usage: ModelUsage | null
  retryAfterMs: number | null
  errorClass: string | null
  errorDetail: string | null
}

export class TransientModelError extends Error {
  readonly errorClass: string
  readonly httpStatus: number | null
  readonly retryAfterMs: number | null

  constructor(
    errorClass: string,
    message: string,
    httpStatus: number | null,
    retryAfterMs: number | null,
  ) {
    super(message)
    this.name = 'TransientModelError'
    this.errorClass = errorClass
    this.httpStatus = httpStatus
    this.retryAfterMs = retryAfterMs
  }
}

export class PermanentModelError extends Error {
  readonly errorClass: string
  readonly httpStatus: number | null

  constructor(
    errorClass: string,
    message: string,
    httpStatus: number | null = null,
  ) {
    super(message)
    this.name = 'PermanentModelError'
    this.errorClass = errorClass
    this.httpStatus = httpStatus
  }
}

export class GatewayUnavailableError extends Error {
  readonly errorClass: string
  readonly httpStatus: number | null
  readonly retryAfterMs: number | null

  constructor(
    errorClass: string,
    message: string,
    httpStatus: number | null,
    retryAfterMs: number | null,
  ) {
    super(message)
    this.name = 'GatewayUnavailableError'
    this.errorClass = errorClass
    this.httpStatus = httpStatus
    this.retryAfterMs = retryAfterMs
  }
}

export const MODEL_COST_USD_PER_1M_TOKENS: Record<
  ModelRole,
  { input: number; cachedInput: number; output: number }
> = {
  MODEL_STRONG: { input: 2.0, cachedInput: 0.2, output: 12.0 },
  MODEL_FAST: { input: 0.2, cachedInput: 0.02, output: 1.2 },
}

export function estimateCostUsd(
  role: ModelRole,
  usage: ModelUsage,
): number | null {
  const rates = MODEL_COST_USD_PER_1M_TOKENS[role]
  if (usage.promptTokens === null && usage.completionTokens === null) {
    return null
  }
  const prompt = usage.promptTokens ?? 0
  const completion = usage.completionTokens ?? 0
  const cached = Math.min(usage.cachedTokens ?? 0, prompt)
  const fresh = prompt - cached
  const cost =
    (fresh / 1_000_000) * rates.input +
    (cached / 1_000_000) * rates.cachedInput +
    (completion / 1_000_000) * rates.output
  return Math.round(cost * 1_000_000) / 1_000_000
}
