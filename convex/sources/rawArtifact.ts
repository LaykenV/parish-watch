import { canonicalizeUrl, isAllowedOfficialHost } from './domains'

const MAX_RAW_ARTIFACT_BYTES = 25 * 1024 * 1024
const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

export type RawArtifactDownload =
  | {
      ok: true
      bytes: Uint8Array<ArrayBuffer>
      contentType: string
    }
  | {
      ok: false
      errorClass: string
      errorDetail: string
      retryable: boolean
    }

export async function downloadOfficialPdf(
  url: string,
  officialDomains: string[],
): Promise<RawArtifactDownload> {
  let response: Response
  try {
    response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(60_000),
    })
  } catch (error) {
    return {
      ok: false,
      errorClass: 'raw_artifact_request_failed',
      errorDetail: error instanceof Error ? error.message : String(error),
      retryable: true,
    }
  }

  const finalUrl = canonicalizeUrl(response.url)
  if (!finalUrl || !isAllowedOfficialHost(finalUrl, officialDomains)) {
    return {
      ok: false,
      errorClass: 'raw_artifact_redirect_domain_not_allowed',
      errorDetail: `Raw artifact URL is outside the registered official domains: ${response.url}`,
      retryable: false,
    }
  }
  if (!response.ok) {
    return {
      ok: false,
      errorClass: 'raw_artifact_http_status',
      errorDetail: `Official raw artifact returned HTTP ${response.status}: ${finalUrl}`,
      retryable: TRANSIENT_STATUSES.has(response.status),
    }
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('application/pdf')) {
    return {
      ok: false,
      errorClass: 'raw_artifact_content_type',
      errorDetail: `Expected an official PDF but received ${contentType || 'no content type'}: ${finalUrl}`,
      retryable: false,
    }
  }

  const declaredLength = Number(response.headers.get('content-length'))
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_RAW_ARTIFACT_BYTES
  ) {
    return {
      ok: false,
      errorClass: 'raw_artifact_too_large',
      errorDetail: `Official PDF exceeds the ${MAX_RAW_ARTIFACT_BYTES} byte limit: ${finalUrl}`,
      retryable: false,
    }
  }

  if (!response.body) {
    return {
      ok: false,
      errorClass: 'empty_raw_artifact',
      errorDetail: `Official PDF had no response body: ${finalUrl}`,
      retryable: true,
    }
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let byteLength = 0
  try {
    let readResult = await reader.read()
    while (!readResult.done) {
      byteLength += readResult.value.byteLength
      if (byteLength > MAX_RAW_ARTIFACT_BYTES) {
        try {
          await reader.cancel()
        } catch {
          // The size classification still applies if cancellation races an error.
        }
        return {
          ok: false,
          errorClass: 'raw_artifact_too_large',
          errorDetail: `Official PDF exceeds the ${MAX_RAW_ARTIFACT_BYTES} byte limit: ${finalUrl}`,
          retryable: false,
        }
      }
      chunks.push(readResult.value)
      readResult = await reader.read()
    }
  } catch (error) {
    try {
      await reader.cancel()
    } catch {
      // The stream may already be errored or aborted.
    }
    return {
      ok: false,
      errorClass: 'raw_artifact_request_failed',
      errorDetail: error instanceof Error ? error.message : String(error),
      retryable: true,
    }
  }

  const bytes = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  if (bytes.byteLength === 0) {
    return {
      ok: false,
      errorClass: 'empty_raw_artifact',
      errorDetail: `Official PDF was empty: ${finalUrl}`,
      retryable: true,
    }
  }
  return { ok: true, bytes, contentType }
}
