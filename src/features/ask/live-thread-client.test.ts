import type { ConvexReactClient } from 'convex/react'
import { expect, test, vi } from 'vitest'

import { corpusScope } from './contracts'
import { LiveAskThreadClient } from './live-thread-client'

test('keeps the opaque session token and thread handles in browser storage', async () => {
  const storage = memoryStorage()
  const mutation = vi
    .fn()
    .mockResolvedValueOnce({ expiresAt: 2_000_000_000_000 })
    .mockResolvedValueOnce({
      threadId: 'agent-thread-1',
      expiresAt: 2_000_000_000_000,
      scope: { kind: 'corpus', areaKey: 'lafayette-parish' },
    })
  const client = new LiveAskThreadClient(
    { mutation } as unknown as ConvexReactClient,
    storage,
  )

  const handle = await client.start(corpusScope('lafayette-parish'))
  expect(handle).toMatchObject({
    threadId: 'agent-thread-1',
    scopeKey: 'corpus:lafayette-parish',
  })
  expect(storage.getItem('public-parish.ask.session-token.v1')).toMatch(
    /^[a-f0-9]{64}$/,
  )
  expect(client.recent()).toMatchObject([handle])
  expect(JSON.stringify([...storage.entries()])).not.toContain('question')
})

function memoryStorage(): Storage & { entries: () => Array<[string, string]> } {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    entries: () => [...values.entries()],
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  }
}
