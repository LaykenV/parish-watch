import { expect, test } from 'vitest'

import {
  canonicalizeRootUrl,
  classifyHost,
  evaluateRootChain,
  isApprovedRootUrl,
} from './rootGate'
import type { RedirectWalk } from './redirectWalk'
import { listRootManifests, resolveRootManifest } from './roots'
import type { CoverageRootManifest } from './roots'

const MANIFEST: CoverageRootManifest = {
  bodyKey: 'test-body',
  version: 'v1',
  jurisdictionSlug: 'test-parish',
  jurisdictionName: 'Test Parish',
  bodyName: 'Test Council',
  approvedRootUrl: 'https://www.testparish.gov/council/',
  identityEvidenceUrls: ['https://www.testparish.gov/council/'],
  allowedHosts: ['www.testparish.gov'],
  allowedSubdomainSuffixes: ['apps.testparish.gov'],
  documentHosts: [
    { host: 'files.civiccdn.com', pathPrefixes: ['/testparish/'] },
  ],
  checkedAt: '2026-09-03',
}

function finalResponse(
  url: string,
  status: number,
  contentType?: string,
): RedirectWalk {
  return {
    hops: [{ requestedUrl: url, status, contentType }],
    stopReason: 'final_response',
  }
}

test('canonicalization requires plain HTTPS without embedded credentials', () => {
  expect(canonicalizeRootUrl(' https://www.testparish.gov/council/#top ')).toBe(
    'https://www.testparish.gov/council/',
  )
  expect(canonicalizeRootUrl('http://www.testparish.gov/council/')).toBeNull()
  expect(
    canonicalizeRootUrl('https://www.testparish.gov@evil.example/council/'),
  ).toBeNull()
  expect(canonicalizeRootUrl('not-a-url')).toBeNull()
  expect(canonicalizeRootUrl('')).toBeNull()
})

test('host classification rejects lookalikes and matches on label boundaries', () => {
  expect(classifyHost(MANIFEST, 'https://www.testparish.gov/x')).toBe(
    'approved',
  )
  expect(classifyHost(MANIFEST, 'https://permits.apps.testparish.gov/x')).toBe(
    'approved',
  )
  expect(classifyHost(MANIFEST, 'https://evil-testparish.gov/x')).toBe(
    'unapproved',
  )
  expect(classifyHost(MANIFEST, 'https://www.testparish.gov.evil.com/x')).toBe(
    'unapproved',
  )
  // A unicode lookalike normalizes to punycode and never matches the manifest.
  expect(classifyHost(MANIFEST, 'https://www.testpärish.gov/x')).toBe(
    'unapproved',
  )
  // The bare apex is not approved when only the www host is listed.
  expect(classifyHost(MANIFEST, 'https://testparish.gov/x')).toBe('unapproved')
})

test('a shared document host is quarantined and tenant paths are enforced', () => {
  expect(
    classifyHost(MANIFEST, 'https://files.civiccdn.com/testparish/agenda.pdf'),
  ).toBe('document_host')
  expect(
    classifyHost(MANIFEST, 'https://files.civiccdn.com/othercity/agenda.pdf'),
  ).toBe('unapproved')
  expect(
    isApprovedRootUrl(
      MANIFEST,
      'https://files.civiccdn.com/testparish/agenda.pdf',
    ),
  ).toBe(false)
})

test('a successful page on an approved host passes the gate', () => {
  const evaluation = evaluateRootChain(
    MANIFEST,
    finalResponse(
      'https://www.testparish.gov/council/',
      200,
      'text/html; charset=utf-8',
    ),
  )
  expect(evaluation.outcome).toBe('passed')
  expect(evaluation.finalUrl).toBe('https://www.testparish.gov/council/')
  expect(evaluation.findings).toEqual([])
})

test('a redirect off the approved hosts fails terminally', () => {
  const evaluation = evaluateRootChain(MANIFEST, {
    hops: [
      {
        requestedUrl: 'https://www.testparish.gov/council/',
        status: 302,
        locationUrl: 'https://evil.example/council/',
      },
    ],
    stopReason: 'blocked_host',
    blockedUrl: 'https://evil.example/council/',
  })
  expect(evaluation.outcome).toBe('failed_terminal')
  expect(evaluation.findings.map((finding) => finding.code)).toEqual([
    'root_host_not_approved',
  ])
})

test('a redirect into the document host reports quarantine, not approval', () => {
  const evaluation = evaluateRootChain(MANIFEST, {
    hops: [
      {
        requestedUrl: 'https://www.testparish.gov/council/',
        status: 301,
        locationUrl: 'https://files.civiccdn.com/testparish/council.pdf',
      },
    ],
    stopReason: 'blocked_host',
    blockedUrl: 'https://files.civiccdn.com/testparish/council.pdf',
  })
  expect(evaluation.outcome).toBe('failed_terminal')
  expect(evaluation.findings[0].code).toBe(
    'root_document_host_quarantined',
  )
})

test('redirect depth, dead roots, and server errors separate retryable from terminal', () => {
  expect(
    evaluateRootChain(MANIFEST, {
      hops: [],
      stopReason: 'redirect_limit',
    }).outcome,
  ).toBe('failed_terminal')
  expect(
    evaluateRootChain(
      MANIFEST,
      finalResponse('https://www.testparish.gov/council/', 404, 'text/html'),
    ).outcome,
  ).toBe('failed_terminal')
  expect(
    evaluateRootChain(
      MANIFEST,
      finalResponse('https://www.testparish.gov/council/', 503, 'text/html'),
    ).outcome,
  ).toBe('failed_retryable')
  expect(
    evaluateRootChain(MANIFEST, {
      hops: [],
      stopReason: 'request_failed',
      failureDetail: 'connection reset',
    }).outcome,
  ).toBe('failed_retryable')
})

test('an unexpected response type never counts as a verified root', () => {
  const evaluation = evaluateRootChain(
    MANIFEST,
    finalResponse('https://www.testparish.gov/council/', 200, 'application/pdf'),
  )
  expect(evaluation.outcome).toBe('failed_terminal')
  expect(evaluation.findings[0].code).toBe('root_content_type_unexpected')
})

test('an expected final URL must match after redirects', () => {
  const pinned: CoverageRootManifest = {
    ...MANIFEST,
    expectedFinalUrl: 'https://www.testparish.gov/council/home/',
  }
  const mismatch = evaluateRootChain(
    pinned,
    finalResponse(
      'https://www.testparish.gov/council/archive/',
      200,
      'text/html',
    ),
  )
  expect(mismatch.outcome).toBe('failed_terminal')
  expect(mismatch.findings[0].code).toBe('root_final_url_mismatch')

  const match = evaluateRootChain(
    pinned,
    finalResponse('https://www.testparish.gov/council/home/', 200, 'text/html'),
  )
  expect(match.outcome).toBe('passed')
})

test('Lafayette event documents require a new manifest and keep their path boundary', () => {
  const event = 'https://events.lafayettela.gov/default/Detail/2026-09-11-0830-Hearing-Examiner-Public-Meeting/0fc6a5a3-b293-4e7c-a2a8-b4b800f18b9c'
  for (const bodyKey of ['lafayette-planning-commission', 'lafayette-board-of-zoning-adjustment', 'lafayette-hearing-examiner']) {
    const current = listRootManifests().find(manifest => manifest.bodyKey === bodyKey)!
    const previous = resolveRootManifest(bodyKey, 'v1')!
    expect(current.version).toBe('v2')
    expect(resolveRootManifest(bodyKey, 'v2')).toEqual(current)
    expect(classifyHost(current, event)).toBe('document_host')
    expect(classifyHost(previous, event)).toBe('unapproved')
    expect(isApprovedRootUrl(current, event)).toBe(false)
    expect(classifyHost(current, 'https://events.lafayettela.gov/')).toBe('unapproved')
    expect(classifyHost(current, 'https://events.lafayettela.gov/default/Detail-other/file')).toBe('unapproved')
    expect(classifyHost(current, 'https://events.lafayettela.gov/default/Detail/../Other/file')).toBe('unapproved')
    expect(classifyHost(current, event.replace('events.lafayettela.gov', 'events.lafayettela.gov.evil.example'))).toBe('unapproved')
  }
  expect(classifyHost(resolveRootManifest('youngsville-city-council', 'v1')!, event)).toBe('unapproved')
})
