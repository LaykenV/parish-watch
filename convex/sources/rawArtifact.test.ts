import { afterEach, expect, test, vi } from 'vitest'

import { downloadOfficialPdf } from './rawArtifact'

const PDF_URL = 'https://apps.lafayettela.gov/obcouncil/api/Document/2553291/'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('classifies a PDF body stream failure as retryable', async () => {
  let pullCount = 0
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (pullCount === 0) {
        pullCount += 1
        controller.enqueue(new TextEncoder().encode('%PDF-1.7'))
        return
      }
      controller.error(new DOMException('stream timed out', 'AbortError'))
    },
  })
  const response = new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/pdf' },
  })
  Object.defineProperty(response, 'url', { value: PDF_URL })
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => response),
  )

  const result = await downloadOfficialPdf(PDF_URL, ['apps.lafayettela.gov'])

  expect(result).toEqual({
    ok: false,
    errorClass: 'raw_artifact_request_failed',
    errorDetail: 'stream timed out',
    retryable: true,
  })
})
