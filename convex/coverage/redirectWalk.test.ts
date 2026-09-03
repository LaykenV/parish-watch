import { afterEach, expect, test, vi } from 'vitest'

import { walkRedirects } from './redirectWalk'

afterEach(() => vi.unstubAllGlobals())

function htmlResponse(): Response {
  return new Response(null, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

function redirectResponse(location: string): Response {
  return new Response(null, { status: 301, headers: { location } })
}

function stubFetch(handler: (url: string) => Response) {
  const fetchMock = vi.fn((input: RequestInfo | URL) =>
    Promise.resolve(handler(String(input))),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

test('a relative redirect resolves against the requested URL', async () => {
  const fetchMock = stubFetch((url) =>
    url === 'https://gov.example/council'
      ? redirectResponse('/council/')
      : htmlResponse(),
  )

  const walk = await walkRedirects('https://gov.example/council', () => true)

  expect(walk.stopReason).toBe('final_response')
  expect(walk.hops.map((hop) => hop.requestedUrl)).toEqual([
    'https://gov.example/council',
    'https://gov.example/council/',
  ])
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

test('a disallowed redirect target is recorded without being requested', async () => {
  const fetchMock = stubFetch((url) =>
    url === 'https://gov.example/'
      ? redirectResponse('https://evil.example/')
      : htmlResponse(),
  )

  const walk = await walkRedirects(
    'https://gov.example/',
    (url) => new URL(url).hostname === 'gov.example',
  )

  expect(walk.stopReason).toBe('blocked_host')
  expect(walk.blockedUrl).toBe('https://evil.example/')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    'https://gov.example/',
    expect.objectContaining({ redirect: 'manual' }),
  )
})

test('an endless redirect loop stops at the hop ceiling', async () => {
  const fetchMock = stubFetch(() => redirectResponse('https://gov.example/'))

  const walk = await walkRedirects('https://gov.example/', () => true, 2)

  expect(walk.stopReason).toBe('redirect_limit')
  expect(fetchMock).toHaveBeenCalledTimes(3)
})

test('a network failure ends the walk with a bounded detail', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('connection reset by peer'))),
  )

  const walk = await walkRedirects('https://gov.example/', () => true)

  expect(walk.stopReason).toBe('request_failed')
  expect(walk.failureDetail).toBe('connection reset by peer')
  expect(walk.hops).toEqual([])
})
