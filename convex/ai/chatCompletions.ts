import { getServiceToken } from 'convex/server'

import { env } from '../_generated/server'
import type {
  AiRoute,
  AttemptRecord,
  ModelUsage,
  StructuredRequest,
} from './types'
import {
  GatewayUnavailableError,
  PermanentModelError,
  TransientModelError,
} from './types'

const AI_GATEWAY_BASE_URL = 'https://ai-gateway.convex.dev'
const OPENAI_BASE_URL = 'https://api.openai.com/v1'

const TRANSIENT_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

let mintGatewayToken: () => Promise<string> = async () =>
  await getServiceToken('ai-gateway')

export function overrideGatewayTokenMinterForTests(
  mint: () => Promise<string>,
): void {
  mintGatewayToken = mint
}

export function resetGatewayTokenMinterForTests(): void {
  mintGatewayToken = async () => await getServiceToken('ai-gateway')
}

type GatewayErrorBody = {
  error?: { message?: unknown; type?: unknown; code?: unknown }
}

type CompletionResponseBody = {
  id?: unknown
  model?: unknown
  choices?: Array<{
    finish_reason?: unknown
    message?: { content?: unknown; refusal?: unknown }
  }>
  usage?: {
    prompt_tokens?: unknown
    completion_tokens?: unknown
    total_tokens?: unknown
    prompt_tokens_details?: { cached_tokens?: unknown }
    completion_tokens_details?: { reasoning_tokens?: unknown }
  }
}

export type NormalizedCompletion = {
  requestId: string | null
  modelId: string | null
  finishReason: string | null
  content: string | null
  refusal: string | null
  usage: ModelUsage | null
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function optionalInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function parseRetryAfterMs(headerValue: string | null): number | null {
  if (!headerValue) {
    return null
  }
  const seconds = Number(headerValue)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(Math.round(seconds * 1000), 5 * 60 * 1000)
  }
  const atTime = Date.parse(headerValue)
  if (Number.isFinite(atTime)) {
    return Math.min(Math.max(atTime - Date.now(), 0), 5 * 60 * 1000)
  }
  return null
}

function errorDetail(body: GatewayErrorBody, status: number): string {
  const message = body.error?.message
  if (typeof message === 'string' && message.length > 0) {
    return message.slice(0, 500)
  }
  return `HTTP ${status}`
}

function gatewayErrorCode(body: GatewayErrorBody): string | null {
  return typeof body.error?.code === 'string' ? body.error.code : null
}

export function isDirectFallbackEnabled(): boolean {
  return (
    env.DIRECT_OPENAI_FALLBACK_ENABLED === 'true' &&
    typeof env.OPENAI_API_KEY === 'string' &&
    env.OPENAI_API_KEY.length > 0
  )
}

export function resolveDirectModelId(gatewayModelId: string): string {
  const prefix = 'openai/'
  return gatewayModelId.startsWith(prefix)
    ? gatewayModelId.slice(prefix.length)
    : gatewayModelId
}

function buildRequestBody(
  modelId: string,
  request: StructuredRequest,
): Record<string, unknown> {
  return {
    model: modelId,
    messages: request.messages,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: request.schemaName,
        strict: true,
        schema: request.jsonSchema,
      },
    },
    reasoning_effort: request.reasoningEffort,
    ...(request.maxCompletionTokens === undefined
      ? {}
      : { max_completion_tokens: request.maxCompletionTokens }),
    store: false,
  }
}

async function readErrorBody(response: Response): Promise<GatewayErrorBody> {
  try {
    const parsed: unknown = await response.json()
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

export async function fetchChatCompletion(
  route: AiRoute,
  modelId: string,
  request: StructuredRequest,
): Promise<{ ok: true; response: NormalizedCompletion } | { ok: false }> {
  let authorization: string
  let endpointUrl: string
  if (route === 'ai_gateway') {
    try {
      authorization = `Bearer ${await mintGatewayToken()}`
    } catch (error) {
      throw new GatewayUnavailableError(
        'ai_gateway_unavailable',
        `Could not mint an AI Gateway service token: ${
          error instanceof Error ? error.message : String(error)
        }`.slice(0, 500),
        null,
        null,
      )
    }
    endpointUrl = `${AI_GATEWAY_BASE_URL}/v1/chat/completions`
  } else {
    authorization = `Bearer ${env.OPENAI_API_KEY}`
    endpointUrl = `${OPENAI_BASE_URL}/chat/completions`
  }

  let response: Response
  try {
    response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildRequestBody(modelId, request)),
    })
  } catch (error) {
    if (route === 'ai_gateway') {
      throw new GatewayUnavailableError(
        'ai_gateway_unavailable',
        `AI Gateway request failed: ${
          error instanceof Error ? error.message : String(error)
        }`.slice(0, 500),
        null,
        null,
      )
    }
    throw new TransientModelError(
      'network_error',
      `OpenAI request failed: ${
        error instanceof Error ? error.message : String(error)
      }`.slice(0, 500),
      null,
      null,
    )
  }

  if (!response.ok) {
    const body = await readErrorBody(response)
    const detail = errorDetail(body, response.status)
    const retryAfterMs = parseRetryAfterMs(response.headers.get('Retry-After'))
    if (route === 'ai_gateway') {
      const code = gatewayErrorCode(body)
      if (response.status === 401 || response.status === 403) {
        throw new GatewayUnavailableError(
          response.status === 401 ? 'ai_gateway_auth' : 'ai_gateway_disabled',
          detail,
          response.status,
          retryAfterMs,
        )
      }
      if (
        (response.status === 502 || response.status === 503) &&
        code === 'upstream_error'
      ) {
        throw new GatewayUnavailableError(
          'ai_gateway_unavailable',
          detail,
          response.status,
          retryAfterMs,
        )
      }
      if (
        response.status === 400 &&
        code !== null &&
        code.startsWith('unsupported_')
      ) {
        throw new PermanentModelError(
          `ai_gateway_${code}`,
          detail,
          response.status,
        )
      }
    }
    if (TRANSIENT_HTTP_STATUSES.has(response.status)) {
      throw new TransientModelError(
        'model_http_transient',
        detail,
        response.status,
        retryAfterMs,
      )
    }
    throw new PermanentModelError('model_rejected', detail, response.status)
  }

  let parsed: unknown
  try {
    parsed = await response.json()
  } catch (error) {
    throw new PermanentModelError(
      'invalid_response_shape',
      `Response was not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`.slice(0, 500),
      response.status,
    )
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new PermanentModelError(
      'invalid_response_shape',
      'Response was not an object',
      response.status,
    )
  }
  const body = parsed as CompletionResponseBody
  const choice = Array.isArray(body.choices) ? body.choices[0] : undefined
  return {
    ok: true,
    response: {
      requestId: optionalString(body.id),
      modelId: optionalString(body.model),
      finishReason: optionalString(choice?.finish_reason),
      content:
        typeof choice?.message?.content === 'string' &&
        choice.message.content.length > 0
          ? choice.message.content
          : null,
      refusal: optionalString(choice?.message?.refusal),
      usage:
        body.usage != null
          ? {
              promptTokens: optionalInt(body.usage.prompt_tokens),
              completionTokens: optionalInt(body.usage.completion_tokens),
              totalTokens: optionalInt(body.usage.total_tokens),
              cachedTokens: optionalInt(
                body.usage.prompt_tokens_details?.cached_tokens,
              ),
              reasoningTokens: optionalInt(
                body.usage.completion_tokens_details?.reasoning_tokens,
              ),
            }
          : null,
    },
  }
}

export function attemptFromFailure(
  route: AiRoute,
  modelId: string,
  error: unknown,
  latencyMs: number,
): AttemptRecord {
  if (error instanceof GatewayUnavailableError) {
    return {
      route,
      modelId,
      status: 'gateway_unavailable',
      httpStatus: error.httpStatus,
      latencyMs,
      requestId: null,
      usage: null,
      retryAfterMs: error.retryAfterMs,
      errorClass: error.errorClass,
      errorDetail: error.message,
    }
  }
  if (error instanceof TransientModelError) {
    const status =
      error.errorClass === 'network_error' ? 'network_error' : 'http_transient'
    return {
      route,
      modelId,
      status,
      httpStatus: error.httpStatus,
      latencyMs,
      requestId: null,
      usage: null,
      retryAfterMs: error.retryAfterMs,
      errorClass: error.errorClass,
      errorDetail: error.message,
    }
  }
  if (error instanceof PermanentModelError) {
    return {
      route,
      modelId,
      status: 'http_permanent',
      httpStatus: error.httpStatus,
      latencyMs,
      requestId: null,
      usage: null,
      retryAfterMs: null,
      errorClass: error.errorClass,
      errorDetail: error.message,
    }
  }
  return {
    route,
    modelId,
    status: 'network_error',
    httpStatus: null,
    latencyMs,
    requestId: null,
    usage: null,
    retryAfterMs: null,
    errorClass: 'unexpected',
    errorDetail: error instanceof Error ? error.message : String(error),
  }
}
