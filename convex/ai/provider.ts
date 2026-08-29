import { parse, ValidationError } from 'convex-helpers/validators'
import type { Validator } from 'convex/values'

import { env } from '../_generated/server'
import {
  attemptFromFailure,
  fetchChatCompletion,
  isDirectFallbackEnabled,
  resolveDirectModelId,
} from './chatCompletions'
import type {
  AttemptRecord,
  ModelRole,
  ModelUsage,
  StructuredFailure,
  StructuredOutcome,
  StructuredRequest,
  StructuredSuccess,
} from './types'
import { GatewayUnavailableError, PermanentModelError } from './types'

const EMPTY_USAGE: ModelUsage = {
  promptTokens: null,
  completionTokens: null,
  totalTokens: null,
  cachedTokens: null,
  reasoningTokens: null,
}

function modelIdForRole(role: ModelRole): string {
  const modelId =
    role === 'MODEL_STRONG' ? env.MODEL_STRONG_ID : env.MODEL_FAST_ID
  if (typeof modelId !== 'string' || modelId.length === 0) {
    throw new PermanentModelError(
      'model_role_not_configured',
      `No model ID is configured for role ${role}`,
    )
  }
  return modelId
}

function safeDetail(value: string): string {
  return value.slice(0, 500)
}

type RouteResult =
  | { kind: 'success'; success: StructuredSuccess }
  | { kind: 'content_failure'; failure: StructuredFailure }

async function runRoute(
  route: 'ai_gateway' | 'direct_openai',
  gatewayModelId: string,
  request: StructuredRequest,
  responseValidator: Validator<unknown, 'required', any>,
  contractCheck: (parsed: unknown) => string | null,
  recordAttempt: (attempt: AttemptRecord) => Promise<void>,
): Promise<RouteResult> {
  const modelId =
    route === 'direct_openai'
      ? resolveDirectModelId(gatewayModelId)
      : gatewayModelId
  const startedAt = Date.now()

  let normalized
  try {
    const fetched = await fetchChatCompletion(route, modelId, request)
    if (!fetched.ok) {
      throw new PermanentModelError(
        'invalid_response_shape',
        'The chat completion response was missing',
      )
    }
    normalized = fetched.response
  } catch (error) {
    const attempt = attemptFromFailure(
      route,
      modelId,
      error,
      Date.now() - startedAt,
    )
    await recordAttempt(attempt)
    throw error
  }
  const latencyMs = Date.now() - startedAt

  const buildFailure = (
    failureKind: StructuredFailure['kind'],
    detail: string,
    content: string | null,
  ): StructuredFailure => ({
    kind: failureKind,
    route,
    modelId: normalized.modelId ?? modelId,
    requestId: normalized.requestId,
    finishReason: normalized.finishReason,
    content,
    detail,
    usage: normalized.usage,
    latencyMs,
  })

  const recordContentFailure = async (
    failureKind: StructuredFailure['kind'],
    detail: string,
    content: string | null,
  ): Promise<RouteResult> => {
    await recordAttempt({
      route,
      modelId: normalized.modelId ?? modelId,
      status: failureKind,
      httpStatus: 200,
      latencyMs,
      requestId: normalized.requestId,
      usage: normalized.usage,
      retryAfterMs: null,
      errorClass: failureKind,
      errorDetail: safeDetail(detail),
    })
    return {
      kind: 'content_failure',
      failure: buildFailure(failureKind, detail, content),
    }
  }

  if (normalized.refusal !== null) {
    return await recordContentFailure(
      'refusal',
      normalized.refusal,
      normalized.content,
    )
  }
  if (normalized.finishReason === 'length') {
    return await recordContentFailure(
      'response_truncated',
      'The model stopped at the completion token limit',
      normalized.content,
    )
  }
  if (normalized.finishReason === 'content_filter') {
    return await recordContentFailure(
      'content_filtered',
      'The model response was stopped by a content filter',
      normalized.content,
    )
  }
  if (normalized.content === null) {
    return await recordContentFailure(
      'missing_content',
      'The model returned no content',
      null,
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(normalized.content)
  } catch (error) {
    return await recordContentFailure(
      'malformed_json',
      `Response was not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
      normalized.content,
    )
  }

  try {
    parse(responseValidator, parsed)
  } catch (error) {
    return await recordContentFailure(
      'schema_invalid',
      `Response did not match the requested schema: ${
        error instanceof ValidationError ? error.message : String(error)
      }`,
      normalized.content,
    )
  }

  const contractError = contractCheck(parsed)
  if (contractError !== null) {
    return await recordContentFailure(
      'schema_invalid',
      contractError,
      normalized.content,
    )
  }

  const success: StructuredSuccess = {
    kind: 'success',
    route,
    modelId: normalized.modelId ?? modelId,
    requestId: normalized.requestId,
    finishReason: normalized.finishReason,
    content: normalized.content,
    parsed,
    usage: normalized.usage ?? EMPTY_USAGE,
    latencyMs,
  }
  await recordAttempt({
    route,
    modelId: success.modelId,
    status: 'success',
    httpStatus: 200,
    latencyMs,
    requestId: success.requestId,
    usage: success.usage,
    retryAfterMs: null,
    errorClass: null,
    errorDetail: null,
  })
  return { kind: 'success', success }
}

export type CompleteStructuredOptions = {
  request: StructuredRequest
  responseValidator: Validator<unknown, 'required', any>
  contractCheck: (parsed: unknown) => string | null
  onAttempt?: (attempt: AttemptRecord) => Promise<void>
}

export async function completeStructured(
  options: CompleteStructuredOptions,
): Promise<StructuredOutcome> {
  const { request, responseValidator, contractCheck, onAttempt } = options
  const gatewayModelId = modelIdForRole(request.role)
  const attempts: AttemptRecord[] = []
  const recordAttempt = async (attempt: AttemptRecord) => {
    attempts.push(attempt)
    if (onAttempt) {
      await onAttempt(attempt)
    }
  }

  let gatewayResult: RouteResult
  try {
    gatewayResult = await runRoute(
      'ai_gateway',
      gatewayModelId,
      request,
      responseValidator,
      contractCheck,
      recordAttempt,
    )
  } catch (error) {
    if (!(error instanceof GatewayUnavailableError)) {
      throw error
    }
    if (!isDirectFallbackEnabled()) {
      throw error
    }
    const directResult = await runRoute(
      'direct_openai',
      gatewayModelId,
      request,
      responseValidator,
      contractCheck,
      recordAttempt,
    )
    if (directResult.kind === 'success') {
      return { outcome: 'success', result: directResult.success, attempts }
    }
    return { outcome: 'failed', failure: directResult.failure, attempts }
  }

  if (gatewayResult.kind === 'success') {
    return { outcome: 'success', result: gatewayResult.success, attempts }
  }
  return {
    outcome: 'failed',
    failure: gatewayResult.failure,
    attempts,
  }
}
